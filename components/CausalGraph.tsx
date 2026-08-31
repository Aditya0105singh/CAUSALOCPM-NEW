"use client";
import { useState } from "react";
import { clsx } from "clsx";
import type { CausalFixture } from "@/lib/engine/types";

type G = CausalFixture["causalGraph"];

const ROLE_COLOR: Record<string, string> = {
  confounder: "#b9762f",
  treatment: "#3d5a3d",
  mediator: "#7ba05b",
  exogenous: "#9a9683",
  outcome: "#2f4630",
};

export function CausalGraph({
  graph,
  height = 320,
  activeEdges,
  compact = false,
}: {
  graph: G;
  height?: number;
  /** set of "source->target" keys to draw as active/propagating */
  activeEdges?: Set<string>;
  compact?: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const pad = 46;
  const xs = graph.nodes.map((n) => n.x);
  const ys = graph.nodes.map((n) => n.y);
  const spanX = Math.max(...xs) - Math.min(...xs) || 1;
  const spanY = Math.max(...ys) - Math.min(...ys) || 1;
  const W = 640;
  const H = height;
  const px = (x: number) => pad + ((x - Math.min(...xs)) / spanX) * (W - pad * 2);
  const py = (y: number) => pad + ((y - Math.min(...ys)) / spanY) * (H - pad * 2);
  const pos = (id: string) => {
    const n = graph.nodes.find((x) => x.id === id)!;
    return { x: px(n.x), y: py(n.y) };
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label="Discovered causal graph">
      <defs>
        <marker id="cg-arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#9a9683" />
        </marker>
        <marker id="cg-arw-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#3d5a3d" />
        </marker>
      </defs>

      {graph.edges.map((e, i) => {
        const a = pos(e.source);
        const b = pos(e.target);
        const active = activeEdges?.has(`${e.source}->${e.target}`);
        const dimmed = hover && hover !== e.source && hover !== e.target;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2 - 18;
        const stroke = e.pruned ? "#c98b45" : active ? "#3d5a3d" : e.discovered ? "#a8a492" : "#cbb89a";
        return (
          <g key={i} opacity={dimmed ? 0.12 : e.pruned ? 0.55 : 1}>
            <path
              d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
              fill="none"
              stroke={stroke}
              strokeWidth={active ? 2.6 : e.strength === "strong" ? 2 : e.strength === "moderate" ? 1.4 : 0.9}
              strokeDasharray={e.pruned || !e.discovered ? "5 4" : undefined}
              markerEnd={active ? "url(#cg-arw-a)" : "url(#cg-arw)"}
              className={active ? "flow-dash" : undefined}
            />
            {e.pruned && (
              <g transform={`translate(${mx} ${(a.y + b.y) / 2})`}>
                <circle r={5.5} fill="#fcfbf6" stroke="#c98b45" strokeWidth={1} />
                <path d="M-2.5 -2.5 L2.5 2.5 M2.5 -2.5 L-2.5 2.5" stroke="#c98b45" strokeWidth={1.3} />
              </g>
            )}
            {!compact && !e.pruned && (
              <text x={mx} y={my + 4} textAnchor="middle" fontSize={8.5} fill="#8b887b">
                {e.coef > 0 ? "+" : ""}
                {e.coef}
              </text>
            )}
          </g>
        );
      })}

      {graph.nodes.map((n) => {
        const p = pos(n.id);
        const r = n.role === "outcome" ? 12 : n.role === "treatment" ? 10 : 8;
        const dimmed = hover && hover !== n.id;
        return (
          <g
            key={n.id}
            transform={`translate(${p.x} ${p.y})`}
            opacity={dimmed ? 0.28 : 1}
            onMouseEnter={() => setHover(n.id)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: "default" }}
          >
            <circle r={r} fill={ROLE_COLOR[n.role]} stroke="#fcfbf6" strokeWidth={2} />
            <text
              x={0}
              y={r + 11}
              textAnchor="middle"
              fontSize={compact ? 8.5 : 9.5}
              fill="#55534a"
              fontWeight={n.role === "outcome" || n.role === "treatment" ? 700 : 500}
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function GraphLegend({ showDiscovery = true }: { showDiscovery?: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
      {Object.entries(ROLE_COLOR).map(([k, c]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />
          <span className="capitalize">{k}</span>
        </span>
      ))}
      {showDiscovery && (
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className={clsx("inline-block h-0 w-4 border-t-2 border-dashed border-[#cbb89a]")} />
            recovered by domain knowledge
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0 w-4 border-t-2 border-dashed border-[#c98b45]" />
            <span className="text-[#c98b45]">✕</span> spurious · pruned
          </span>
        </>
      )}
    </div>
  );
}
