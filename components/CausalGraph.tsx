"use client";
import { useState } from "react";
import { clsx } from "clsx";
import type { CausalFixture } from "@/lib/engine/types";

type G = CausalFixture["causalGraph"];

const KIND_COLOR: Record<string, string> = {
  driver: "#4f7a4a",
  mediator: "#7ba05b",
  confounder: "#b9762f",
  outcome: "#2f4630",
};

export function CausalGraph({
  graph,
  height = 340,
  compact = false,
}: {
  graph: G;
  height?: number;
  compact?: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);
  const xs = graph.nodes.map((n) => n.x);
  const ys = graph.nodes.map((n) => n.y);
  const minX = Math.min(...xs) - 40;
  const minY = Math.min(...ys) - 30;
  const w = Math.max(...xs) - minX + 60;
  const h = Math.max(...ys) - minY + 40;
  const pos = (id: string) => {
    const n = graph.nodes.find((x) => x.id === id)!;
    return { x: n.x - minX, y: n.y - minY };
  };

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", height }}
      role="img"
      aria-label="Discovered causal graph"
    >
      <defs>
        <marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#9a9683" />
        </marker>
      </defs>

      {graph.edges.map((e, i) => {
        const a = pos(e.source);
        const b = pos(e.target);
        const dim = active && active !== e.source && active !== e.target;
        return (
          <g key={i} opacity={dim ? 0.15 : 1}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={e.planted ? "#9a9683" : "#c9b79a"}
              strokeWidth={e.strength === "strong" ? 2.4 : e.strength === "moderate" ? 1.6 : 1}
              strokeDasharray={e.planted ? undefined : "4 4"}
              markerEnd="url(#arw)"
            />
          </g>
        );
      })}

      {graph.nodes.map((n) => {
        const p = pos(n.id);
        const r = n.kind === "outcome" ? 13 : 9;
        const dim = active && active !== n.id;
        return (
          <g
            key={n.id}
            transform={`translate(${p.x} ${p.y})`}
            opacity={dim ? 0.3 : 1}
            onMouseEnter={() => setActive(n.id)}
            onMouseLeave={() => setActive(null)}
            style={{ cursor: "pointer" }}
          >
            <circle r={r} fill={KIND_COLOR[n.kind]} stroke="#fcfbf6" strokeWidth={2} />
            <text
              x={0}
              y={r + 12}
              textAnchor="middle"
              fontSize={compact ? 8.5 : 9.5}
              fill="#55534a"
              fontWeight={n.kind === "outcome" ? 700 : 500}
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function GraphLegend() {
  return (
    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
      {Object.entries(KIND_COLOR).map(([k, c]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />
          <span className="capitalize">{k}</span>
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className={clsx("inline-block h-0 w-4 border-t-2 border-dashed border-[#c9b79a]")} />
        discovered (not planted)
      </span>
    </div>
  );
}
