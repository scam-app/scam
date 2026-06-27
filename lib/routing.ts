import type {
  Request,
  Supplier,
  StockLocation,
  GeoPoint,
  RouteMetrics,
  RouteEval,
  RouteAction,
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
  supplier: Supplier | null
): { metrics: RouteMetrics; distanceKm: number; blocked: boolean; blockReason: string | null } {
  const distanceKm =
    source && destination ? haversineKm(source, destination) : 0;

  // geo / transit exposure
  let geo = 5 + Math.min(45, Math.round(distanceKm / 400));
  if (isHighRisk(source?.code)) geo += 40;
  if (source && destination && source.code !== destination.code) geo += 8;
  geo = Math.min(100, geo);

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
  let cost = Math.min(100, Math.round(distanceKm / 200) + (req.expedite ? 20 : 0));

  // speed — lead-time risk, amplified when the order is urgent
  const lead = loc.leadTimeDays;
  let speed = Math.min(100, lead * (req.expedite ? 4 : 2));

  return {
    metrics: { geo, compliance, cost, speed },
    distanceKm,
    blocked,
    blockReason,
  };
}

// ---- weighted score from metrics + policy (lower = better) -----------------
export function scoreMetrics(m: RouteMetrics, policy: Policy): number {
  const w = policy.weights;
  const total = w.geo + w.compliance + w.cost + w.speed || 1;
  return Math.round(
    (m.geo * w.geo + m.compliance * w.compliance + m.cost * w.cost + m.speed * w.speed) /
      total
  );
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

  let action: RouteAction;
  let recommended = best;
  let explanation: string;

  const proposedUsable = proposed && proposed.score !== Infinity;

  if (proposedUsable && best.loc === proposed!.loc) {
    action = best.score >= policy.thresholds.reviewAbove ? "REVIEW" : "OPTIMAL";
    explanation =
      action === "OPTIMAL"
        ? `Proposed route from ${best.source?.name} is already optimal (score ${best.score}).`
        : `Best route from ${best.source?.name} scores ${best.score} ≥ ${policy.thresholds.reviewAbove} — flag for review.`;
  } else if (!proposedUsable) {
    action = "REROUTE";
    const why = proposed?.blocked
      ? `proposed ${proposed.source?.name} route is blocked`
      : `proposed ${proposed?.source?.name ?? "?"} route can't fulfil the order`;
    explanation = `Reroute to ${best.source?.name} (score ${best.score}) — ${why}.`;
  } else if (best.score <= proposed!.score - margin) {
    action = "REROUTE";
    explanation = `Reroute to ${best.source?.name} (score ${best.score}) — beats proposed ${proposed!.source?.name} (${proposed!.score}) by ${proposed!.score - best.score}.`;
  } else {
    // proposed is close enough to best — keep it
    recommended = proposed!;
    action =
      proposed!.score >= policy.thresholds.reviewAbove ? "REVIEW" : "OPTIMAL";
    explanation =
      action === "OPTIMAL"
        ? `Proposed route from ${proposed!.source?.name} is within ${margin} of best — keep it (score ${proposed!.score}).`
        : `Proposed route scores ${proposed!.score} ≥ ${policy.thresholds.reviewAbove} — flag for review.`;
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
