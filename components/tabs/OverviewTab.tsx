"use client";
import { TrendingDown, ShieldCheck, ArrowRight, Check, X, AlertTriangle } from "lucide-react";
import type { CausalFixture } from "@/lib/engine/types";
import { Card, Pill, SectionTitle, KeyVal } from "@/components/ui";
import { CountUp, FadeIn, motion } from "@/components/motion";
import { ValidationExplainer } from "@/components/ValidationExplainer";
import { AlertIllustration } from "@/components/Illustrations";
import { fmtMoney } from "@/lib/format";

export function OverviewTab({ f }: { f: CausalFixture }) {
  const es = f.executiveSummary;
  const topAction = f.recommendedActions[0];
  const t = f.effects[0];
  const maxImpact = Math.max(...f.topDrivers.map((d) => d.impactDays));

  return (
    <div className="space-y-5">
      {/* Causal Intelligence Alert */}
      <motion.div
        id="tour-alert"
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[16px] border border-forest/30 bg-forest-deep text-white"
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sage-2">
          <AlertTriangle size={13} /> Causal Intelligence Alert
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-[1.15fr_0.9fr] lg:items-center">
          <div>
            <div className="font-display text-[26px] leading-tight">
              {es.alertOutcome} can be reduced by{" "}
              <span className="text-sage-2">
                <CountUp value={es.alertReductionPct} decimals={1} suffix="%" />
              </span>
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
            <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
              <MiniDark label="Expected annual savings" value={`~${fmtMoney(topAction.annualSavings)}`} sub={`payback ${f.report.roiPayback}`} />
              <MiniDark label="Recovered causal effect" value={`${t.effectDays} ${f.scenario.outcomeUnit}`} sub={`planted ${t.groundTruthDays} · naive ${t.naiveDays}`} />
            </div>
          </div>
          <div className="hidden justify-end lg:flex">
            <AlertIllustration domain={f.domain} />
          </div>
        </div>
        <div className="flex items-center gap-2.5 border-t border-white/10 px-5 py-3 text-[13px] text-white/80">
          <Pill tone="forest">
            <ShieldCheck size={12} /> {es.confidence}
          </Pill>
          <span>{es.headline}</span>
        </div>
      </motion.div>

      <div id="tour-explainer" className="scroll-mt-24">
        <ValidationExplainer f={f} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2" delay={0.05}>
          <Card>
            <SectionTitle hint={f.scenario.timeRange}>Scenario at a glance</SectionTitle>
            <p className="text-sm leading-relaxed text-ink-soft">{f.scenario.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-x-6">
              <KeyVal k="Time range" v={f.scenario.timeRange} />
              <KeyVal k="Total events" v={f.scenario.totalEvents.toLocaleString()} />
              <KeyVal k="Treated arm" v={`${f.scenario.treatedPct}% (${f.scenario.treatedCases.toLocaleString()} cases)`} />
              <KeyVal k="Highest-risk segment" v={es.riskSegment} />
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card>
            <SectionTitle hint={<TrendingDown size={13} />}>Top drivers (by causal impact)</SectionTitle>
            <div className="space-y-2.5">
              {f.topDrivers.slice(0, 5).map((d, i) => (
                <div key={d.label}>
                  <div className="mb-1 flex justify-between text-[11px] text-muted">
                    <span>{d.label}</span>
                    <span>{d.impactDays.toFixed(2)}d</span>
                  </div>
                  <AnimatedBar value={d.impactDays} max={maxImpact} delay={i * 0.08} />
                </div>
              ))}
            </div>
          </Card>
        </FadeIn>
      </div>

      {/* Competitive positioning */}
      <FadeIn>
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
      </FadeIn>
    </div>
  );
}

const POSITIONING = [
  { cap: "Object-centric events", tpm: ["no", "Case ID only"], celonis: ["partial", "Partial"], ocpm: ["yes", "Full OCEL 2.0"] },
  { cap: "Causal discovery", tpm: ["no", "None"], celonis: ["no", "None"], ocpm: ["yes", "Bootstrap PC"] },
  { cap: "Confounding adjustment", tpm: ["no", "None"], celonis: ["no", "None"], ocpm: ["yes", "Double ML"] },
  { cap: "Counterfactual simulation", tpm: ["no", "None"], celonis: ["partial", "Rule-based"], ocpm: ["yes", "SCM-based"] },
  { cap: "Ground-truth validation", tpm: ["no", "No"], celonis: ["no", "No"], ocpm: ["yes", "Planted GT"] },
  { cap: "Uncertainty quantification", tpm: ["no", "None"], celonis: ["partial", "CI ranges"], ocpm: ["yes", "Bootstrap CIs + E-value"] },
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


function AnimatedBar({ value, max, delay }: { value: number; max: number; delay: number }) {
  const pct = Math.max(3, Math.min(100, (Math.abs(value) / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line-soft">
      <motion.div
        className="h-full rounded-full bg-forest"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
