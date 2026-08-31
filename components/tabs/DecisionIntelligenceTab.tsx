"use client";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import type { CausalFixture } from "@/lib/engine/types";
import { Card, SectionTitle, Pill } from "@/components/ui";
import { ImpactTrendChart } from "@/components/Charts";
import { fmtMoney } from "@/lib/format";

const SUB = ["Recommendations", "Impact Simulator", "Action Log"] as const;

export function DecisionIntelligenceTab({ f }: { f: CausalFixture }) {
  const [sub, setSub] = useState<(typeof SUB)[number]>("Recommendations");
  const pi = f.projectedImpact;

  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-line">
        {SUB.map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={clsx(
              "px-3 py-2 text-sm",
              sub === s ? "tab-underline font-semibold text-ink" : "text-muted hover:text-ink",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {sub === "Recommendations" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {f.recommendedActions.map((a, i) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold text-muted">ACTION {i + 1} · {a.lever}</div>
                    <div className="mt-0.5 font-display text-lg text-ink">{a.title}</div>
                  </div>
                  <Pill tone="forest">{Math.round(a.confidence * 100)}% conf.</Pill>
                </div>
                <p className="mt-2 text-sm text-ink-soft">{a.detail}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <span className="text-muted">
                    Expected impact <b className="text-forest">−{a.deltaDays.toFixed(2)} d</b>
                  </span>
                  <span className="text-muted">
                    Annual savings <b className="text-forest">~{fmtMoney(a.annualSavings)}</b>
                  </span>
                  <span className="text-muted">
                    ROI <b className="text-ink">{a.roi.toFixed(1)}×</b>
                  </span>
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <SectionTitle hint={`${f.scenario.outcomeUnit}`}>Projected Impact (All Actions)</SectionTitle>
            <div className="font-display text-3xl text-forest">{pi.totalReductionPct}%</div>
            <div className="text-[12px] text-muted">≈ {pi.totalReductionDays.toFixed(2)} days total reduction</div>
            <div className="mt-3">
              <ImpactTrendChart data={pi.trend} />
            </div>
          </Card>
        </div>
      )}

      {sub === "Impact Simulator" && <Simulator f={f} />}

      {sub === "Action Log" && (
        <Card pad={false}>
          <div className="scroll-slim overflow-auto p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                  {["Timestamp", "Action", "Lever", "Δ days", "Status"].map((h) => (
                    <th key={h} className="pb-2 pr-4 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {f.recommendedActions.map((a, i) => (
                  <tr key={a.id} className="border-t border-line-soft text-ink-soft">
                    <td className="py-2 pr-4">2024-06-{String(10 + i * 3).padStart(2, "0")} 09:{String(12 + i).padStart(2, "0")}</td>
                    <td className="py-2 pr-4">{a.title}</td>
                    <td className="py-2 pr-4">{a.lever}</td>
                    <td className="py-2 pr-4 text-forest">−{a.deltaDays.toFixed(2)}</td>
                    <td className="py-2 pr-4">
                      <Pill tone={i === 0 ? "forest" : "neutral"}>{i === 0 ? "Approved" : "Proposed"}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Simulator({ f }: { f: CausalFixture }) {
  const drivers = f.effects;
  const [shift, setShift] = useState<Record<string, number>>(
    Object.fromEntries(drivers.map((d) => [d.driver, 0])),
  );

  const totalDelta = useMemo(
    () =>
      drivers.reduce((s, d) => {
        const rec = f.recommendedActions.find((a) => a.lever && d.label.toLowerCase().includes(a.lever.split(" ")[0].toLowerCase()));
        const cap = rec?.maxShiftPct ?? 30;
        const applied = Math.min(shift[d.driver], cap);
        return s + (d.effectDays * applied) / 100;
      }, 0),
    [shift, drivers, f.recommendedActions],
  );

  const baseline = f.projectedImpact.trend[0].baseline;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <SectionTitle hint="drag to reduce each driver's exposure">Impact Simulator</SectionTitle>
        <div className="space-y-4">
          {drivers.map((d) => (
            <div key={d.driver}>
              <div className="mb-1 flex justify-between text-[12px]">
                <span className="text-ink-soft">{d.label}</span>
                <span className="text-muted">
                  −{shift[d.driver]}% → <b className="text-forest">−{((d.effectDays * shift[d.driver]) / 100).toFixed(2)}d</b>
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                value={shift[d.driver]}
                onChange={(e) => setShift((s) => ({ ...s, [d.driver]: Number(e.target.value) }))}
                className="w-full accent-[#3d5a3d]"
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-forest/30 bg-sage/40">
        <SectionTitle>Simulated Outcome</SectionTitle>
        <div className="text-[12px] text-muted">Baseline {f.scenario.outcomeVariable.toLowerCase()}</div>
        <div className="font-display text-xl text-ink">{baseline.toFixed(2)} d</div>
        <div className="mt-3 text-[12px] text-muted">After simulated interventions</div>
        <div className="font-display text-3xl text-forest">{Math.max(0, baseline - totalDelta).toFixed(2)} d</div>
        <div className="mt-2 rounded-lg bg-card p-3 text-sm">
          Total reduction <b className="text-forest">−{totalDelta.toFixed(2)} d</b>{" "}
          <span className="text-muted">({baseline > 0 ? Math.round((totalDelta / baseline) * 100) : 0}%)</span>
        </div>
      </Card>
    </div>
  );
}
