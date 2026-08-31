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
const REPORT_DATE = "August 31, 2026";
const OUT_DIR = join(process.cwd(), "lib", "data");

const round = (n: number, d = 2) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

function build(spec: DomainSpec) {
  const rng = new RNG(spec.id === "manufacturing" ? 20240601 : 20240602);
  const totalEvents = spec.id === "manufacturing" ? 15000 : 18400;
  const drivers = spec.drivers;
  const confounder = spec.confounder;
  const unit = spec.outcomeUnit;
  const baselineOutcome = spec.id === "manufacturing" ? 8.12 : 7.9;

  // ---- causal graph -----------------------------------------------------
  const nodes = [
    { id: "confounder", label: confounder.label, kind: "confounder" as const, x: 150, y: 30 },
    ...drivers.map((d, i) => ({
      id: d.id,
      label: d.label,
      kind: (d.kind === "mediator" ? "mediator" : "driver") as "driver" | "mediator",
      x: 40 + (i % 2) * 150,
      y: 120 + i * 58,
    })),
    { id: "outcome", label: spec.outcomeNodeLabel, kind: "outcome" as const, x: 330, y: 250 },
  ];

  const edges = [
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
    { source: drivers[0].id, target: drivers[1].id, strength: "strong" as const, weight: 0.66, confidence: 0.86, discovered: true, planted: true },
    { source: drivers[2].id, target: drivers[1].id, strength: "weak" as const, weight: 0.24, confidence: 0.7, discovered: true, planted: false },
  ];

  // ---- discovery metrics ---------------------------------------------
  const precision = 1.0;
  const recall = 0.89;
  const f1 = round((2 * precision * recall) / (precision + recall), 2);
  const falsePositives = 0;
  const reliabilityPct = 86;

  const edgeStability = edges.map((e) => ({
    edge: `${nodeLabel(nodes, e.source)} → ${nodeLabel(nodes, e.target)}`,
    frequency: round(e.planted ? 0.82 + rng.next() * 0.16 : 0.55 + rng.next() * 0.2, 2),
  }));

  // ---- effects (Double ML vs naive) --------------------------------
  const effects = drivers.map((d) => {
    const ciHalf = 0.06 + rng.next() * 0.09;
    return {
      driver: d.id,
      label: d.label,
      effectDays: round(d.groundTruthDays + rng.normal(0, 0.02)),
      ciLow: round(d.groundTruthDays - ciHalf),
      ciHigh: round(d.groundTruthDays + ciHalf),
      groundTruthDays: d.groundTruthDays,
      baselineDays: d.naiveDays,
      reductionPct: round(((d.naiveDays - d.groundTruthDays) / d.naiveDays) * 100, 1),
      method: d.kind === "mediator" ? "Mediation-adjusted DML" : "Double ML + backdoor adjustment",
    };
  });
  const top = effects[0];

  const naiveEffect = {
    naiveDays: top.baselineDays,
    causalDays: top.effectDays,
    biasDays: round(top.baselineDays - top.effectDays),
    biasPct: round(((top.baselineDays - top.effectDays) / top.effectDays) * 100, 1),
    ciLow: top.ciLow,
    ciHigh: top.ciHigh,
    method: "Double ML · cross-fitted gradient boosting",
  };

  const effectAccuracy = [
    { bucket: "0–0.1", count: 3 },
    { bucket: "0.1–0.2", count: 2 },
    { bucket: "0.2–0.3", count: 1 },
    { bucket: "0.3–0.5", count: 0 },
    { bucket: "0.5+", count: 0 },
  ];

  const topDrivers = [...effects]
    .sort((a, b) => b.effectDays - a.effectDays)
    .map((e) => ({ label: e.label, impactDays: e.effectDays }));

  const coefficients = [
    { edge: `${drivers[0].label} → ${drivers[1].label}`, estimated: spec.strongestRel.coefficient, groundTruth: round(spec.strongestRel.coefficient * 1.02) },
    ...effects.map((e) => ({
      edge: `${e.label} → ${spec.outcomeNodeLabel}`,
      estimated: e.effectDays,
      groundTruth: e.groundTruthDays,
    })),
  ];

  // ---- CATE / treatment-effect heterogeneity ----------------------
  const ate = round(0.02 + rng.next() * 0.06);
  const cate = {
    driver: drivers[0].label,
    segmentVar: spec.segmentVar,
    ate,
    segments: spec.cateSegments.map((s) => {
      const effect = round(ate + s.mult * 0.13);
      const ciHalf = 0.05 + rng.next() * 0.05;
      return { label: s.label, effect, ciLow: round(effect - ciHalf), ciHigh: round(effect + ciHalf) };
    }),
    note: `The causal effect of ${drivers[0].label} is concentrated in the High ${spec.segmentVar} segment, suggesting interventions targeted by ${spec.segmentVar.toLowerCase()} profile would yield different returns.`,
  };

  // ---- recommended actions & projected impact --------------------
  const recommendedActions = spec.actions.map((a) => ({
    id: a.id,
    title: a.title,
    detail: a.detail,
    deltaDays: a.deltaDays,
    annualSavings: a.annualSavings,
    roi: round(a.annualSavings / Math.max(a.capex, 1), 1),
    confidence: a.confidence,
    lever: a.lever,
    maxShiftPct: a.maxShiftPct,
    reductionPct: round((a.deltaDays / baselineOutcome) * 100, 1),
    effort: a.effort,
    timeline: a.timeline,
    capex: a.capex,
    evidence: a.evidence,
  }));

  const totalReductionDays = round(recommendedActions.reduce((s, a) => s + a.deltaDays, 0));
  const totalReductionPct = round((totalReductionDays / baselineOutcome) * 100, 0);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const trend = months.map((m, i) => {
    const baseline = round(baselineOutcome + rng.normal(0, 0.35));
    return { period: m, baseline, withActions: round(baseline - totalReductionDays * (0.45 + i * 0.11)) };
  });

  // ---- simulator ------------------------------------------------
  const simulator = {
    baselineOutcome,
    throughputBaseline: spec.id === "manufacturing" ? 100 : 42,
    riskBaseline: 45,
    costPerDelayDay: spec.costPerDelayDay,
    annualVolume: spec.annualVolume,
    mediators: spec.mediators,
    levers: spec.levers,
  };

  // ---- discovery walkthrough -----------------------------------
  const treatedCases = Math.round((totalEvents * spec.treatedPct) / 100);
  const objectInstances = spec.id === "manufacturing" ? 30025 : 41180;
  const coOccurrenceEdges = spec.id === "manufacturing" ? 105166 : 138420;
  const discovery = {
    totalEvents,
    treatedCases,
    treatedPct: spec.treatedPct,
    avgOutcome: baselineOutcome,
    stdOutcome: round(baselineOutcome * 0.58),
    objectInstances,
    coOccurrenceEdges,
    avgDegree: round((coOccurrenceEdges * 2) / objectInstances),
    topResources:
      spec.id === "manufacturing"
        ? [
            { label: "Top machine", value: "MCH_01" },
            { label: "Top worker", value: "WRK_07" },
            { label: "Top supplier", value: "Supplier A" },
          ]
        : [
            { label: "Top service", value: "Cardiology" },
            { label: "Top ward", value: "Ward 4E" },
            { label: "Top scanner", value: "CT_02" },
          ],
    correlationGroups: spec.correlationGroups,
    strongestRelationship: spec.strongestRel,
    domainKnowledge: {
      recallGainPct: 11.1,
      missingEdgesRecovered: 1,
      spuriousRemoved: 0,
      validatedLinks: edges.length + 1,
      prePrecision: 1.0,
      preRecall: 0.89,
      postPrecision: 1.0,
      postRecall: 1.0,
    },
  };

  // ---- executive report ---------------------------------------
  const targetDays = round(baselineOutcome - recommendedActions[0].deltaDays);
  const report = {
    date: REPORT_DATE,
    casesAnalysed: totalEvents,
    groundTruthEffect: top.groundTruthDays,
    confoundingRemoved: naiveEffect.biasDays,
    naiveDays: naiveEffect.naiveDays,
    achievableReductionPct: recommendedActions[0].reductionPct,
    baselineDays: baselineOutcome,
    targetDays,
    primaryChain: spec.primaryChain,
    signCorrect: `${edges.filter((e) => e.planted).length}/${edges.filter((e) => e.planted).length} sign-correct`,
    methodology: spec.methodology,
    actions: recommendedActions.map((a, i) => ({
      rank: i + 1,
      action: a.title,
      impactPct: a.reductionPct,
      confidence: a.confidence >= 0.85 ? "High" : a.confidence >= 0.75 ? "Medium" : "Low",
      value: `$${Math.round(a.annualSavings / 1000)}K / yr`,
      timeline: a.timeline,
    })),
    totalCapex: recommendedActions.reduce((s, a) => s + a.capex, 0),
    roiPayback: spec.id === "manufacturing" ? "3.2 months" : "1.8 months",
    riskLevel: spec.id === "manufacturing" ? "Medium — supplier contract renegotiation required" : "Medium — clinical staffing agreements required",
  };

  // ---- cases -------------------------------------------------
  const cases = Array.from({ length: 40 }, (_, i) => {
    const entity = rng.pick(spec.entities);
    const isTopEntity = entity === spec.entities[0];
    const complexityScore = rng.int(1, 10);
    const treated = rng.bool(spec.treatedPct / 100);
    const actual = round(
      Math.max(0.4, baselineOutcome + rng.normal(isTopEntity ? 2.4 : -0.4, 2.4) + (complexityScore - 5) * 0.3),
      1,
    );
    const contributions = drivers.map((d) => {
      const controllable = d.lever !== "Pathway routing" && d.id !== "case_complexity" && d.id !== "order_complexity";
      const raw =
        d.groundTruthDays *
        (0.3 + rng.next()) *
        (isTopEntity && d.id === drivers[0].id ? 1.5 : 1) *
        (actual < baselineOutcome ? -1 : 1);
      return {
        label: d.label,
        contributionDays: round(raw, 2),
        kind: (controllable ? "controllable" : "structural") as "controllable" | "structural",
      };
    });
    contributions.sort((a, b) => Math.abs(b.contributionDays) - Math.abs(a.contributionDays));
    const controllableDays = round(contributions.filter((c) => c.kind === "controllable").reduce((s, c) => s + c.contributionDays, 0));
    const structuralDays = round(contributions.filter((c) => c.kind === "structural").reduce((s, c) => s + c.contributionDays, 0));
    const predicted = round(baselineOutcome + controllableDays + structuralDays + rng.normal(0, 0.5), 1);
    const counterfactual = round(Math.max(0.3, actual - Math.abs(contributions[0].contributionDays) * 0.7), 1);
    const idNum = String(i).padStart(4, "0");
    return {
      id: `${spec.id === "manufacturing" ? "ORD" : "ADM"}_${idNum}`,
      date: `2024-0${1 + (i % 6)}-${String(3 + (i % 24)).padStart(2, "0")}`,
      primaryEntity: entity,
      category: rng.pick(spec.categories),
      value: round(1000 + rng.next() * 90000, 0),
      actualDelayDays: actual,
      predictedDelayDays: predicted,
      counterfactualDelayDays: counterfactual,
      counterfactualLabel: spec.counterfactualLabel,
      drivers: contributions,
      similarCaseIds: [] as string[],
      populationAvg: baselineOutcome,
      percentile: 0,
      controllableDays,
      structuralDays,
      complexityScore,
      treated,
      dominantDriver: contributions[0].label,
    };
  });
  const sorted = [...cases].sort((a, b) => a.actualDelayDays - b.actualDelayDays);
  for (const c of cases) {
    c.percentile = Math.max(
      1,
      Math.round(((sorted.findIndex((s) => s.id === c.id) + 1) / cases.length) * 100),
    );
    c.similarCaseIds = cases
      .filter((o) => o.id !== c.id)
      .sort((a, b) => Math.abs(a.actualDelayDays - c.actualDelayDays) - Math.abs(b.actualDelayDays - c.actualDelayDays))
      .slice(0, 3)
      .map((o) => o.id);
  }

  // ---- sample events --------------------------------------
  const activities =
    spec.id === "manufacturing"
      ? ["Order Placed", "Supplier Confirmed", "Material Received", "Machined", "Assembled", "Dispatched", "Delivered"]
      : ["Admitted", "Triage", "Consult Requested", "Specialist Seen", "Imaging Ordered", "Diagnostics Complete", "Discharged"];
  const sampleEvents = Array.from({ length: 14 }, (_, i) => ({
    event_id: `E-${String(i + 1).padStart(5, "0")}`,
    case_id: cases[i % cases.length].id,
    activity: activities[i % activities.length],
    resource: rng.pick(spec.entities),
    timestamp: `2024-0${1 + (i % 6)}-${String(2 + i).padStart(2, "0")}T${String(8 + (i % 10)).padStart(2, "0")}:15:00Z`,
    duration_hrs: round(rng.range(0.5, 36), 1),
  }));

  // ---- object + variable summaries ----------------------
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
    { name: confounder.id, object: spec.objects[1].name, type: "numeric" as const, role: "confounder" as const, missingPct: 7 },
    {
      name: spec.outcomeVariable.toLowerCase().replace(/\s+/g, "_"),
      object: spec.objects[spec.objects.length - 1].name,
      type: "numeric" as const,
      role: "outcome" as const,
      missingPct: 0,
    },
    ...spec.extraVariables,
  ];

  const qualityPct = Math.round(objects.reduce((s, o) => s + o.qualityPct, 0) / objects.length);
  const causalLinks = edges.length + 1; // + one domain-knowledge recovered edge

  const fixture = {
    domain: spec.id,
    generatedAt: GENERATED_AT,
    scenario: {
      name: spec.scenarioName,
      outcomeVariable: spec.outcomeVariable,
      outcomeUnit: unit,
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
      objectNames: spec.objectInteractionLabels,
      baselineOutcome,
    },
    executiveSummary: {
      headline:
        spec.id === "manufacturing"
          ? "Supplier A is confirmed as the dominant causal driver of shipment delay — statistically validated, not just correlated."
          : "Specialist assignment latency is confirmed as the dominant causal driver of discharge delay — statistically validated, not just correlated.",
      confidence: "HIGH CONFIDENCE" as const,
      bullets: [
        `Recovered causal effect: ${top.effectDays} ${unit} via Double ML — the naive estimate ran ${naiveEffect.biasPct}% high due to confounding from ${confounder.label}`,
        `Discovery precision ${precision.toFixed(2)}, recall ${recall.toFixed(2)} across 20 bootstrap reruns (F1 ${f1.toFixed(2)})`,
        `Recommended action: ${recommendedActions[0].title} → ~$${Math.round(recommendedActions[0].annualSavings / 1000)}K/yr expected savings`,
      ],
      recommendedAction: recommendedActions[0].title,
      alertOutcome: spec.outcomeVariable,
      alertReductionPct: recommendedActions[0].reductionPct,
      chain: spec.primaryChain,
      riskSegment: spec.riskSegment,
    },
    kpis: {
      causalLinks,
      target: spec.outcomeVariable,
      expertRules: spec.id === "manufacturing" ? 9 : 11,
      reliabilityPct,
    },
    data: {
      datasets: 8,
      variables: variableList.length + 60,
      causalLinks,
      qualityPct,
      objects,
      variableList,
      sampleEvents,
    },
    discovery,
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
    naiveEffect,
    coefficients,
    cate,
    effectAccuracy,
    topDrivers,
    recommendedActions,
    projectedImpact: { totalReductionPct, totalReductionDays, trend },
    simulator,
    report,
    copilotCapabilities: spec.copilotCapabilities,
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
  console.log(
    `✓ ${spec.id.padEnd(14)} → ${fixture.causalGraph.edges.length} edges · ${fixture.cases.length} cases · ${fixture.simulator.levers.length} levers`,
  );
}
console.log("Done.");
