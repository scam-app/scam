"use client";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Where is SKU-E5 stocked?",
  "Which suppliers have flags?",
  "Any live route disruptions?",
];

// Tailwind-styled renderers so Markdown looks right inside a chat bubble.
const md = {
  p: (p: any) => <p className="mb-2 last:mb-0 leading-snug" {...p} />,
  ul: (p: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...p} />,
  ol: (p: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...p} />,
  li: (p: any) => <li className="leading-snug" {...p} />,
  strong: (p: any) => <strong className="font-semibold text-ink" {...p} />,
  em: (p: any) => <em className="italic" {...p} />,
  h1: (p: any) => <p className="font-semibold text-ink mb-1" {...p} />,
  h2: (p: any) => <p className="font-semibold text-ink mb-1" {...p} />,
  h3: (p: any) => <p className="font-semibold text-ink mb-1" {...p} />,
  a: (p: any) => (
    <a className="text-accent underline" target="_blank" rel="noreferrer" {...p} />
  ),
  code: (p: any) => (
    <code className="font-mono text-[12px] bg-panel2 px-1 py-0.5 rounded" {...p} />
  ),
  hr: () => <hr className="border-edge my-2" />,
};

export function AssistantPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.ok ? data.reply : data.error ?? "Failed." },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network error." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass rounded-xl overflow-hidden flex flex-col h-[620px]">
      <div className="px-4 py-3 border-b border-edge">
        <span className="font-display font-semibold text-sm tracking-wide">Data assistant</span>
        <p className="text-[11px] text-muted mt-0.5">Ask about inventory, suppliers, or live signals.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-[12px] text-muted">Try asking:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full text-left text-[12px] rounded-lg border border-edge px-3 py-2 text-ink/80 hover:border-accent hover:text-accent transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-[13px] leading-snug rounded-lg px-3 py-2 max-w-[90%] ${
              m.role === "user"
                ? "ml-auto bg-accent/15 text-ink"
                : "bg-panel2 border border-edge text-ink/90"
            }`}
          >
            {m.role === "assistant" ? (
              <div className="markdown">
                <ReactMarkdown components={md}>{m.content}</ReactMarkdown>
              </div>
            ) : (
              m.content
            )}
          </div>
        ))}
        {busy && <div className="text-[12px] text-muted px-1">thinking…</div>}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-edge flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask about the data…"
          className="flex-1 rounded-lg bg-panel2 border border-edge px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-accent"
        />
        <button
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          className="rounded-lg bg-accent/15 border border-accent/40 text-accent px-3 text-sm hover:bg-accent/25 disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}