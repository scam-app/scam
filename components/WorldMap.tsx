"use client";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
} from "react-simple-maps";
import worldTopo from "world-atlas/countries-110m.json";
import type { DecisionTrace, RouteEval, GeoPoint } from "@/lib/types";
import { riskColor } from "./ui";

function MapPin({ point, color, label }: { point: GeoPoint; color: string; label: string }) {
  return (
    <Marker coordinates={[point.lng, point.lat]}>
      <circle r={4} fill={color} stroke="#0B0F1A" strokeWidth={1.2} />
      <text x={7} y={3} fontSize={8} fill="#E6EDF7" style={{ fontFamily: "var(--font-mono)" }}>
        {point.code}
      </text>
      <title>{label}: {point.name}</title>
    </Marker>
  );
}

export function WorldMap({ decision }: { decision: DecisionTrace | null }) {
  const routes: RouteEval[] = decision?.routes ?? [];
  const dest = decision?.destination ?? null;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-edge flex items-center justify-between">
        <span className="font-display font-semibold text-sm tracking-wide">
          Candidate routes
        </span>
        {dest && (
          <span className="text-[11px] text-muted font-mono">
            → {dest.name}
          </span>
        )}
      </div>

      <div className="p-2" style={{ background: "#0E1524" }}>
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 150 }}
          width={800}
          height={360}
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography={worldTopo}>
            {({ geographies }) =>
              geographies.map((g) => (
                <Geography
                  key={g.rsmKey}
                  geography={g}
                  fill="#1A2438"
                  stroke="#2A3A5C"
                  strokeWidth={0.4}
                  style={{ default: { outline: "none" }, hover: { fill: "#22304C", outline: "none" }, pressed: { outline: "none" } }}
                />
              ))
            }
          </Geographies>

          {/* all candidate routes: faint, recommended one bright + risk-colored */}
          {routes.map((r) => {
            if (!r.source || !dest) return null;
            const recommended = r.isRecommended;
            const stroke = r.blocked ? "#F87171" : recommended ? riskColor(r.score) : "#33405C";
            return (
              <Line
                key={r.loc}
                from={[r.source.lng, r.source.lat]}
                to={[dest.lng, dest.lat]}
                stroke={stroke}
                strokeWidth={recommended ? 2.4 : 0.8}
                strokeLinecap="round"
                strokeDasharray={r.blocked ? "3 3" : recommended ? undefined : "2 4"}
                opacity={recommended ? 1 : 0.55}
              />
            );
          })}

          {/* source pins */}
          {routes.map((r) =>
            r.source ? (
              <MapPin
                key={r.loc}
                point={r.source}
                color={r.blocked ? "#F87171" : r.isRecommended ? riskColor(r.score) : "#38BDF8"}
                label={r.isRecommended ? "Recommended source" : r.blocked ? "Blocked source" : "Candidate source"}
              />
            ) : null
          )}
          {dest && <MapPin point={dest} color="#8B7DF6" label="Destination" />}
        </ComposableMap>
        {routes.length === 0 && (
          <div className="text-center text-muted text-xs py-6 font-mono">
            select a request to map its candidate routes
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-edge flex flex-wrap gap-3 text-[10px] font-mono text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-[2px]" style={{ background: "#34D399" }} />
          recommended
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-[2px] border-t border-dashed" style={{ borderColor: "#33405C" }} />
          alternative
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-[2px] border-t border-dashed" style={{ borderColor: "#F87171" }} />
          blocked
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#8B7DF6" }} />
          destination
        </span>
      </div>
    </div>
  );
}
