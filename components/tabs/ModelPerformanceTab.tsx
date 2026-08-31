"use client";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Sparkles, RotateCcw, Zap, Gauge, Check } from "lucide-react";
import type { CausalFixture } from "@/lib/engine/types";
import { Card, Stat, SectionTitle, Bar, KeyVal, Pill } from "@/components/ui";
import { EffectAccuracyChart, CoefficientChart, CateChart } from "@/components/Charts";
import { Waterfall } from "@/components/Waterfall";
import { simulate, recommendPlan, defaultLeverValues, deflection, type LeverValues } from "@/lib/simulator";
import { fmtMoney } from "@/lib/format";

export function ModelPerformanceTab({ f }: { f: CausalFixture }) {
  const m = f.discoveryMetrics;
  const ne = f.naiveEffect;
  const maxDriver = Math.max(...f.topDrivers.map((d) => d.impactDays));

  const [values, setValues] = useState<LeverValues>(() => defaultLeverValues(f));
  const [target, setTarget] = useState(20);
  const sim = useMemo(() => simulate(f, values), [f, values]);
  const plan = useMemo(() => recommendPlan(f, target), [f, target]);
  const groups = useMemo(() => [...new Set(f.simulator.levers.map((l) => l.group))], [f]);

  const set = (id: string, v: number) => setValues((s) => ({ ...s, [id]: v }));
  const reset = () => setValues(defaultLeverValues(f));
  const applyPlan = () =>
    setValues((s) => {
      const next = { ...s };
      for (const l of plan.levers) next[l.id] = l.value;
      return next;
    });

  return (
    <div className="space-y-5">
      {/* AI interpretation */}
      <Card className="border-forest/25 bg-sage/30">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
          <Sparkles size={15} className="text-forest" /> AI Causal Interpretation
          <Pill tone="forest">HIGH CONFIDENCE</Pill>
        </div>
        <p className="text-sm text-ink-soft">
          Confounding adjustment recovered a causal effect of <b className="text-forest">{ne.causalDays} {f.scenario.outcomeUnit}</b>.
          The naive, uncorrected estimate was {ne.biasPct}% higher. Naive correlation suggested {ne.naiveDays} {f.scenario.outcomeUnit};{" "}
          {ne.method} gives {ne.causalDays} {f.scenario.outcomeUnit} (95% CI [{ne.ciLow}, {ne.ciHigh}]). Treatment effects
          vary by operational segment (CATE) — see below.
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat value={m.precision.toFixed(2)} label="Precision" sub="pre-domain-knowledge" accent />
        <Stat value={m.recall.toFixed(2)} label="Edge Recall" sub="pre-domain-knowledge" />
        <Stat value={m.f1.toFixed(2)} label="Recovery F1" sub="DAG recovery" accent />
        <Stat value={`${Math.round(m.stability * 100)}%`} label="Bootstrap Stability" sub={`${m.bootstrapRuns} reruns`} />
      </div>

      {/* Naive vs DML */}
      <Card>
        <SectionTitle hint="confounding adjustment">Naive correlation vs. recovered causal effect</SectionTitle>
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <div className="font-display text-3xl text-amber">{ne.naiveDays}</div>
            <div className="text-[11px] text-muted">naive correlation ({f.scenario.outcomeUnit})</div>
          </div>
          <div className="pb-2 text-muted">−{ne.biasDays} {f.scenario.outcomeUnit} confounding bias →</div>
          <div>
            <div className="font-display text-3xl text-forest">{ne.causalDays}</div>
            <div className="text-[11px] text-muted">Double ML causal effect · 95% CI [{ne.ciLow}, {ne.ciHigh}]</div>
          </div>
        </div>
      </Card>

      {/* ---- What-If Simulator ---- */}
      <Card pad={false} className="border-forest/25">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Zap size={15} className="text-forest" /> What-If Causal Simulator
          </div>
          <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[12px] text-ink-soft hover:bg-paper-2">
            <RotateCcw size={12} /> Reset to baseline
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1.15fr_1fr]">
          {/* levers */}
          <div className="space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Intervention levers</div>
            {groups.map((g) => (
              <div key={g}>
                <div className="mb-1.5 text-[12px] font-medium text-ink">{g}</div>
                <div className="space-y-3 rounded-lg border border-line-soft bg-paper-2/40 p-3">
                  {f.simulator.levers.filter((l) => l.group === g).map((l) => {
                    const v = values[l.id] ?? l.baseline;
                    const active = deflection(l, v) > 0.001;
                    return (
                      <div key={l.id}>
                        <div className="flex items-center justify-between gap-2 text-[12px]">
                          <span className={clsx(active ? "font-medium text-ink" : "text-ink-soft")}>{l.label}</span>
                          {l.kind === "toggle" ? (
                            <button
                              onClick={() => set(l.id, v >= 1 ? 0 : 1)}
                              className={clsx("relative h-5 w-9 rounded-full transition-colors", v >= 1 ? "bg-forest" : "bg-line")}
                            >
                              <span className={clsx("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", v >= 1 ? "left-4" : "left-0.5")} />
                            </button>
                          ) : (
                            <span className="tabular-nums text-muted">{v}{l.unit}</span>
                          )}
                        </div>
                        {l.kind === "slider" && (
                          <input
                            type="range"
                            min={l.min}
                            max={l.max}
                            step={l.step}
                            value={v}
                            onChange={(e) => set(l.id, Number(e.target.value))}
                            className="mt-1 w-full accent-[#3d5a3d]"
                          />
                        )}
                        <div className="text-[10px] text-muted">{l.hint}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* predicted outcomes */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Predicted outcomes</div>
            <div className="rounded-xl border border-forest/30 bg-sage/40 p-4">
              <div className="text-[11px] text-muted">Predicted {f.scenario.outcomeVariable.toLowerCase()}</div>
              <div className="font-display text-4xl text-forest">
                {sim.predicted} <span className="text-base text-muted">{f.scenario.outcomeUnit}</span>
              </div>
              <div className={clsx("text-[12px] font-medium", sim.deltaPct < 0 ? "text-forest" : "text-muted")}>
                {sim.deltaPct > 0 ? "+" : ""}{sim.deltaPct}% vs baseline ({sim.baseline} {f.scenario.outcomeUnit})
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniOut label="Throughput" value={`${sim.throughput}/day`} delta={sim.throughputDelta ? `${sim.throughputDelta > 0 ? "+" : ""}${sim.throughputDelta}` : "±0"} />
              <MiniOut label="Risk index" value={`${sim.riskIndex}`} delta={`${sim.riskDelta > 0 ? "+" : ""}${sim.riskDelta}`} />
              <MiniOut label="ROI payback" value={sim.roiPaybackMonths === null ? "—" : sim.roiPaybackMonths === 0 ? "0 mo" : `${sim.roiPaybackMonths} mo`} delta="" />
            </div>
            <div className="rounded-lg border border-line bg-card p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">Annual savings</span><b className="text-forest">{sim.annualSavings > 0 ? `~${fmtMoney(sim.annualSavings)}` : "—"}</b></div>
              <div className="flex justify-between"><span className="text-muted">Implementation cost</span><b className="text-ink">{sim.implCost > 0 ? fmtMoney(sim.implCost) : "$0"}</b></div>
            </div>

            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Causal effect decomposition</div>
              <div className="rounded-lg border border-line bg-card p-3">
                <Waterfall
                  start={{ label: "Baseline", value: sim.baseline }}
                  steps={sim.contributions.length ? sim.contributions.map((c) => ({ label: c.label, value: c.deltaDays })) : [{ label: "no levers set", value: 0 }]}
                  end={{ label: "Predicted", value: sim.predicted }}
                  unit={f.scenario.outcomeUnit}
                  height={180}
                />
              </div>
            </div>
          </div>
        </div>

        {/* mediator states */}
        <div className="border-t border-line px-5 py-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Mediator variable states</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                {["Variable", "Baseline", "Predicted", "Change"].map((h) => (
                  <th key={h} className="pb-1.5 pr-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sim.mediatorStates.map((s) => (
                <tr key={s.name} className="border-t border-line-soft text-ink-soft">
                  <td className="py-1.5 pr-4">{s.name}</td>
                  <td className="py-1.5 pr-4">{s.baseline} {s.unit}</td>
                  <td className="py-1.5 pr-4">{s.predicted} {s.unit}</td>
                  <td className={clsx("py-1.5 pr-4 font-medium", s.delta < 0 ? "text-forest" : "text-muted")}>{s.delta > 0 ? "+" : ""}{s.delta} {s.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recommended action plan (target-driven) */}
      <Card className="border-forest/25">
        <SectionTitle hint="cheapest lever combination that reaches your target — searched over the same causal engine">
          Recommended action plan
        </SectionTitle>
        <div className="mb-3 flex items-center gap-3 text-[12px]">
          <span className="text-muted">Target {f.scenario.outcomeVariable.toLowerCase()} reduction</span>
          <input type="range" min={5} max={50} step={5} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="w-40 accent-[#3d5a3d]" />
          <span className="font-semibold text-ink">{target}%</span>
          <Pill tone={plan.reachable ? "forest" : "amber"}>{plan.reachable ? "Target reachable" : "Best effort"}</Pill>
        </div>
        <p className="text-sm text-ink-soft">
          Predicted {f.scenario.outcomeVariable.toLowerCase()}:{" "}
          <b className="text-forest">{plan.predicted} {f.scenario.outcomeUnit}</b> (−{plan.reductionPct}% vs {f.simulator.baselineOutcome} {f.scenario.outcomeUnit} baseline)
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <KeyVal k="Impl. cost" v={fmtMoney(plan.implCost)} />
          <KeyVal k="Annual savings" v={`~${fmtMoney(plan.annualSavings)}`} />
          <KeyVal k="Payback" v={`${plan.paybackMonths} mo`} />
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          {plan.levers.map((l) => (
            <li key={l.id} className="flex items-center gap-2 text-ink-soft">
              <Check size={13} className="text-forest" /> {l.label}: <span className="text-muted">{l.setting}</span>
            </li>
          ))}
        </ul>
        <button onClick={applyPlan} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-sm font-medium text-white">
          <Gauge size={14} /> Apply this plan to the levers
        </button>
      </Card>

      {/* coefficients + CATE */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle hint="Double ML estimate vs. planted coefficient">Estimated vs. ground-truth coefficients</SectionTitle>
          <CoefficientChart data={f.coefficients} />
        </Card>
        <Card>
          <SectionTitle hint={`by ${f.cate.segmentVar} · 95% CI`}>Treatment-effect heterogeneity (CATE)</SectionTitle>
          <CateChart segments={f.cate.segments} ate={f.cate.ate} />
          <p className="mt-2 text-[12px] text-muted">{f.cate.note}</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle hint="absolute error vs planted truth (days)">Causal effect accuracy</SectionTitle>
          <EffectAccuracyChart data={f.effectAccuracy} />
        </Card>
        <Card>
          <SectionTitle hint="recovered effect, days">Top drivers by causal impact</SectionTitle>
          <div className="space-y-3">
            {f.topDrivers.map((d) => (
              <div key={d.label}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span className="text-ink-soft">{d.label}</span>
                  <span className="font-semibold text-forest">{d.impactDays.toFixed(2)}d</span>
                </div>
                <Bar value={d.impactDays} max={maxDriver} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MiniOut({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="rounded-lg border border-line bg-card p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="font-display text-base text-ink">{value}</div>
      {delta && <div className="text-[10px] text-muted">{delta}</div>}
    </div>
  );
}
