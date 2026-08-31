"use client";
import { useState } from "react";
import { clsx } from "clsx";
import type { CausalFixture } from "@/lib/engine/types";
import { Card, Stat, SectionTitle } from "@/components/ui";
import { CausalGraph, GraphLegend } from "@/components/CausalGraph";

const SUB = ["Datasets", "Variables", "Causal Links", "Data Quality"] as const;

export function DataDiscoveryTab({ f }: { f: CausalFixture }) {
  const [sub, setSub] = useState<(typeof SUB)[number]>("Datasets");
  const d = f.data;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat value={d.datasets} label="Datasets integrated" accent />
        <Stat value={d.variables} label="Variables total" />
        <Stat value={d.causalLinks} label="Causal links discovered" accent />
        <Stat value={`${d.qualityPct}%`} label="Data quality overall" />
      </div>

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

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3" pad={false}>
          <div className="p-5 pb-2">
            <SectionTitle>{sub}</SectionTitle>
          </div>
          <div className="scroll-slim max-h-[420px] overflow-auto px-5 pb-5">
            {sub === "Datasets" && (
              <Table
                head={["Name", "Records", "Missing", "Quality", "Updated"]}
                rows={d.objects.map((o) => [
                  o.name,
                  o.records.toLocaleString(),
                  `${o.missingPct}%`,
                  `${o.qualityPct}%`,
                  o.updated,
                ])}
              />
            )}
            {sub === "Variables" && (
              <Table
                head={["Variable", "Object", "Type", "Role", "Missing"]}
                rows={d.variableList.map((v) => [v.name, v.object, v.type, v.role, `${v.missingPct}%`])}
              />
            )}
            {sub === "Causal Links" && (
              <Table
                head={["Source", "Target", "Strength", "Weight", "Confidence"]}
                rows={f.causalGraph.edges.map((e) => [
                  label(f, e.source),
                  label(f, e.target),
                  e.strength,
                  e.weight.toFixed(2),
                  `${Math.round(e.confidence * 100)}%`,
                ])}
              />
            )}
            {sub === "Data Quality" && (
              <Table
                head={["Object", "Attributes", "Missing", "Quality"]}
                rows={d.objects.map((o) => [o.name, String(o.attributes), `${o.missingPct}%`, `${o.qualityPct}%`])}
              />
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle hint="PC algorithm + domain constraints">Causal Graph Preview</SectionTitle>
          <CausalGraph graph={f.causalGraph} height={300} compact />
          <GraphLegend />
        </Card>
      </div>

      <Card pad={false}>
        <div className="p-5 pb-2">
          <SectionTitle hint="OCEL 2.0 event log">Sample Events</SectionTitle>
        </div>
        <div className="scroll-slim overflow-auto px-5 pb-5">
          <Table
            head={Object.keys(d.sampleEvents[0])}
            rows={d.sampleEvents.map((e) => Object.values(e).map((v) => String(v)))}
          />
        </div>
      </Card>
    </div>
  );
}

function label(f: CausalFixture, id: string) {
  return f.causalGraph.nodes.find((n) => n.id === id)?.label ?? id;
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
          {head.map((h) => (
            <th key={h} className="whitespace-nowrap pb-2 pr-4 font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-line-soft">
            {r.map((c, j) => (
              <td key={j} className="whitespace-nowrap py-2 pr-4 text-ink-soft">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
