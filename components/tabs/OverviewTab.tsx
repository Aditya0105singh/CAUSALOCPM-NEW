import { Sparkles, TrendingDown, ShieldCheck, ArrowRight, Check, X, AlertTriangle } from "lucide-react";
import type { CausalFixture } from "@/lib/engine/types";
import { Card, Pill, Stat, SectionTitle, Bar, KeyVal } from "@/components/ui";
import { fmtMoney } from "@/lib/format";

export function OverviewTab({ f }: { f: CausalFixture }) {
  const es = f.executiveSummary;
  const topAction = f.recommendedActions[0];
  const m = f.discoveryMetrics;
  const maxImpact = Math.max(...f.topDrivers.map((d) => d.impactDays));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat value={f.kpis.causalLinks} label="Cause-and-Effect Links" sub="Causal intelligence" accent />
        <Stat value={f.kpis.target} label="Target" sub="Business impact" />
        <Stat value={f.kpis.expertRules} label="Expert Rules Applied" sub="Validated & interpretable" />
        <Stat value={`${f.kpis.reliabilityPct}%`} label="Reliable" sub="Confidence you can trust" accent />
      </div>

      {/* Causal Intelligence Alert */}
      <div className="overflow-hidden rounded-[14px] border border-forest/30 bg-forest-deep text-white">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sage-2">
          <AlertTriangle size={13} /> Causal Intelligence Alert
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="font-display text-2xl leading-tight">
              {es.alertOutcome} can be reduced by{" "}
              <span className="text-sage-2">{es.alertReductionPct}%</span>
            </div>
            <p className="mt-1 text-sm text-white/70">
              Root cause identified · business impact quantified · intervention validated through causal simulation.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
              {es.chain.map((c, i) => (
                <span key={c} className="flex items-center gap-2">
                  <span className="rounded-md bg-white/10 px-2 py-1">{c}</span>
                  {i < es.chain.length - 1 && <ArrowRight size={13} className="text-white/40" />}
                </span>
              ))}
              <ArrowRight size={13} className="text-white/40" />
              <span className="rounded-md bg-sage-2 px-2 py-1 font-semibold text-forest-deep">
                {es.alertReductionPct}% reduction
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-center">
            <MiniDark label="Expected annual savings" value={`~${fmtMoney(topAction.annualSavings)}`} sub="at current throughput" />
            <MiniDark label="Recovered causal effect" value={`${f.effects[0].effectDays} ${f.scenario.outcomeUnit}`} sub="Double ML (ATE)" />
          </div>
        </div>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Sparkles size={15} className="text-forest" /> AI Executive Summary
          </div>
          <Pill tone="forest">
            <ShieldCheck size={12} /> {es.confidence}
          </Pill>
        </div>
        <p className="font-display text-lg leading-snug text-ink">{es.headline}</p>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
          {es.bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-forest" />
              {b}
            </li>
          ))}
        </ul>
      </Card>

      {/* validation badges */}
      <div>
        <SectionTitle hint="raw PC-algorithm discovery vs. planted ground truth">
          Model validation — discovered graph vs. ground truth
        </SectionTitle>
        <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
          <Badge label="Bootstrap stability" value={`${Math.round(m.stability * 100)}%`} />
          <Badge label="Precision" value={m.precision.toFixed(2)} />
          <Badge label="Edge recall" value={m.recall.toFixed(2)} />
          <Badge label="Recovery F1" value={m.f1.toFixed(2)} />
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Precision / recall / F1 are the raw statistical discovery, measured before domain-knowledge constraints are
          applied — not a number domain knowledge guarantees to be perfect.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle hint={f.scenario.timeRange}>Scenario at a glance</SectionTitle>
          <p className="text-sm leading-relaxed text-ink-soft">{f.scenario.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-x-6">
            <KeyVal k="Time range" v={f.scenario.timeRange} />
            <KeyVal k="Total events" v={f.scenario.totalEvents.toLocaleString()} />
            <KeyVal k="Data sources" v={`${f.scenario.dataSources} integrated`} />
            <KeyVal k="Highest-risk segment" v={es.riskSegment} />
          </div>
        </Card>

        <Card>
          <SectionTitle hint={<TrendingDown size={13} />}>Top drivers (by causal impact)</SectionTitle>
          <div className="space-y-2">
            {f.topDrivers.slice(0, 5).map((d) => (
              <div key={d.label}>
                <div className="mb-1 flex justify-between text-[11px] text-muted">
                  <span>{d.label}</span>
                  <span>{d.impactDays.toFixed(2)}d</span>
                </div>
                <Bar value={d.impactDays} max={maxImpact} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Traditional PM vs CausalOCPM */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-paper-2/50">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Traditional process mining</div>
          <div className="mt-1 font-display text-2xl text-ink">1 object type</div>
          <p className="mt-1 text-sm text-ink-soft">
            Case ID only — object relationships and interactions are invisible to the model, so it cannot tell
            causation from coincidence.
          </p>
        </Card>
        <Card className="border-forest/30 bg-sage/40">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-forest-deep">CausalOCPM (this system)</div>
          <div className="mt-1 font-display text-2xl text-forest">{f.scenario.objectTypes} object types</div>
          <p className="mt-1 text-sm text-ink-soft">{f.scenario.objectNames.join(" · ")} — tracked simultaneously as OCEL 2.0, the structural foundation causal discovery builds on.</p>
        </Card>
      </div>

      {/* Competitive positioning */}
      <Card pad={false}>
        <div className="p-5 pb-2">
          <SectionTitle hint="how CausalOCPM compares to existing process analytics">Competitive positioning</SectionTitle>
        </div>
        <div className="scroll-slim overflow-x-auto px-5 pb-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="pb-2 pr-4 font-semibold">Capability</th>
                <th className="pb-2 pr-4 font-semibold">Traditional PM</th>
                <th className="pb-2 pr-4 font-semibold">Celonis</th>
                <th className="pb-2 pr-4 font-semibold text-forest">CausalOCPM</th>
              </tr>
            </thead>
            <tbody>
              {POSITIONING.map((r) => (
                <tr key={r.cap} className="border-t border-line-soft">
                  <td className="py-2 pr-4 text-ink-soft">{r.cap}</td>
                  <td className="py-2 pr-4"><Mark v={r.tpm} /></td>
                  <td className="py-2 pr-4"><Mark v={r.celonis} /></td>
                  <td className="py-2 pr-4"><Mark v={r.ocpm} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const POSITIONING = [
  { cap: "Object-centric events", tpm: ["no", "Case ID only"], celonis: ["partial", "Partial"], ocpm: ["yes", "Full OCEL 2.0"] },
  { cap: "Causal discovery", tpm: ["no", "None"], celonis: ["no", "None"], ocpm: ["yes", "Bootstrap PC"] },
  { cap: "Confounding adjustment", tpm: ["no", "None"], celonis: ["no", "None"], ocpm: ["yes", "Double ML"] },
  { cap: "Counterfactual simulation", tpm: ["no", "None"], celonis: ["partial", "Rule-based"], ocpm: ["yes", "SCM-based"] },
  { cap: "Ground-truth validation", tpm: ["no", "No"], celonis: ["no", "No"], ocpm: ["yes", "Planted GT"] },
  { cap: "Uncertainty quantification", tpm: ["no", "None"], celonis: ["partial", "CI ranges"], ocpm: ["yes", "Bootstrap CIs"] },
] as const;

function Mark({ v }: { v: readonly [string, string] }) {
  const [state, text] = v;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px]">
      {state === "yes" ? (
        <Check size={13} className="text-forest" />
      ) : state === "partial" ? (
        <AlertTriangle size={12} className="text-amber" />
      ) : (
        <X size={13} className="text-muted" />
      )}
      <span className={state === "yes" ? "text-ink" : "text-muted"}>{text}</span>
    </span>
  );
}

function MiniDark({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <div className="text-[10px] uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-0.5 font-display text-lg text-white">{value}</div>
      <div className="text-[10px] text-white/45">{sub}</div>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="card flex items-center gap-3 p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage text-forest">
        <ShieldCheck size={15} />
      </div>
      <div>
        <div className="font-display text-lg leading-none text-ink">{value}</div>
        <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      </div>
    </div>
  );
}
