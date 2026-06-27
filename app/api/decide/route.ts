import { NextResponse } from "next/server";
import { runDecision } from "@/lib/engine";
import type { Request as OpsRequest, Policy } from "@/lib/types";

// Server-side only — the OpenAI key never reaches the browser.
// This route must run per-request (calls the model); never prerender it.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { request, policy } = (await req.json()) as {
      request: OpsRequest;
      policy: Policy;
    };
    if (!request || !policy) {
      return NextResponse.json(
        { error: "Missing request or policy" },
        { status: 400 }
      );
    }
    const decision = await runDecision(request, policy);
    return NextResponse.json(decision);
  } catch (err) {
    console.error("decide route failed:", err);
    return NextResponse.json(
      { error: "Decision engine failed. Check OPENAI_API_KEY." },
      { status: 500 }
    );
  }
}
