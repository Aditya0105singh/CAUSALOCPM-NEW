import { Sparkles, TrendingUp, ShieldCheck, Target, GitBranch } from "lucide-react";
import type { CausalFixture } from "@/lib/engine/types";
import { Card, Pill, Stat, SectionTitle, Bar, KeyVal } from "@/components/ui";
import { fmtMoney } from "@/lib/format";

export function OverviewTab({ f }: { f: CausalFixture }) {
  const es = f.executiveSummary;
  const topDriver = f.topDrivers[0];
  const topAction = f.recommendedActions[0];
  const maxImpact = Math.max(...f.topDrivers.map((d) => d.impactDays));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat value={f.kpis.causalLinks} label="Cause-and-Effect Links" sub="Causal intelligence" accent />
        <Stat value={f.kpis.target} label="Target" sub="Business impact" />
        <Stat value={f.kpis.expertRules} label="Expert Rules Applied" sub="Validated & interpretable" />
        <Stat value={`${f.kpis.reliabilityPct}%`} label="Reliable" sub="Confidence you can trust" accent />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Sparkles size={15} className="text-forest" />
            AI Executive Summary
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

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle hint={f.scenario.timeRange}>Scenario at a glance</SectionTitle>
          <p className="text-sm leading-relaxed text-ink-soft">{f.scenario.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-x-6">
            <KeyVal k="Time range" v={f.scenario.timeRange} />
            <KeyVal k="Total events" v={f.scenario.totalEvents.toLocaleString()} />
            <KeyVal k="Data sources" v={`${f.scenario.dataSources} integrated`} />
            <KeyVal k="Last updated" v={f.scenario.lastUpdated} />
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <SectionTitle hint={<TrendingUp size={13} />}>Top Driver (by impact)</SectionTitle>
            <div className="font-display text-xl text-ink">{topDriver.label}</div>
            <div className="mt-1 text-sm text-muted">
              Causal effect: <span className="font-semibold text-forest">{topDriver.impactDays.toFixed(2)} days</span>
            </div>
            <div className="mt-3 space-y-2">
              {f.topDrivers.slice(0, 4).map((d) => (
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

          <Card>
            <SectionTitle hint={<Target size={13} />}>Savings Potential</SectionTitle>
            <div className="font-display text-2xl text-forest">
              ~{fmtMoney(topAction.annualSavings)}<span className="text-sm text-muted"> / year</span>
            </div>
            <p className="mt-1 text-[12px] text-muted">
              If the recommended action is applied: {topAction.title}.
            </p>
          </Card>
        </div>
      </div>

      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        <GitBranch size={15} className="text-forest" />
        Pipeline: Event Logs → Object Graph → Causal Discovery (DAG) → Structural Causal Model → Counterfactual Simulation &amp; Attribution
      </Card>
    </div>
  );
}
