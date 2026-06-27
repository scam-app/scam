import { NextResponse } from "next/server";
import OpenAI from "openai";
import suppliers from "@/data/suppliers.json";
import customers from "@/data/customers.json";
import inventory from "@/data/inventory.json";
import signals from "@/data/signals.json";

export const dynamic = "force-dynamic";

let _client: OpenAI | null = null;
function client() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

const MODEL =
  process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
const SEARCH_TOOL = process.env.OPENAI_SEARCH_TOOL || "web_search";

type Msg = { role: "user" | "assistant"; content: string };

const DATA_CONTEXT = JSON.stringify({ suppliers, customers, inventory, liveSignals: signals });

const SYSTEM = `You are SCAM's assistant for a supply-chain operations team. Be helpful,
concise, and conversational — respond to greetings and general questions naturally, like
a normal assistant.

You have two sources of knowledge:
1. INTERNAL DATA (below): suppliers, customers, inventory with stocking locations, and
   live route signals. When asked about stock levels, locations, lead times, supplier
   details, or current signals, answer strictly from this data and never invent values.
   If a specific internal fact isn't in the data, say so plainly.
2. THE WEB (via the web search tool): use it for external or current information —
   fuel/oil prices, geopolitical events, weather, port status, news — anything that could
   affect logistics but isn't in the internal data.

When a question mixes both (e.g. "oil prices jumped, what should we reroute?"), pull the
current facts from the web and reason about them using the internal data. Keep answers
short and practical. Note that you advise; the routing engine makes the final call.

INTERNAL DATA:
${DATA_CONTEXT}`;

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: Msg[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages" }, { status: 400 });
    }

    const recent = messages.slice(-8);

    async function run(withSearch: boolean) {
      return client().responses.create({
        model: MODEL,
        instructions: SYSTEM,
        input: recent as any,
        ...(withSearch ? { tools: [{ type: SEARCH_TOOL } as any] } : {}),
      } as any);
    }

    let res;
    try {
      res = await run(true);
    } catch (err) {
      console.error("web search unavailable on this model, answering without it:", err);
      res = await run(false);
    }

    const reply = (res as any).output_text ?? "";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("chat route failed:", err);
    return NextResponse.json(
      { error: "Assistant failed. Check OPENAI_API_KEY / model." },
      { status: 500 }
    );
  }
}