import { Boxes, HeartPulse, ShieldCheck, TrendingUp } from "lucide-react";
import type { CausalFixture, DomainId } from "@/lib/engine/types";

export function TopBar({ f, domain }: { f: CausalFixture; domain: DomainId }) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-ink sm:text-5xl">
            Causal<span className="text-forest">OCPM</span>
          </h1>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.28em] text-muted">
            Explain · Predict · Simulate
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-[12px] text-ink-soft">
              {domain === "manufacturing" ? <Boxes size={13} /> : <HeartPulse size={13} />}
              {f.scenario.domainLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-[12px] text-ink-soft">
              {f.scenario.org}
            </span>
          </div>
        </div>

        {/* decorative causal-flow motif */}
        <div className="hidden items-center gap-2 md:flex">
          <svg viewBox="0 0 220 70" className="h-16 w-56">
            <path d="M4 50 C 60 10, 110 62, 216 20" fill="none" stroke="#c9b79a" strokeWidth="1.5" className="flow-dash" />
            {[
              [40, 34],
              [100, 44],
              [150, 30],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3.5" fill="#4f7a4a" />
            ))}
            <circle cx="8" cy="49" r="9" fill="#e7eede" stroke="#4f7a4a" />
            <circle cx="188" cy="24" r="13" fill="#3d5a3d" />
          </svg>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-forest text-white">
            <ShieldCheck size={18} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniKpi icon={<TrendingUp size={14} />} value={`${f.kpis.causalLinks} links`} label="Cause & effect" />
        <MiniKpi icon={<Boxes size={14} />} value={f.kpis.target} label="Target outcome" />
        <MiniKpi icon={<ShieldCheck size={14} />} value={`${f.kpis.expertRules} rules`} label="Expert rules" />
        <MiniKpi icon={<ShieldCheck size={14} />} value={`${f.kpis.reliabilityPct}%`} label="Model reliability" />
      </div>
    </div>
  );
}

function MiniKpi({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-3 py-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sage text-forest">{icon}</span>
      <div>
        <div className="text-sm font-semibold text-ink">{value}</div>
        <div className="text-[10px] text-muted">{label}</div>
      </div>
    </div>
  );
}
