import type { Request, Policy, DecisionTrace, TraceEntry } from "./types";
import { buildContext, buildRoutes } from "./data";
import { rankAndDecide } from "./routing";
import { runSpecialists } from "./specialists";

const FAST_PATH_BELOW = 20; // an OPTIMAL route this clean skips the LLM panel

export async function runDecision(
  req: Request,
  policy: Policy
): Promise<DecisionTrace> {
  const { context, trace } = buildContext(req);
  const candidates = buildRoutes(context);

  // deterministic ranking + decision (instant, steerable)
  const decision = rankAndDecide(candidates, req.preferredLoc, req.qty, policy);

  // trace: one line per candidate route
  for (const r of decision.routes) {
    trace.push({
      kind: "route",
      label: `route via ${r.source?.name ?? r.loc}`,
      detail: r.blocked
        ? `BLOCKED — ${r.blockReason}`
        : !r.feasible
        ? `infeasible — stock ${r.available} < ${req.qty} needed`
        : `${r.distanceKm}km · lead ${r.leadTimeDays}d${r.signal ? ` · ⚠ ${r.signal.label}` : ""} → score ${r.score}${r.isRecommended ? " ✓ recommended" : ""}`,
      data: r,
    });
  }
  trace.push({
    kind: "decide",
    label: "router",
    detail: `${decision.action} — ${decision.explanation}`,
    data: { action: decision.action, recommendedLoc: decision.recommendedLoc },
  });

  const recommended = decision.routes.find((r) => r.isRecommended) ?? null;
  const alternatives = decision.routes.filter((r) => !r.isRecommended);

  // adaptive: a clean OPTIMAL route skips the specialist panel
  const fast =
    decision.action === "OPTIMAL" && decision.weightedRisk < FAST_PATH_BELOW;

  let verdicts = [] as DecisionTrace["verdicts"];
  if (!fast && recommended) {
    verdicts = await runSpecialists(context, recommended, alternatives, policy.constraint);
    for (const v of verdicts) {
      trace.push({
        kind: "specialist",
        label: `${v.dimension} specialist`,
        detail: `risk ${v.score}/100 (conf ${v.confidence.toFixed(2)}) — ${v.rationale}`,
        data: v,
      });
    }
  }

  return {
    requestId: req.id,
    itemName: context.item?.name ?? req.sku,
    qty: req.qty,
    destination: context.destination,
    expedite: req.expedite,
    routes: decision.routes,
    proposedLoc: req.preferredLoc,
    recommendedLoc: decision.recommendedLoc,
    action: decision.action,
    weightedRisk: decision.weightedRisk,
    routerExplanation: decision.explanation,
    verdicts,
    trace,
    path: fast ? "fast" : "deep",
  };
}
