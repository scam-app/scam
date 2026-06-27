# SCAM — supply-chain route intelligence

**The AI decision layer on top of your ERP.** For each request, SCAM evaluates every
candidate shipping route, blocks the non-viable ones (sanctioned source, no stock),
and recommends the best — transparently, and under live human command.

## What it decides

For an order (SKU + quantity + destination), the engine scores each stocking
location as a candidate route on **geo/transit risk, compliance, cost, and speed**,
then returns one of:

- **OPTIMAL** — the proposed route is already best.
- **REROUTE** — a better route exists; here it is.
- **REVIEW** — the best route is still risky; a human should look.
- **BLOCKED** — no viable route (e.g. all sanctioned or out of stock).

## How it works

1. **Lookups** (`lib/data.ts`) — supplier, customer, and the SKU's stocking locations.
2. **Route metrics** (`lib/routing.ts`) — each candidate's distance, geo risk,
   compliance, cost, and lead-time risk, computed deterministically.
3. **Rank & decide** (`lib/routing.ts`) — weights from the policy rank the routes
   and pick the action. **Pure code → steering re-ranks instantly, no model call.**
4. **Specialist panel** (`lib/specialists.ts`) — 3 LLM advisors (reliability, cost,
   service) assess the recommended route for the trace.
5. **Steering** (UI) — re-prioritize (geo / compliance / cost / speed) and the
   recommendation re-ranks live; a free-text constraint re-runs the specialists.

**Principle: deterministic ranking decides; AI explains.** Reliable on stage, and
the route choice is fully auditable.

