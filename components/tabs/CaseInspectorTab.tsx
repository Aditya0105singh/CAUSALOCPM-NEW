"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { CausalFixture } from "@/lib/engine/types";
import { Card, SectionTitle, Bar, KeyVal, Pill } from "@/components/ui";
import { fmtMoney } from "@/lib/format";

export function CaseInspectorTab({ f }: { f: CausalFixture }) {
  const [id, setId] = useState(f.cases[0].id);
  const c = f.cases.find((x) => x.id === id)!;
  const maxContrib = Math.max(...c.drivers.map((d) => d.contributionDays));
  const reduction = c.actualDelayDays - c.counterfactualDelayDays;
  const reductionPct = Math.round((reduction / c.actualDelayDays) * 100);
  const similar = c.similarCaseIds.map((sid) => f.cases.find((x) => x.id === sid)!).filter(Boolean);

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-ink-soft">Select Case</span>
        <select
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="rounded-lg border border-line bg-paper-2 px-3 py-1.5 text-sm text-ink"
        >
          {f.cases.map((x) => (
            <option key={x.id} value={x.id}>
              {x.id} — {x.primaryEntity}
            </option>
          ))}
        </select>
        <Pill tone="neutral">{c.category}</Pill>
        <Pill tone="neutral">{c.date}</Pill>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <SectionTitle>Case Summary</SectionTitle>
          <KeyVal k="Case ID" v={c.id} />
          <KeyVal k="Primary entity" v={c.primaryEntity} />
          <KeyVal k="Category" v={c.category} />
          <KeyVal k="Value" v={fmtMoney(c.value)} />
          <KeyVal k="Actual delay" v={`${c.actualDelayDays.toFixed(1)} d`} />
          <KeyVal k="Predicted delay" v={`${c.predictedDelayDays.toFixed(1)} d`} />
        </Card>

        <Card>
          <SectionTitle hint="SHAP on structural equations">Top Causal Drivers</SectionTitle>
          <div className="space-y-3">
            {c.drivers.map((d) => (
              <div key={d.label}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span className="text-ink-soft">{d.label}</span>
                  <span className="font-semibold text-forest">+{d.contributionDays.toFixed(2)}d</span>
                </div>
                <Bar value={d.contributionDays} max={maxContrib} />
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-line-soft pt-2 text-[12px] text-muted">
            Total attributed delay:{" "}
            <span className="font-semibold text-ink">
              {c.drivers.reduce((s, d) => s + d.contributionDays, 0).toFixed(2)} d
            </span>
          </div>
        </Card>

        <Card className="border-forest/30 bg-sage/40">
          <SectionTitle>What-If (Counterfactual)</SectionTitle>
          <p className="text-sm text-ink-soft">{c.counterfactualLabel}</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="text-center">
              <div className="font-display text-2xl text-ink">{c.actualDelayDays.toFixed(1)}</div>
              <div className="text-[10px] text-muted">actual (d)</div>
            </div>
            <ArrowRight size={18} className="text-forest" />
            <div className="text-center">
              <div className="font-display text-2xl text-forest">{c.counterfactualDelayDays.toFixed(1)}</div>
              <div className="text-[10px] text-muted">counterfactual (d)</div>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-card p-3 text-sm">
            <span className="text-muted">Potential reduction </span>
            <span className="font-semibold text-forest">
              {reduction.toFixed(2)} d ({reductionPct}%)
            </span>
          </div>
        </Card>
      </div>

      <Card pad={false}>
        <div className="p-5 pb-2">
          <SectionTitle hint="nearest cases by delay profile">Similar Cases</SectionTitle>
        </div>
        <div className="scroll-slim overflow-auto px-5 pb-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                {["Case", "Entity", "Category", "Actual", "Predicted", "Counterfactual"].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {similar.map((s) => (
                <tr key={s.id} className="border-t border-line-soft text-ink-soft">
                  <td className="py-2 pr-4">
                    <button className="text-forest hover:underline" onClick={() => setId(s.id)}>
                      {s.id}
                    </button>
                  </td>
                  <td className="py-2 pr-4">{s.primaryEntity}</td>
                  <td className="py-2 pr-4">{s.category}</td>
                  <td className="py-2 pr-4">{s.actualDelayDays.toFixed(1)}d</td>
                  <td className="py-2 pr-4">{s.predictedDelayDays.toFixed(1)}d</td>
                  <td className="py-2 pr-4">{s.counterfactualDelayDays.toFixed(1)}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
