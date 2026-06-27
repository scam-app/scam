import type { RouteAction } from "@/lib/types";

export const actionMeta: Record<
  RouteAction,
  { label: string; color: string; bg: string; border: string }
> = {
  OPTIMAL: {
    label: "Route optimal",
    color: "#34D399",
    bg: "rgba(52,211,153,0.10)",
    border: "rgba(52,211,153,0.45)",
  },
  REROUTE: {
    label: "Reroute suggested",
    color: "#38BDF8",
    bg: "rgba(56,189,248,0.10)",
    border: "rgba(56,189,248,0.45)",
  },
  REVIEW: {
    label: "Flag for review",
    color: "#FBBF24",
    bg: "rgba(251,191,36,0.10)",
    border: "rgba(251,191,36,0.45)",
  },
  BLOCKED: {
    label: "Route blocked",
    color: "#F87171",
    bg: "rgba(248,113,113,0.10)",
    border: "rgba(248,113,113,0.45)",
  },
};

// risk 0–100 -> color on the green→amber→red scale (lower = better route)
export function riskColor(score: number): string {
  if (score < 25) return "#34D399";
  if (score < 45) return "#2DD4BF";
  if (score < 60) return "#FBBF24";
  return "#F87171";
}

export const dimensionLabel: Record<string, string> = {
  reliability: "Reliability",
  cost: "Cost / Margin",
  service: "Service / Feasibility",
  geo: "Geographic / Transit",
  compliance: "Compliance",
};
