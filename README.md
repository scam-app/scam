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

## Run locally

```bash
npm install
cp .env.example .env.local      # paste your OpenAI key
npm run dev                     # http://localhost:3000
```

## Deploy (Vercel, ~3 min)

Push to a public GitHub repo → import on vercel.com → add `OPENAI_API_KEY` as an
env var → Deploy. Open the resulting URL in incognito before submitting.

## Demo script

1. **REQ-003** — proposed a 9,300 km expedite from Taiwan; engine **reroutes to
   local German stock**. Watch the candidate routes light up on the map.
2. **REQ-004** — proposed source is in a **sanctioned region**; that route is
   **blocked** and the engine reroutes to Taiwan.
3. **REQ-005** — sits on **Optimal** by default. Drag **Prioritize speed** up and it
   **reroutes live** to the faster lane — no reload, no model call.
4. **REQ-001** — clean local route, auto-approved via the fast path.

## Pages

- `/` landing · `/console` the decision console · `/api/decide` engine endpoint
