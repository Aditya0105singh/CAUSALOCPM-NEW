/**
 * Offline pipeline. Synthesises a deterministic causal fixture per domain from
 * the planted ground truth in `domainConfig.ts`, then validates it against the
 * shared Zod contract before writing `lib/data/<domain>.json`.
 * Run: `npm run gen:data`.
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
  const unit = spec.outcomeUnit;
  const baseline = spec.simBaseline;

  // ── causal graph ────────────────────────────────────────────────────────
  const nodes = spec.nodes.map((n) => ({ id: n.id, label: n.label, role: n.role, x: n.x, y: n.y }));
  const maxCoef = Math.max(...spec.edges.map((e) => Math.abs(e.coef)));
  const edges = spec.edges.map((e) => {
    const w = Math.abs(e.coef) / maxCoef;
    return {
      source: e.source,
      target: e.target,
      coef: e.coef,
      strength: (w > 0.6 ? "strong" : w > 0.25 ? "moderate" : "weak") as "strong" | "moderate" | "weak",
      discovered: e.discovered,
      bootstrapFreq: e.bootstrapFreq,
    };
  });

  const treatmentNode = spec.nodes.find((n) => n.role === "treatment")!;
  const outcomeNode = spec.nodes.find((n) => n.role === "outcome")!;

  // ── discovery metrics (pre-domain-knowledge, autonomous PC) ────────────
  const plantedCount = spec.edges.length;
  const discoveredAutonomously = spec.edges.filter((e) => e.discovered).length;
  const falsePositives = 0;
  const falseNegatives = plantedCount - discoveredAutonomously;
  const precision = round(discoveredAutonomously / (discoveredAutonomously + falsePositives), 2);
  const recall = round(discoveredAutonomously / plantedCount, 2);
  const f1 = round((2 * precision * recall) / (precision + recall), 2);
  const stability = 0.86;
  const reliabilityPct = 86;

  const edgeStability = edges.map((e) => ({
    edge: `${label(e.source)} → ${label(e.target)}`,
    frequency: e.bootstrapFreq,
    discovered: e.discovered,
  }));

  // ── naive vs Double ML ───────────────────────────────────────────────
  const naiveEffect = {
    naiveDays: spec.naiveEffect,
    causalDays: spec.dmlEffect,
    biasDays: round(spec.naiveEffect - spec.dmlEffect),
    biasPct: round(((spec.naiveEffect - spec.dmlEffect) / spec.dmlEffect) * 100, 1),
    ciLow: spec.dmlCiLow,
    ciHigh: spec.dmlCiHigh,
    method: "Double ML · cross-fitted gradient boosting · sandwich SEs",
  };

  // ── per-driver effects (mediators + exogenous → outcome) ─────────────
  // The mediated treatment effect plus each direct edge into the outcome.
  const outcomeParents = spec.edges.filter((e) => e.target === outcomeNode.id);
  const effects = [
    {
      driver: treatmentNode.id,
      label: treatmentNode.label,
      effectDays: spec.dmlEffect,
      ciLow: spec.dmlCiLow,
      ciHigh: spec.dmlCiHigh,
      groundTruthDays: spec.trueEffect,
      naiveDays: spec.naiveEffect,
      method: "Double ML + backdoor adjustment (mediated path)",
    },
    ...outcomeParents
      .filter((e) => e.source !== treatmentNode.id)
      .map((e) => {
        const gt = Math.abs(e.coef) * (spec.id === "manufacturing" ? 3.2 : 3.6);
        const est = round(gt + rng.normal(0, 0.04));
        const ciHalf = 0.05 + rng.next() * 0.08;
        return {
          driver: e.source,
          label: label(e.source),
          effectDays: est,
          ciLow: round(est - ciHalf),
          ciHigh: round(est + ciHalf),
          groundTruthDays: round(gt),
          naiveDays: round(gt * (1 + rng.next() * 0.12)),
          method: "Structural coefficient · Double ML",
        };
      }),
  ].sort((a, b) => b.effectDays - a.effectDays);

  const topDrivers = effects.map((e) => ({ label: e.label, impactDays: e.effectDays }));

  const effectAccuracy = [
    { bucket: "0–0.1", count: Math.max(1, effects.length - 2) },
    { bucket: "0.1–0.2", count: 2 },
    { bucket: "0.2–0.3", count: 1 },
    { bucket: "0.3–0.5", count: 0 },
    { bucket: "0.5+", count: 0 },
  ];

  // ── coefficients (estimated vs planted ground truth) ─────────────────
  const coefficients = spec.edges.map((e) => {
    const noise = rng.normal(0, Math.abs(e.coef) * 0.03 + 0.02);
    return {
      edge: `${label(e.source)} → ${label(e.target)}`,
      estimated: round(e.coef + noise),
      groundTruth: e.coef,
    };
  });

  // ── CATE ────────────────────────────────────────────────────────────
  const ate = round(0.03 + rng.next() * 0.04);
  const cate = {
    driver: spec.treatmentLabel,
    segmentVar: spec.moderatorLabel,
    ate,
    segments: spec.cateSegments.map((s) => {
      const effect = round(ate + s.mult * 0.16);
      const ciHalf = 0.04 + rng.next() * 0.05;
      return { label: s.label, effect, ciLow: round(effect - ciHalf), ciHigh: round(effect + ciHalf) };
    }),
    note: `The causal effect of ${spec.treatmentLabel} is concentrated in the High ${spec.moderatorLabel} segment — targeted interventions would return more there than in low-complexity cases.`,
  };

  const sensitivity = {
    ...spec.sensitivity,
    reportedEstimate: spec.dmlEffect,
    placeboEffect: spec.sensitivity.placeboEffect,
  };

  // ── recommended actions & projected impact ──────────────────────────
  const recommendedActions = spec.actions.map((a) => {
    const deltaDays = round((a.reductionPct / 100) * baseline);
    return {
      id: a.id,
      title: a.title,
      detail: a.detail,
      deltaDays,
      reductionPct: a.reductionPct,
      annualSavings: a.annualSavings,
      roi: round(a.annualSavings / Math.max(a.capex, 1), 1),
      confidence: a.confidence,
      effort: a.effort,
      timeline: a.timeline,
      capex: a.capex,
      evidence: a.evidence,
      lever: a.lever,
    };
  });
  const totalReductionDays = round(recommendedActions.reduce((s, a) => s + a.deltaDays, 0));
  const totalReductionPct = round((totalReductionDays / baseline) * 100, 0);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const trend = months.map((m, i) => {
    const b = round(baseline + rng.normal(0, 0.3));
    return { period: m, baseline: b, withActions: round(b - totalReductionDays * (0.4 + i * 0.12)) };
  });

  // ── simulator ───────────────────────────────────────────────────────
  const mediators =
    spec.id === "manufacturing"
      ? [
          { name: "Material Lead Time", baseline: 7.2, unit: "days" },
          { name: "Machine Queue Length", baseline: 3.1, unit: "units" },
          { name: "Approval Duration", baseline: 2.4, unit: "days" },
        ]
      : [
          { name: "Treatment Duration", baseline: 7.6, unit: "days" },
          { name: "Bed Occupancy Rate", baseline: 78, unit: "%" },
          { name: "Approval Wait", baseline: 4.4, unit: "days" },
        ];

  const simulator = {
    baselineOutcome: baseline,
    outcomeLabel: spec.outcomeVariable,
    throughputBaseline: 100,
    riskBaseline: 45,
    costPerDelayDay: spec.id === "manufacturing" ? 1200 : 1500,
    annualVolume: spec.id === "manufacturing" ? 3000 : 2000,
    mediators,
    levers: spec.levers,
  };

  // ── discovery walkthrough numbers ───────────────────────────────────
  const totalEvents = spec.totalEvents;
  const treatedCases = Math.round((totalEvents * spec.treatedPct) / 100);
  const objectInstances = spec.id === "manufacturing" ? 30025 : 41180;
  const coOccurrenceEdges = spec.id === "manufacturing" ? 105166 : 138420;
  const discovery = {
    totalEvents,
    treatedCases,
    treatedPct: spec.treatedPct,
    avgOutcome: spec.outcomeMean,
    stdOutcome: spec.outcomeStd,
    objectInstances,
    coOccurrenceEdges,
    avgDegree: round((coOccurrenceEdges * 2) / objectInstances),
    topResources: spec.topResources,
    correlationGroups: spec.correlationGroups,
    strongestRelationship: { from: spec.strongestRel.from, to: spec.strongestRel.to, coefficient: spec.strongestRel.coef },
  };

  const pipelinePerf = {
    postPrecision: 1.0,
    preRecall: recall,
    postRecall: 1.0,
    signConsistency: 1.0,
    avgModelR2: spec.id === "manufacturing" ? 0.897 : 0.881,
    coeffAccuracy: spec.id === "manufacturing" ? 0.936 : 0.921,
    recallGainPct: round((1 - recall) * 100, 1),
    missingEdgesRecovered: falseNegatives,
    spuriousRemoved: 0,
    validatedLinks: plantedCount,
  };

  // ── executive report ───────────────────────────────────────────────
  const targetDays = round(baseline - recommendedActions[0].deltaDays);
  const report = {
    date: REPORT_DATE,
    casesAnalysed: totalEvents,
    groundTruthEffect: spec.trueEffect,
    dmlEffect: spec.dmlEffect,
    confoundingRemoved: naiveEffect.biasDays,
    naiveDays: naiveEffect.naiveDays,
    achievableReductionPct: recommendedActions[0].reductionPct,
    baselineDays: baseline,
    targetDays,
    primaryChain: spec.chain,
    signConsistency: `${plantedCount}/${plantedCount} sign-correct`,
    methodology: spec.methodology,
    actions: recommendedActions.map((a, i) => ({
      rank: i + 1,
      action: a.title,
      impactPct: a.reductionPct,
      confidence: a.confidence,
      value: `$${Math.round(a.annualSavings / 1000)}K / yr`,
      timeline: a.timeline,
    })),
    totalCapex: recommendedActions.reduce((s, a) => s + a.capex, 0),
    roiPayback: spec.id === "manufacturing" ? "3.2 months" : "1.8 months",
    riskLevel:
      spec.id === "manufacturing"
        ? "Medium — supplier contract renegotiation required"
        : "Medium — clinical staffing agreements required",
  };

  const crossDomain = [
    { domain: "Manufacturing", precision: 1.0, recall: 0.89, f1: 0.94, naive: DOMAINS.manufacturing.naiveEffect, causal: DOMAINS.manufacturing.dmlEffect, eValue: DOMAINS.manufacturing.sensitivity.eValue },
    { domain: "Healthcare", precision: 1.0, recall: 0.89, f1: 0.94, naive: DOMAINS.healthcare.naiveEffect, causal: DOMAINS.healthcare.dmlEffect, eValue: DOMAINS.healthcare.sensitivity.eValue },
  ];

  // ── cases ──────────────────────────────────────────────────────────
  const contribDrivers = effects.slice(0, 4);
  const cases = Array.from({ length: 40 }, (_, i) => {
    const entity = rng.pick(spec.entities);
    const isTop = entity === spec.entities[0];
    const complexityScore = rng.int(1, 10);
    const treated = rng.bool(spec.treatedPct / 100);
    const actual = round(
      Math.max(0.4, baseline + rng.normal(isTop ? 2.2 : -0.5, 2.2) + (complexityScore - 5) * 0.3),
      1,
    );
    const drivers = contribDrivers.map((dr, j) => {
      const controllable = j !== contribDrivers.length - 1; // last (complexity-ish) is structural
      const raw =
        dr.effectDays *
        (0.3 + rng.next()) *
        (isTop && j === 0 ? 1.4 : 1) *
        (actual < baseline ? -1 : 1);
      return {
        label: dr.label,
        contributionDays: round(raw),
        kind: (controllable ? "controllable" : "structural") as "controllable" | "structural",
      };
    });
    drivers.sort((a, b) => Math.abs(b.contributionDays) - Math.abs(a.contributionDays));
    const controllableDays = round(drivers.filter((d) => d.kind === "controllable").reduce((s, d) => s + d.contributionDays, 0));
    const structuralDays = round(drivers.filter((d) => d.kind === "structural").reduce((s, d) => s + d.contributionDays, 0));
    const predicted = round(baseline + controllableDays + structuralDays + rng.normal(0, 0.5), 1);
    const counterfactual = round(Math.max(0.3, actual - Math.abs(drivers[0].contributionDays) * 0.7), 1);
    return {
      id: `${spec.id === "manufacturing" ? "ORD" : "ADM"}_${String(i).padStart(4, "0")}`,
      date: `2024-0${1 + (i % 6)}-${String(3 + (i % 24)).padStart(2, "0")}`,
      primaryEntity: entity,
      category: rng.pick(spec.categories),
      value: round(1000 + rng.next() * 90000, 0),
      actualDelayDays: actual,
      predictedDelayDays: predicted,
      counterfactualDelayDays: counterfactual,
      counterfactualLabel:
        spec.id === "manufacturing"
          ? "If procurement had been re-routed to Supplier B"
          : "If the specialist consult had happened within 12 hours",
      drivers,
      similarCaseIds: [] as string[],
      populationAvg: baseline,
      percentile: 0,
      controllableDays,
      structuralDays,
      complexityScore,
      treated,
      dominantDriver: drivers[0].label,
    };
  });
  const sortedByDelay = [...cases].sort((a, b) => a.actualDelayDays - b.actualDelayDays);
  for (const c of cases) {
    c.percentile = Math.max(1, Math.round(((sortedByDelay.findIndex((s) => s.id === c.id) + 1) / cases.length) * 100));
    c.similarCaseIds = cases
      .filter((o) => o.id !== c.id)
      .sort((a, b) => Math.abs(a.actualDelayDays - c.actualDelayDays) - Math.abs(b.actualDelayDays - c.actualDelayDays))
      .slice(0, 3)
      .map((o) => o.id);
  }

  // ── objects / variables / events ───────────────────────────────────
  const objects = spec.objects.map((o) => ({
    name: o.name,
    records: o.records,
    attributes: o.attributes,
    missingPct: o.missingPct,
    qualityPct: o.qualityPct,
    updated: `${o.updatedHrs}h ago`,
  }));
  const roleMap: Record<string, "treatment" | "mediator" | "confounder" | "outcome" | "exogenous"> = {
    treatment: "treatment",
    mediator: "mediator",
    confounder: "confounder",
    outcome: "outcome",
    exogenous: "exogenous",
  };
  const variableList = spec.nodes.map((n, i) => ({
    name: n.id,
    object: spec.objects[i % spec.objects.length].name,
    type: (n.role === "treatment" || n.role === "exogenous" ? "boolean" : "numeric") as "numeric" | "boolean",
    role: roleMap[n.role],
    missingPct: round(rng.range(0, 6), 0),
  }));
  const activities =
    spec.id === "manufacturing"
      ? ["order_placed", "material_received", "production_started", "quality_check", "shipment_dispatched"]
      : ["admitted", "triage", "specialist_review", "diagnostics", "discharge_planning", "discharged"];
  const sampleEvents = Array.from({ length: 14 }, (_, i) => ({
    event_id: `E-${String(i + 1).padStart(5, "0")}`,
    case_id: cases[i % cases.length].id,
    activity: activities[i % activities.length],
    resource: rng.pick(spec.entities),
    timestamp: `2024-0${1 + (i % 6)}-${String(2 + i).padStart(2, "0")}T${String(8 + (i % 10)).padStart(2, "0")}:15:00Z`,
    duration_hrs: round(rng.range(0.5, 36), 1),
  }));

  const qualityPct = Math.round(objects.reduce((s, o) => s + o.qualityPct, 0) / objects.length);
  const causalLinks = plantedCount; // planted = validated after domain knowledge
  const expertRules = spec.id === "manufacturing" ? 9 : 11;

  const fixture = {
    domain: spec.id,
    generatedAt: GENERATED_AT,
    scenario: {
      name: spec.scenarioName,
      outcomeVariable: spec.outcomeVariable,
      outcomeUnit: unit,
      treatmentLabel: spec.treatmentLabel,
      confounderLabel: spec.confounderLabel,
      moderatorLabel: spec.moderatorLabel,
      org: spec.org,
      domainLabel: spec.domainLabel,
      timeRange: spec.timeRange,
      totalEvents,
      treatedCases,
      treatedPct: spec.treatedPct,
      dataSources: 8,
      lastUpdated: "2 hours ago",
      description: spec.description,
      objectTypes: spec.objects.length,
      causalLinks,
      reliabilityPct,
      objectNames: spec.objectInteractionLabels,
      simBaseline: baseline,
      outcomeMean: spec.outcomeMean,
      outcomeStd: spec.outcomeStd,
    },
    executiveSummary: {
      headline:
        spec.id === "manufacturing"
          ? "Supplier A dependency is the dominant causal driver of shipment delay — statistically validated, not just correlated."
          : "Specialist assignment is the dominant causal driver of length of stay — statistically validated, not just correlated.",
      confidence: "HIGH CONFIDENCE" as const,
      bullets: [
        `Recovered causal effect: ${spec.dmlEffect} ${unit} via Double ML — the naive estimate ran ${naiveEffect.biasPct}% high on confounding from ${spec.confounderLabel}`,
        `Discovery precision ${precision.toFixed(2)}, recall ${recall.toFixed(2)} across ${20} bootstrap reruns (F1 ${f1.toFixed(2)}); domain knowledge recovered the ${falseNegatives} nonlinear edge autonomous PC missed`,
        `Recommended action: ${recommendedActions[0].title} → ~$${Math.round(recommendedActions[0].annualSavings / 1000)}K/yr expected savings, payback ${report.roiPayback}`,
        `E-value ${spec.sensitivity.eValue} — an unmeasured confounder would need that strength on both treatment and outcome to nullify the effect`,
      ],
      recommendedAction: recommendedActions[0].title,
      alertOutcome: spec.outcomeVariable,
      alertReductionPct: recommendedActions[0].reductionPct,
      chain: spec.chain,
      riskSegment: spec.riskSegment,
    },
    kpis: { causalLinks, target: spec.outcomeVariable, expertRules, reliabilityPct },
    discoveryMetrics: {
      precision,
      recall,
      f1,
      stability,
      bootstrapRuns: 20,
      shd: falsePositives + falseNegatives,
      truePositives: discoveredAutonomously,
      falsePositives,
      falseNegatives,
      edgeStability,
    },
    pipelinePerf,
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
    effects,
    naiveEffect,
    coefficients,
    cate,
    sensitivity,
    effectAccuracy,
    topDrivers,
    recommendedActions,
    projectedImpact: { totalReductionPct, totalReductionDays, trend },
    simulator,
    report,
    crossDomain,
    copilot: {
      chips: spec.copilotChips,
      followUps: spec.copilotFollowUps,
      capabilities: spec.copilotCapabilities,
    },
    cases,
  };

  return CausalFixture.parse(fixture);

  function label(id: string) {
    return spec.nodes.find((n) => n.id === id)?.label ?? id;
  }
}

mkdirSync(OUT_DIR, { recursive: true });
for (const spec of Object.values(DOMAINS)) {
  const fixture = build(spec);
  writeFileSync(join(OUT_DIR, `${spec.id}.json`), JSON.stringify(fixture, null, 2));
  console.log(
    `✓ ${spec.id.padEnd(14)} → ${fixture.causalGraph.edges.length} edges · ${fixture.cases.length} cases · ${fixture.simulator.levers.length} levers · precision ${fixture.discoveryMetrics.precision} recall ${fixture.discoveryMetrics.recall}`,
  );
}
console.log("Done.");
