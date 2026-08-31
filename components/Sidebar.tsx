import { clsx } from "clsx";
import { Activity, Boxes, Database } from "lucide-react";
import type { CausalFixture, DomainId } from "@/lib/engine/types";
import { fmtInt } from "@/lib/format";

const DOMAIN_META: Record<DomainId, { title: string; sub: (f: CausalFixture) => string }> = {
  manufacturing: { title: "Manufacturing", sub: (f) => f.scenario.org },
  healthcare: { title: "Healthcare", sub: (f) => f.scenario.org },
};

export function Sidebar({
  fixtures,
  domain,
  onDomain,
}: {
  fixtures: Record<DomainId, CausalFixture>;
  domain: DomainId;
  onDomain: (d: DomainId) => void;
}) {
  const f = fixtures[domain];
  return (
    <aside className="hidden w-64 shrink-0 border-r border-line bg-paper-2/60 p-5 lg:block">
      <div className="mb-6">
        <div className="font-display text-lg text-ink">
          Causal<span className="text-forest">OCPM</span>
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted">
          Decision Intelligence · v1.0
        </div>
      </div>

      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        Analysis Domain
      </div>
      <div className="space-y-2">
        {(Object.keys(DOMAIN_META) as DomainId[]).map((d) => {
          const meta = DOMAIN_META[d];
          const selected = d === domain;
          return (
            <button
              key={d}
              onClick={() => onDomain(d)}
              className={clsx(
                "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                selected
                  ? "border-forest/40 bg-sage"
                  : "border-line bg-card hover:bg-paper-2",
              )}
            >
              <div className="text-sm font-semibold text-ink">{meta.title}</div>
              <div className="text-[11px] text-muted">{meta.sub(fixtures[d])}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <MiniStat icon={<Activity size={13} />} value={fmtInt(f.scenario.totalEvents)} label="Events" />
        <MiniStat icon={<Boxes size={13} />} value={String(f.scenario.objectTypes)} label="Object Types" />
      </div>

      <div className="mt-6 mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        Scenario Overview
      </div>
      <dl className="space-y-2 text-[12px]">
        <Row k="Outcome" v={f.scenario.outcomeVariable} />
        <Row k="Objects" v={`${f.scenario.objectTypes} types`} />
        <Row k="Goal" v={`Reduce ${f.scenario.outcomeVariable.toLowerCase()} via causal interventions`} />
      </dl>

      <div className="mt-6 flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-[11px] text-ink-soft">
        <Database size={13} className="text-forest" />
        Pipeline ready · <span className="text-forest">healthy</span>
      </div>
    </aside>
  );
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-2.5 py-2">
      <div className="flex items-center gap-1 text-forest">{icon}</div>
      <div className="mt-1 font-display text-lg leading-none text-ink">{value}</div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-muted">{k}</dt>
      <dd className="font-medium text-ink">{v}</dd>
    </div>
  );
}
