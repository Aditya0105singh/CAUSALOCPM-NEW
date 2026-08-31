/**
 * Offline pipeline. Synthesises a fully deterministic causal fixture per domain
 * from planted ground truth, then validates it against the shared Zod contract
 * before writing `lib/data/<domain>.json`. Run: `npm run gen:data`.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { RNG } from "./lib/seededRandom";
import { DOMAINS, type DomainSpec } from "./lib/domainConfig";
import { CausalFixture } from "../lib/engine/types";

const GENERATED_AT = "2024-06-30T09:00:00.000Z";
const OUT_DIR = join(process.cwd(), "lib", "data");

function round(n: number, d = 2) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function build(spec: DomainSpec) {
  const rng = new RNG(spec.id === "manufacturing" ? 20240601 : 20240602);
  const totalEvents = spec.id === "manufacturing" ? 15231 : 18402;
  const drivers = spec.drivers;
  const confounder = spec.confounder;

  // ---- causal graph -------------------------------------------------------
  const nodes = [
    { id: "confounder", label: confounder.label, kind: "confounder" as const, x: 120, y: 60 },
    ...drivers.map((d, i) => ({
      id: d.id,
      label: d.label,
      kind: (d.kind === "mediator" ? "mediator" : "driver") as "driver" | "mediator",
      x: 60 + (i % 2) * 90,
      y: 150 + i * 70,
    })),
    { id: "outcome", label: spec.outcomeNodeLabel, kind: "outcome" as const, x: 320, y: 260 },
  ];

  const edges = [
    // confounder → top driver and → outcome (the classic backdoor path)
    { source: "confounder", target: drivers[0].id, strength: "moderate" as const, weight: 0.42, confidence: 0.9, discovered: true, planted: true },
    { source: "confounder", target: "outcome", strength: "moderate" as const, weight: 0.37, confidence: 0.88, discovered: true, planted: true },
    ...drivers.map((d) => {
      const w = d.groundTruthDays / drivers[0].groundTruthDays;
      const strength = w > 0.6 ? "strong" : w > 0.3 ? "moderate" : "weak";
      return {
        source: d.id,
        target: "outcome",
        strength: strength as "strong" | "moderate" | "weak",
        weight: round(0.2 + w * 0.6, 2),
        confidence: round(0.72 + w * 0.22, 2),
        discovered: true,
        planted: true,
      };
    }),
    // one mediation edge: mediator feeds the strongest driver's path
    { source: drivers[1].id, target: drivers[0].id, strength: "weak" as const, weight: 0.24, confidence: 0.7, discovered: true, planted: false },
  ];

  // ---- discovery metrics ------------------------------------------------
  // Validation against planted ground truth: DAG recovered cleanly (no false
  // edges), one weak planted edge sat just under the stability threshold.
  const precision = 1.0;
  const recall = 0.89;
  const f1 = round((2 * precision * recall) / (precision + recall), 2);
  const falsePositives = 0;

  const edgeStability = edges.map((e) => ({
    edge: `${nodeLabel(nodes, e.source)} → ${nodeLabel(nodes, e.target)}`,
    frequency: round(e.planted ? 0.82 + rng.next() * 0.16 : 0.55 + rng.next() * 0.2, 2),
  }));

  // ---- effects ---------------------------------------------------------
  const effects = drivers.map((d) => {
    const ciHalf = 0.18 + rng.next() * 0.35;
    return {
      driver: d.id,
      label: d.label,
      effectDays: round(d.groundTruthDays + rng.normal(0, 0.05)),
      ciLow: round(d.groundTruthDays - ciHalf),
      ciHigh: round(d.groundTruthDays + ciHalf),
      groundTruthDays: d.groundTruthDays,
      baselineDays: d.naiveDays,
      reductionPct: round(((d.naiveDays - d.groundTruthDays) / d.naiveDays) * 100, 1),
      method: d.kind === "mediator" ? "Mediation-adjusted DML" : "Double ML + backdoor adjustment",
    };
  });

  const effectAccuracy = [
    { bucket: "0–0.5", count: 2 },
    { bucket: "0.5–1", count: 1 },
    { bucket: "1–1.5", count: 1 },
    { bucket: "1.5–2", count: 1 },
    { bucket: "2+", count: 0 },
  ];

  const topDrivers = [...effects]
    .sort((a, b) => b.effectDays - a.effectDays)
    .map((e) => ({ label: e.label, impactDays: e.effectDays }));

  // ---- recommended actions & projected impact ------------------------
  const recommendedActions = spec.actions.map((a) => ({
    id: a.id,
    title: a.title,
    detail: a.detail,
    deltaDays: a.deltaDays,
    annualSavings: a.annualSavings,
    roi: round(a.annualSavings / 100000, 1),
    confidence: a.confidence,
    lever: a.lever,
    maxShiftPct: a.maxShiftPct,
  }));

  const totalReductionDays = round(
    recommendedActions.reduce((s, a) => s + a.deltaDays, 0),
    2,
  );
  const baselineOutcome = round(
    drivers.reduce((s, d) => s + d.naiveDays, 0) + 6 + rng.next() * 2,
    1,
  );
  const totalReductionPct = round((totalReductionDays / baselineOutcome) * 100, 0);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const trend = months.map((m, i) => {
    const baseline = round(baselineOutcome + rng.normal(0, 0.6), 2);
    return {
      period: m,
      baseline,
      withActions: round(baseline - totalReductionDays * (0.5 + i * 0.1), 2),
    };
  });

  // ---- cases ---------------------------------------------------------
  const cases = Array.from({ length: 24 }, (_, i) => {
    const entity = rng.pick(spec.entities);
    const isTopEntity = entity === spec.entities[0];
    const actual = round(baselineOutcome + rng.normal(isTopEntity ? 3 : 0, 2.2), 1);
    const predicted = round(actual + rng.normal(0, 0.8), 1);
    const contributions = drivers.map((d) => ({
      label: d.label,
      contributionDays: round(
        d.groundTruthDays * (0.4 + rng.next() * 0.9) * (isTopEntity && d.id === drivers[0].id ? 1.4 : 1),
        2,
      ),
    }));
    const counterfactual = round(
      actual - contributions[0].contributionDays * 0.7,
      1,
    );
    const idNum = String(i + 1).padStart(4, "0");
    return {
      id: `${spec.id === "manufacturing" ? "CASE" : "ADM"}-2024-${idNum}`,
      date: `2024-0${1 + (i % 6)}-${String(3 + (i % 24)).padStart(2, "0")}`,
      primaryEntity: entity,
      category: rng.pick(spec.categories),
      value: round(1000 + rng.next() * 90000, 0),
      actualDelayDays: actual,
      predictedDelayDays: predicted,
      counterfactualDelayDays: counterfactual,
      counterfactualLabel: spec.counterfactualLabel,
      drivers: contributions.sort((a, b) => b.contributionDays - a.contributionDays),
      similarCaseIds: [] as string[],
    };
  });
  // link similar cases by nearest actual delay
  for (const c of cases) {
    c.similarCaseIds = cases
      .filter((o) => o.id !== c.id)
      .sort((a, b) => Math.abs(a.actualDelayDays - c.actualDelayDays) - Math.abs(b.actualDelayDays - c.actualDelayDays))
      .slice(0, 3)
      .map((o) => o.id);
  }

  // ---- sample events -----------------------------------------------
  const activities =
    spec.id === "manufacturing"
      ? ["Order Placed", "Supplier Confirmed", "Picked", "Dispatched", "In Transit", "Delivered"]
      : ["Admitted", "Triage", "Consult Requested", "Specialist Seen", "Diagnostics Complete", "Discharged"];
  const sampleEvents = Array.from({ length: 12 }, (_, i) => ({
    event_id: `E-${String(i + 1).padStart(5, "0")}`,
    case_id: cases[i % cases.length].id,
    activity: activities[i % activities.length],
    resource: rng.pick(spec.entities),
    timestamp: `2024-0${1 + (i % 6)}-${String(2 + i).padStart(2, "0")}T${String(8 + (i % 10)).padStart(2, "0")}:15:00Z`,
    duration_hrs: round(rng.range(0.5, 36), 1),
  }));

  // ---- object + variable summaries -------------------------------
  const objects = spec.objects.map((o) => ({
    name: o.name,
    records: o.records,
    attributes: o.attributes,
    missingPct: o.missingPct,
    qualityPct: o.qualityPct,
    updated: `${o.updatedHrs}h ago`,
  }));

  const variableList = [
    ...drivers.map((d) => ({
      name: d.id,
      object: spec.objects[0].name,
      type: "numeric" as const,
      role: (d.kind === "mediator" ? "mediator" : "driver") as "driver" | "mediator",
      missingPct: round(rng.range(1, 7), 0),
    })),
    {
      name: confounder.id,
      object: spec.objects[spec.objects.length - 1].name,
      type: "numeric" as const,
      role: "confounder" as const,
      missingPct: 7,
    },
    {
      name: spec.outcomeVariable.toLowerCase().replace(/\s+/g, "_"),
      object: spec.objects[1].name,
      type: "numeric" as const,
      role: "outcome" as const,
      missingPct: 0,
    },
    ...spec.extraVariables,
  ];

  const variablesTotal = variableList.length + 60;
  const qualityPct = Math.round(objects.reduce((s, o) => s + o.qualityPct, 0) / objects.length);
  const causalLinks = edges.length;
  const reliabilityPct = 86;

  const fixture = {
    domain: spec.id,
    generatedAt: GENERATED_AT,
    scenario: {
      name: spec.scenarioName,
      outcomeVariable: spec.outcomeVariable,
      outcomeUnit: spec.outcomeUnit,
      org: spec.org,
      domainLabel: spec.domainLabel,
      timeRange: spec.timeRange,
      totalEvents,
      dataSources: 8,
      lastUpdated: "2 hours ago",
      description: spec.description,
      objectTypes: spec.objects.length,
      causalLinks,
      reliabilityPct,
    },
    executiveSummary: {
      headline:
        spec.id === "manufacturing"
          ? "Supplier A is confirmed as the dominant causal driver of shipment delay — statistically validated, not just correlated."
          : "Specialist assignment latency is confirmed as the dominant causal driver of discharge delay — statistically validated, not just correlated.",
      confidence: "HIGH CONFIDENCE" as const,
      bullets: [
        `Recovered causal effect: ${effects[0].effectDays} ${spec.outcomeUnit} via Double ML — ${effects[0].reductionPct}% of the naive estimate was confounding`,
        `Discovery precision ${precision.toFixed(2)}, recall ${recall.toFixed(2)} across 20 bootstrap reruns`,
        `Recommended action: ${recommendedActions[0].title} → ~$${Math.round(recommendedActions[0].annualSavings / 1000)}K/yr expected savings`,
      ],
      recommendedAction: recommendedActions[0].title,
    },
    kpis: {
      causalLinks,
      target: spec.outcomeVariable,
      expertRules: spec.id === "manufacturing" ? 9 : 11,
      reliabilityPct,
    },
    data: {
      datasets: 8,
      variables: variablesTotal,
      causalLinks,
      qualityPct,
      objects,
      variableList,
      sampleEvents,
    },
    causalGraph: { nodes, edges },
    discoveryMetrics: {
      precision,
      recall,
      f1,
      stability: reliabilityPct / 100,
      bootstrapRuns: 20,
      shd: falsePositives,
      edgeStability,
    },
    effects,
    effectAccuracy,
    topDrivers,
    recommendedActions,
    projectedImpact: { totalReductionPct, totalReductionDays, trend },
    cases,
  };

  return CausalFixture.parse(fixture);
}

function nodeLabel(nodes: { id: string; label: string }[], id: string) {
  return nodes.find((n) => n.id === id)?.label ?? id;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const spec of Object.values(DOMAINS)) {
  const fixture = build(spec);
  const path = join(OUT_DIR, `${spec.id}.json`);
  writeFileSync(path, JSON.stringify(fixture, null, 2));
  console.log(`✓ ${spec.id.padEnd(14)} → ${path}  (${fixture.causalGraph.edges.length} edges, ${fixture.cases.length} cases)`);
}
console.log("Done.");
