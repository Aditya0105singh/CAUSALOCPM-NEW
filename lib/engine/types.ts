import { z } from "zod";

/**
 * Shared contract for the causal fixture that the offline pipeline
 * (`scripts/build-causal-fixtures.ts`) emits and the dashboard renders.
 * Keeping the schema here means both sides fail loudly if they drift.
 */

export const DomainId = z.enum(["manufacturing", "healthcare"]);
export type DomainId = z.infer<typeof DomainId>;

export const EdgeStrength = z.enum(["strong", "moderate", "weak"]);
export type EdgeStrength = z.infer<typeof EdgeStrength>;

const GraphNode = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(["driver", "mediator", "confounder", "outcome"]),
  x: z.number(),
  y: z.number(),
});

const GraphEdge = z.object({
  source: z.string(),
  target: z.string(),
  strength: EdgeStrength,
  weight: z.number(),
  confidence: z.number(),
  discovered: z.boolean(),
  planted: z.boolean(),
});

const ObjectSummary = z.object({
  name: z.string(),
  records: z.number(),
  attributes: z.number(),
  missingPct: z.number(),
  qualityPct: z.number(),
  updated: z.string(),
});

const Variable = z.object({
  name: z.string(),
  object: z.string(),
  type: z.enum(["numeric", "categorical", "boolean", "datetime"]),
  role: z.enum(["driver", "mediator", "confounder", "outcome", "context"]),
  missingPct: z.number(),
});

const Effect = z.object({
  driver: z.string(),
  label: z.string(),
  effectDays: z.number(),
  ciLow: z.number(),
  ciHigh: z.number(),
  groundTruthDays: z.number(),
  baselineDays: z.number(),
  reductionPct: z.number(),
  method: z.string(),
});

const AccuracyBucket = z.object({ bucket: z.string(), count: z.number() });

const RecommendedAction = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  deltaDays: z.number(),
  annualSavings: z.number(),
  roi: z.number(),
  confidence: z.number(),
  lever: z.string(),
  maxShiftPct: z.number(),
  reductionPct: z.number(),
  effort: z.enum(["Low", "Medium", "High"]),
  timeline: z.string(),
  capex: z.number(),
  evidence: z.enum(["MEASURED", "ILLUSTRATIVE"]),
});

const CaseDriver = z.object({
  label: z.string(),
  contributionDays: z.number(),
  kind: z.enum(["controllable", "structural"]),
});

const CaseRecord = z.object({
  id: z.string(),
  date: z.string(),
  primaryEntity: z.string(),
  category: z.string(),
  value: z.number(),
  actualDelayDays: z.number(),
  predictedDelayDays: z.number(),
  counterfactualDelayDays: z.number(),
  counterfactualLabel: z.string(),
  drivers: z.array(CaseDriver),
  similarCaseIds: z.array(z.string()),
  populationAvg: z.number(),
  percentile: z.number(),
  controllableDays: z.number(),
  structuralDays: z.number(),
  complexityScore: z.number(),
  treated: z.boolean(),
  dominantDriver: z.string(),
});

const TrendPoint = z.object({ period: z.string(), baseline: z.number(), withActions: z.number() });

const Lever = z.object({
  id: z.string(),
  label: z.string(),
  group: z.string(),
  kind: z.enum(["slider", "toggle"]),
  min: z.number(),
  max: z.number(),
  step: z.number(),
  unit: z.string(),
  baseline: z.number(),
  /** outcome-days removed at full deflection of this lever */
  maxEffectDays: z.number(),
  mediator: z.string().optional(),
  hint: z.string(),
});

const CoefficientRow = z.object({ edge: z.string(), estimated: z.number(), groundTruth: z.number() });

const CateSegment = z.object({ label: z.string(), effect: z.number(), ciLow: z.number(), ciHigh: z.number() });

export const CausalFixture = z.object({
  domain: DomainId,
  generatedAt: z.string(),
  scenario: z.object({
    name: z.string(),
    outcomeVariable: z.string(),
    outcomeUnit: z.string(),
    org: z.string(),
    domainLabel: z.string(),
    timeRange: z.string(),
    totalEvents: z.number(),
    dataSources: z.number(),
    lastUpdated: z.string(),
    description: z.string(),
    objectTypes: z.number(),
    causalLinks: z.number(),
    reliabilityPct: z.number(),
    objectNames: z.array(z.string()),
    baselineOutcome: z.number(),
  }),
  executiveSummary: z.object({
    headline: z.string(),
    confidence: z.enum(["HIGH CONFIDENCE", "MEDIUM CONFIDENCE", "LOW CONFIDENCE"]),
    bullets: z.array(z.string()),
    recommendedAction: z.string(),
    alertOutcome: z.string(),
    alertReductionPct: z.number(),
    chain: z.array(z.string()),
    riskSegment: z.string(),
  }),
  kpis: z.object({
    causalLinks: z.number(),
    target: z.string(),
    expertRules: z.number(),
    reliabilityPct: z.number(),
  }),
  data: z.object({
    datasets: z.number(),
    variables: z.number(),
    causalLinks: z.number(),
    qualityPct: z.number(),
    objects: z.array(ObjectSummary),
    variableList: z.array(Variable),
    sampleEvents: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  }),
  discovery: z.object({
    totalEvents: z.number(),
    treatedCases: z.number(),
    treatedPct: z.number(),
    avgOutcome: z.number(),
    stdOutcome: z.number(),
    objectInstances: z.number(),
    coOccurrenceEdges: z.number(),
    avgDegree: z.number(),
    topResources: z.array(z.object({ label: z.string(), value: z.string() })),
    correlationGroups: z.array(
      z.object({
        name: z.string(),
        options: z.array(z.object({ label: z.string(), onTimePct: z.number(), delayedPct: z.number() })),
      }),
    ),
    strongestRelationship: z.object({ from: z.string(), to: z.string(), coefficient: z.number() }),
    domainKnowledge: z.object({
      recallGainPct: z.number(),
      missingEdgesRecovered: z.number(),
      spuriousRemoved: z.number(),
      validatedLinks: z.number(),
      prePrecision: z.number(),
      preRecall: z.number(),
      postPrecision: z.number(),
      postRecall: z.number(),
    }),
  }),
  causalGraph: z.object({
    nodes: z.array(GraphNode),
    edges: z.array(GraphEdge),
  }),
  discoveryMetrics: z.object({
    precision: z.number(),
    recall: z.number(),
    f1: z.number(),
    stability: z.number(),
    bootstrapRuns: z.number(),
    shd: z.number(),
    edgeStability: z.array(z.object({ edge: z.string(), frequency: z.number() })),
  }),
  effects: z.array(Effect),
  naiveEffect: z.object({
    naiveDays: z.number(),
    causalDays: z.number(),
    biasDays: z.number(),
    biasPct: z.number(),
    ciLow: z.number(),
    ciHigh: z.number(),
    method: z.string(),
  }),
  coefficients: z.array(CoefficientRow),
  cate: z.object({
    driver: z.string(),
    segmentVar: z.string(),
    ate: z.number(),
    segments: z.array(CateSegment),
    note: z.string(),
  }),
  effectAccuracy: z.array(AccuracyBucket),
  topDrivers: z.array(z.object({ label: z.string(), impactDays: z.number() })),
  recommendedActions: z.array(RecommendedAction),
  projectedImpact: z.object({
    totalReductionPct: z.number(),
    totalReductionDays: z.number(),
    trend: z.array(TrendPoint),
  }),
  simulator: z.object({
    baselineOutcome: z.number(),
    throughputBaseline: z.number(),
    riskBaseline: z.number(),
    costPerDelayDay: z.number(),
    annualVolume: z.number(),
    mediators: z.array(z.object({ name: z.string(), baseline: z.number(), unit: z.string() })),
    levers: z.array(Lever),
  }),
  report: z.object({
    date: z.string(),
    casesAnalysed: z.number(),
    groundTruthEffect: z.number(),
    confoundingRemoved: z.number(),
    naiveDays: z.number(),
    achievableReductionPct: z.number(),
    baselineDays: z.number(),
    targetDays: z.number(),
    primaryChain: z.array(z.string()),
    signCorrect: z.string(),
    methodology: z.array(z.object({ phase: z.string(), detail: z.string() })),
    actions: z.array(
      z.object({
        rank: z.number(),
        action: z.string(),
        impactPct: z.number(),
        confidence: z.string(),
        value: z.string(),
        timeline: z.string(),
      }),
    ),
    totalCapex: z.number(),
    roiPayback: z.string(),
    riskLevel: z.string(),
  }),
  copilotCapabilities: z.array(
    z.object({ icon: z.string(), title: z.string(), detail: z.string(), tags: z.array(z.string()), prompt: z.string() }),
  ),
  cases: z.array(CaseRecord),
});

export type CausalFixture = z.infer<typeof CausalFixture>;
export type GraphNode = z.infer<typeof GraphNode>;
export type GraphEdge = z.infer<typeof GraphEdge>;
export type Effect = z.infer<typeof Effect>;
export type RecommendedAction = z.infer<typeof RecommendedAction>;
export type CaseRecord = z.infer<typeof CaseRecord>;
export type ObjectSummary = z.infer<typeof ObjectSummary>;
export type Variable = z.infer<typeof Variable>;
export type Lever = z.infer<typeof Lever>;
