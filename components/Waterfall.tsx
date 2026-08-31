"use client";
import { clsx } from "clsx";

/** Responsive HTML waterfall — SHAP attribution and causal-effect decomposition. */
export function Waterfall({
  start,
  steps,
  end,
  unit,
  height = 220,
}: {
  start: { label: string; value: number };
  steps: { label: string; value: number }[];
  end: { label: string; value: number };
  unit: string;
  height?: number;
}) {
  let cursor = start.value;
  const cols = [
    { label: start.label, from: 0, to: start.value, delta: start.value, kind: "total" as const },
    ...steps.map((s) => {
      const from = cursor;
      const to = cursor + s.value;
      cursor = to;
      return { label: s.label, from, to, delta: s.value, kind: "delta" as const };
    }),
    { label: end.label, from: 0, to: end.value, delta: end.value, kind: "total" as const },
  ];
  const max = Math.max(...cols.flatMap((c) => [c.from, c.to])) * 1.1 || 1;
  const pxFor = (v: number) => (v / max) * (height - 34);

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {cols.map((c, i) => {
          const bottom = pxFor(Math.min(c.from, c.to));
          const barH = Math.max(3, pxFor(Math.abs(c.to - c.from)));
          const color =
            c.kind === "total"
              ? i === 0
                ? "bg-muted"
                : "bg-forest-deep"
              : c.delta > 0
                ? "bg-amber"
                : "bg-forest-bright";
          return (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="relative w-full flex-1">
                <div
                  className={clsx("absolute left-1/2 w-[70%] -translate-x-1/2 rounded-sm", color)}
                  style={{ bottom, height: barH }}
                />
                <div
                  className="absolute left-0 w-full text-center text-[10px] font-semibold text-ink-soft"
                  style={{ bottom: bottom + barH + 2 }}
                >
                  {c.kind === "delta" ? (c.delta > 0 ? "+" : "") : ""}
                  {(c.kind === "delta" ? c.delta : c.to).toFixed(1)}
                </div>
              </div>
              <div className="mt-1 h-8 w-full text-center text-[9px] leading-tight text-muted">{c.label}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 text-right text-[10px] text-muted">{unit}</div>
    </div>
  );
}
