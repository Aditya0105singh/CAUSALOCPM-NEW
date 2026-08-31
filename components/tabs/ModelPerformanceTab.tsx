import type { CausalFixture } from "@/lib/engine/types";
import { Card, Stat, SectionTitle, Bar } from "@/components/ui";
import { EffectAccuracyChart } from "@/components/Charts";

export function ModelPerformanceTab({ f }: { f: CausalFixture }) {
  const m = f.discoveryMetrics;
  const maxDriver = Math.max(...f.topDrivers.map((d) => d.impactDays));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat value={m.precision.toFixed(2)} label="Precision" sub="Higher is better" accent />
        <Stat value={m.recall.toFixed(2)} label="Recall" sub="Higher is better" />
        <Stat value={m.f1.toFixed(2)} label="F1 Score" sub="DAG recovery" accent />
        <Stat value={`${Math.round(m.stability * 100)}%`} label="Stability" sub={`Across ${m.bootstrapRuns} reruns`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle hint="absolute error vs ground truth (days)">Causal Effect Accuracy</SectionTitle>
          <EffectAccuracyChart data={f.effectAccuracy} />
          <p className="mt-2 text-[12px] text-muted">
            {f.effects.length} estimated effects · SHD {m.shd} · most estimates land within 1 day of planted truth.
          </p>
        </Card>

        <Card>
          <SectionTitle hint="recovered effect, days">Top Drivers by Causal Impact</SectionTitle>
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

      <Card pad={false}>
        <div className="p-5 pb-2">
          <SectionTitle hint="bootstrap edge frequency">Edge Stability &amp; Effect Validation</SectionTitle>
        </div>
        <div className="scroll-slim overflow-auto px-5 pb-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                {["Edge", "Bootstrap frequency", "Driver", "Naive est.", "Recovered", "Confounding removed", "Method"].map((h) => (
                  <th key={h} className="whitespace-nowrap pb-2 pr-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {f.effects.map((e, i) => (
                <tr key={e.driver} className="border-t border-line-soft text-ink-soft">
                  <td className="whitespace-nowrap py-2 pr-4">{f.discoveryMetrics.edgeStability[i]?.edge ?? "—"}</td>
                  <td className="py-2 pr-4">{Math.round((f.discoveryMetrics.edgeStability[i]?.frequency ?? 0) * 100)}%</td>
                  <td className="whitespace-nowrap py-2 pr-4">{e.label}</td>
                  <td className="py-2 pr-4">{e.baselineDays.toFixed(2)}d</td>
                  <td className="py-2 pr-4 font-semibold text-forest">{e.effectDays.toFixed(2)}d</td>
                  <td className="py-2 pr-4">{e.reductionPct}%</td>
                  <td className="whitespace-nowrap py-2 pr-4">{e.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
