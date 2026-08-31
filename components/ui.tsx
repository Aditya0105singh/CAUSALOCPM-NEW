import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Card({
  children,
  className,
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div className={clsx("card", pad && "p-5", className)}>{children}</div>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h3 className="text-sm font-semibold tracking-wide text-ink">{children}</h3>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

export function Stat({
  value,
  label,
  sub,
  accent,
}: {
  value: ReactNode;
  label: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-4">
      <div
        className={clsx(
          "font-display text-3xl leading-none",
          accent ? "text-forest" : "text-ink",
        )}
      >
        {value}
      </div>
      <div className="mt-2 text-xs font-medium text-ink-soft">{label}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-muted">{sub}</div> : null}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "forest" | "amber" | "danger";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        tone === "neutral" && "bg-paper-2 text-ink-soft",
        tone === "forest" && "bg-sage text-forest-deep",
        tone === "amber" && "bg-[#f2e4d2] text-amber",
        tone === "danger" && "bg-[#f1ddd6] text-danger",
      )}
    >
      {children}
    </span>
  );
}

export function Bar({
  value,
  max,
  tone = "forest",
}: {
  value: number;
  max: number;
  tone?: "forest" | "muted";
}) {
  const pct = Math.max(2, Math.min(100, (Math.abs(value) / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line-soft">
      <div
        className={clsx(
          "h-full rounded-full",
          tone === "forest" ? "bg-forest" : "bg-muted",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function KeyVal({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line-soft py-2 text-sm last:border-0">
      <span className="text-muted">{k}</span>
      <span className="font-medium text-ink">{v}</span>
    </div>
  );
}
