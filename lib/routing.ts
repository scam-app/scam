import type {
  Request,
  Supplier,
  StockLocation,
  GeoPoint,
  RouteMetrics,
  RouteEval,
  RouteAction,
  RouteSignal,
  Policy,
} from "./types";
import { point, haversineKm, isHighRisk } from "./geo";

// ---- intrinsic per-route metrics (weight-independent, deterministic) -------
// All 0–100, higher = worse. Computed once; re-ranking just re-weights them.
export function computeMetrics(
  loc: StockLocation,
  source: GeoPoint | null,
  destination: GeoPoint | null,
  req: Request,
  supplier: Supplier | null,
  signal: RouteSignal | null
): { metrics: RouteMetrics; distanceKm: number; blocked: boolean; blockReason: string | null } {
  const distanceKm =
    source && destination ? haversineKm(source, destination) : 0;

  // geo / transit exposure
  let geo = 5 + Math.min(45, Math.round(distanceKm / 400));
  if (isHighRisk(source?.code)) geo += 40;
  if (source && destination && source.code !== destination.code) geo += 8;

  // compliance — a sanctioned source blocks the route outright
  let compliance = 0;
  let blocked = false;
  let blockReason: string | null = null;
  if (isHighRisk(source?.code)) {
    compliance = 100;
    blocked = true;
    blockReason = `${source?.name} is under export-control sanctions`;
  }
  if (isHighRisk(destination?.code)) compliance = Math.max(compliance, 70);
  if (supplier && supplier.flags.includes("disputed_invoice"))
    compliance = Math.max(compliance, 30);

  // cost — distance-driven, with an expedite premium
  let cost = Math.round(distanceKm / 200) + (req.expedite ? 20 : 0);

  // speed — lead-time risk, amplified when the order is urgent
  const lead = loc.leadTimeDays;
  let speed = lead * (req.expedite ? 4 : 2);

  // live signal — the thing a static ERP allocation can't see
  if (signal) {
    cost += signal.costDelta;
    speed += signal.speedDelta;
    geo += signal.geoDelta;
  }

  return {
    metrics: {
      geo: Math.min(100, geo),
      compliance: Math.min(100, compliance),
      cost: Math.min(100, cost),
      speed: Math.min(100, speed),
    },
    distanceKm,
    blocked,
    blockReason,
  };
}

// ---- weighted score from metrics + policy (lower = better) -----------------
// Only dimensions that are actually elevated count — a 0 doesn't dilute the
// average. This keeps clean routes low and lets genuinely bad routes rise.
export function scoreMetrics(m: RouteMetrics, policy: Policy): number {
  const w = policy.weights;
  const dims: [keyof RouteMetrics, number][] = [
    ["geo", m.geo],
    ["compliance", m.compliance],
    ["cost", m.cost],
    ["speed", m.speed],
  ];
  let num = 0;
  let den = 0;
  for (const [k, v] of dims) {
    if (v > 0) {
      num += v * (w as any)[k];
      den += (w as any)[k];
    }
  }
  return den === 0 ? 0 : Math.round(num / den);
}

// ---- rank candidates + pick a decision (PURE; client-safe; instant) --------
// This is what steering re-runs on every slider change — no LLM, no network.
export function rankAndDecide(
  routes: RouteEval[],
  proposedLoc: string,
  qty: number,
  policy: Policy
): {
  routes: RouteEval[];
  action: RouteAction;
  recommendedLoc: string | null;
  weightedRisk: number;
  explanation: string;
} {
  // re-score every route under the current weights
  const scored = routes.map((r) => {
    const feasible = r.available >= qty;
    const usable = feasible && !r.blocked;
    const score = usable ? scoreMetrics(r.metrics, policy) : Infinity;
    return {
      ...r,
      feasible,
      score,
      isProposed: r.loc === proposedLoc,
      isRecommended: false,
    };
  });

  const usable = scored.filter((r) => r.score !== Infinity);

  // no viable route -> BLOCKED
  if (usable.length === 0) {
    const reason =
      scored.find((r) => r.blocked)?.blockReason ?? "no route has enough stock";
    return {
      routes: scored,
      action: "BLOCKED",
      recommendedLoc: null,
      weightedRisk: 100,
      explanation: `No viable route — ${reason}.`,
    };
  }

  usable.sort((a, b) => a.score - b.score);
  const best = usable[0];
  const proposed = scored.find((r) => r.isProposed);
  const margin = policy.thresholds.improvementMargin;
  const reviewLine = policy.thresholds.reviewAbove;
  const proposedUsable = proposed && proposed.score !== Infinity;

  // Choose the recommended route: keep the proposed one if it's within `margin`
  // of the best; otherwise switch to the best.
  let recommended = best;
  if (proposedUsable && proposed!.score <= best.score + margin) {
    recommended = proposed!;
  }
  const rerouted = !proposedUsable || recommended.loc !== proposed!.loc;

  // Decision priority: REVIEW (even the best is risky) > REROUTE > OPTIMAL.
  let action: RouteAction;
  let explanation: string;

  if (recommended.score >= reviewLine) {
    action = "REVIEW";
    explanation = rerouted
      ? `Best available route (${recommended.source?.name}) still scores ${recommended.score} ≥ ${reviewLine} — reroute and flag for review.`
      : `Best route (${recommended.source?.name}) scores ${recommended.score} ≥ ${reviewLine} — flag for a human.`;
  } else if (rerouted) {
    action = "REROUTE";
    const sig = proposed?.signal;
    if (!proposedUsable) {
      const why = proposed?.blocked
        ? `proposed ${proposed.source?.name} route is blocked (${proposed.blockReason})`
        : `proposed ${proposed?.source?.name ?? "?"} route can't fulfil the order`;
      explanation = `Reroute to ${recommended.source?.name} (score ${recommended.score}) — ${why}.`;
    } else if (sig) {
      explanation = `Reroute to ${recommended.source?.name} — proposed ${proposed!.source?.name} lane hit by ${sig.label}, which a static ERP allocation can't see.`;
    } else {
      explanation = `Reroute to ${recommended.source?.name} (score ${recommended.score}) — beats proposed ${proposed!.source?.name} (${proposed!.score}) by ${proposed!.score - recommended.score}.`;
    }
  } else {
    action = "OPTIMAL";
    explanation = `Proposed route from ${recommended.source?.name} is already best (score ${recommended.score}).`;
  }

  const final = scored.map((r) => ({
    ...r,
    isRecommended: r.loc === recommended.loc,
  }));

  return {
    routes: final,
    action,
    recommendedLoc: recommended.loc,
    weightedRisk: recommended.score === Infinity ? 100 : recommended.score,
    explanation,
  };
}
