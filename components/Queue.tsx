"use client";
import type { Request } from "@/lib/types";

export function Queue({
  requests,
  selectedId,
  onSelect,
}: {
  requests: Request[];
  selectedId: string | null;
  onSelect: (r: Request) => void;
}) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-edge flex items-center justify-between">
        <span className="font-display font-semibold text-sm tracking-wide">Request queue</span>
        <span className="text-[11px] text-muted font-mono">{requests.length} pending</span>
      </div>
      <ul>
        {requests.map((r) => {
          const active = r.id === selectedId;
          return (
            <li key={r.id}>
              <button
                onClick={() => onSelect(r)}
                className={`w-full text-left px-4 py-3 border-b border-edge/60 transition-colors ${
                  active ? "bg-accent/10" : "hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-accent">{r.id}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted">
                    {r.expedite ? "expedite" : "standard"}
                  </span>
                </div>
                <div className="mt-1 text-sm text-ink/90 line-clamp-2">
                  {r.summary ?? `${r.qty}× ${r.sku}`}
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted font-mono">
                  <span>{r.qty}× {r.sku}</span>
                  <span>· ${r.amount.toLocaleString()}</span>
                  <span>· ERP default {r.preferredLoc}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
