import OpenAI from "openai";
import type { Dimension, RequestContext, RouteEval, Verdict } from "./types";

// Created lazily so `next build` doesn't need the key — only runtime does.
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

// Set OPENAI_MODEL in .env.local to upgrade (e.g. a current GPT-5 model).
// Falls back to gpt-4o-mini, which still works via the API.
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const verdictSchema = {
  name: "verdict",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      score: { type: "integer", description: "Risk 0-100, higher = more risk." },
      rationale: { type: "string" },
      evidence: { type: "array", items: { type: "string" } },
      confidence: { type: "number" },
    },
    required: ["score", "rationale", "evidence", "confidence"],
  },
} as const;

interface SpecialistConfig {
  dimension: Dimension;
  system: string;
}

// Specialists assess the RECOMMENDED route for a shipment.
const SPECIALISTS: SpecialistConfig[] = [
  {
    dimension: "reliability",
    system:
      "You are a CARRIER & SUPPLIER RELIABILITY specialist for supply-chain routing. " +
      "Judge how likely this route delivers on time and intact. Weigh supplier rating, " +
      "supplier flags (late_delivery, disputed_invoice), and how far/long the route is. " +
      "Score 0-100 where higher = more reliability risk.",
  },
  {
    dimension: "cost",
    system:
      "You are a COST & MARGIN specialist for supply-chain routing. " +
      "Judge whether this route's cost is justified by the order value. Weigh shipping " +
      "distance, expedite premiums, and order amount. Score 0-100 where higher = worse cost risk.",
  },
  {
    dimension: "service",
    system:
      "You are a SERVICE & FEASIBILITY specialist for supply-chain routing. " +
      "Judge whether this route can actually serve the order on time. Weigh available stock " +
      "vs quantity, lead time vs urgency, and whether better alternatives were skipped. " +
      "Score 0-100 where higher = more service risk.",
  },
];

function userPrompt(
  ctx: RequestContext,
  chosen: RouteEval,
  alternatives: RouteEval[],
  constraint?: string
): string {
  const lines = [
    `ORDER: ${ctx.request.qty}× ${ctx.item?.name} (${ctx.request.sku}), value $${ctx.request.amount}, expedite=${ctx.request.expedite}`,
    `DESTINATION: ${ctx.destination?.name ?? "?"}`,
    `SUPPLIER: ${JSON.stringify(ctx.supplier)}`,
    `RECOMMENDED_ROUTE: from ${chosen.source?.name} — ${chosen.distanceKm}km, lead ${chosen.leadTimeDays}d, stock ${chosen.available}`,
    `ALTERNATIVE_ROUTES: ${alternatives.map((a) => `${a.source?.name}(${a.distanceKm}km,${a.leadTimeDays}d,stock ${a.available}${a.blocked ? ",BLOCKED" : ""})`).join("; ")}`,
  ];
  if (constraint?.trim())
    lines.push(`OPERATOR CONSTRAINT (apply when scoring): "${constraint.trim()}"`);
  return lines.join("\n");
}

async function runOne(
  cfg: SpecialistConfig,
  ctx: RequestContext,
  chosen: RouteEval,
  alternatives: RouteEval[],
  constraint?: string
): Promise<Verdict> {
  try {
    const res = await getClient().chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: cfg.system },
        { role: "user", content: userPrompt(ctx, chosen, alternatives, constraint) },
      ],
      response_format: { type: "json_schema", json_schema: verdictSchema },
    });
    const p = JSON.parse(res.choices[0].message.content ?? "{}");
    return {
      dimension: cfg.dimension,
      score: clamp(p.score, 0, 100),
      rationale: p.rationale ?? "",
      evidence: Array.isArray(p.evidence) ? p.evidence : [],
      confidence: clamp(p.confidence, 0, 1),
    };
  } catch (err) {
    console.error(`Specialist ${cfg.dimension} failed:`, err);
    return {
      dimension: cfg.dimension,
      score: 50,
      rationale: "Specialist unavailable — defaulted to neutral pending review.",
      evidence: ["specialist_error"],
      confidence: 0.1,
    };
  }
}

function clamp(n: number, lo: number, hi: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

export async function runSpecialists(
  ctx: RequestContext,
  chosen: RouteEval,
  alternatives: RouteEval[],
  constraint?: string
): Promise<Verdict[]> {
  return Promise.all(SPECIALISTS.map((c) => runOne(c, ctx, chosen, alternatives, constraint)));
}
