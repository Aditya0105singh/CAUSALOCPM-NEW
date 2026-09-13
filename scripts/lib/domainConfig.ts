/**
 * Per-domain narrative + causal ground truth for the offline fixture builder.
 *
 * The causal structure mirrors the reference CausalOCPM pipeline's planted DAGs
 * (data/generate_data.py + generate_healthcare.py): a confounder driving both
 * treatment selection and the outcome, plus a mediated true causal path.
 * No PRIHIR — the manufacturing tenant is "Atlas Precision Aerostructures".
 */

export type NodeRole = "confounder" | "treatment" | "mediator" | "exogenous" | "outcome";

export interface DagNode {
  id: string;
  label: string;
  role: NodeRole;
  x: number; // 0..8 grid
  y: number; // 0..5 grid
}

export interface DagEdge {
  source: string;
  target: string;
  coef: number; // planted structural coefficient
  /** true = discovered autonomously by bootstrapped PC; false = recovered only via domain knowledge */
  discovered: boolean;
  bootstrapFreq: number;
}

export interface LeverSpec {
  id: string;
  label: string;
  group: string;
  kind: "slider" | "toggle" | "mode";
  min: number;
  max: number;
  step: number;
  unit: string;
  baseline: number;
  modes?: string[];
  hint: string;
}

export interface DomainSpec {
  id: "manufacturing" | "healthcare";
  domainLabel: string;
  org: string;
  scenarioName: string;
  outcomeVariable: string;
  outcomeUnit: string;
  treatmentLabel: string;
  confounderLabel: string;
  moderatorLabel: string;
  timeRange: string;
  description: string;
  totalEvents: number;
  treatedPct: number;
  outcomeMean: number;
  outcomeStd: number;
  simBaseline: number;

  trueEffect: number; // planted TRUE causal effect (mediated product)
  naiveEffect: number; // confounded group-mean difference shown in UI
  dmlEffect: number; // Double ML recovered estimate
  dmlCiLow: number;
  dmlCiHigh: number;

  nodes: DagNode[];
  edges: DagEdge[];
  /** edges autonomous PC wrongly retained above the bootstrap threshold, then domain knowledge pruned */
  spuriousEdges: { source: string; target: string; bootstrapFreq: number; why: string }[];
  chain: string[]; // headline causal chain (labels)
  strongestRel: { from: string; to: string; coef: number };
  /** structural coefficients whose recovered 95% CI crosses zero (sign not statistically certain) */
  signUncertainEdges: string[];
  avgModelR2: number;
  avgCoefErrorPct: number;
  /** 10 fresh datasets from the same causal structure, full pipeline on each */
  seedRobustness: { nSeeds: number; causalMean: number; causalStd: number; causalLo: number; causalHi: number; naiveLo: number; naiveHi: number };

  objects: { name: string; records: number; attributes: number; missingPct: number; qualityPct: number; updatedHrs: number }[];
  objectInteractionLabels: string[];
  topResources: { label: string; value: string }[];

  correlationGroups: { name: string; options: { label: string; onTimePct: number; delayedPct: number }[] }[];

  entities: string[];
  categories: string[];
  riskSegment: string;

  cateSegments: { label: string; effect: number; ciLow: number; ciHigh: number }[];
  cateAte: number;
  cateNote: string;

  sensitivity: {
    placeboEffect: number;
    placeboPass: boolean;
    randomCauseEstimate: number;
    randomCauseStable: boolean;
    eValue: number;
    strengths: number[]; // fraction
    estimatesUnderConfounding: number[];
    verdict: string;
  };

  levers: LeverSpec[];

  actions: {
    id: string;
    title: string;
    detail: string;
    reductionPct: number;
    evidence: "MEASURED" | "ILLUSTRATIVE";
    confidence: "High" | "Medium";
    effort: "Low" | "Medium" | "High";
    timeline: string;
    capex: number;
    annualSavings: number;
    lever: string;
  }[];

  copilotChips: { key: string; label: string; icon: string }[];
  copilotFollowUps: Record<string, string[]>;
  copilotCapabilities: { icon: string; title: string; detail: string; tags: string[]; prompt: string }[];
  copilotSeed: { q: string; a: string }[];

  methodology: { phase: string; detail: string }[];

  /** The agentic-AI framing: the autonomous decision this audit layer watches. */
  narrative: {
    agentName: string; // "Sourcing Agent"
    agentRole: string; // one-liner on what the agent does
    decisionLabel: string; // "Selected Halcyon Forge"
    altLabel: string; // "Meridian Tool & Die" — the counterfactual choice
    outcomeLabel: string; // "Shipment delayed"
    /** what the agent's inputs weighed (sums to ~1); the confounder is deliberately under-weighted */
    agentSignals: { label: string; weight: number }[];
    /** what the agent's inputs never captured — the causal structure */
    agentBlindSpots: string[];
    /** supply-chain / care-pathway stages for the live twin, in order */
    stages: { id: string; label: string; agent?: string }[];
    /** the incident that propagates through the twin */
    incident: {
      trigger: string;
      steps: { stageId: string; t: string; note: string; sev: "ok" | "warn" | "crit" }[];
    };
  };
}

/* ────────────────────────────────────────────────────────────────────────── */

export const DOMAINS: Record<DomainSpec["id"], DomainSpec> = {
  manufacturing: {
    id: "manufacturing",
    domainLabel: "Precision Manufacturing",
    org: "Atlas Precision Aerostructures",
    scenarioName: "Line-Side Delivery Delay Analysis",
    outcomeVariable: "Line-Side Delivery Delay",
    outcomeUnit: "days",
    treatmentLabel: "Halcyon Forge Dependency",
    confounderLabel: "Spec Complexity",
    moderatorLabel: "Spec Complexity",
    timeRange: "Jan 2023 – Apr 2024",
    description:
      "Traditional process mining would read Halcyon Forge's raw correlation with delay and re-source away from it. But tight-tolerance orders are preferentially routed to Halcyon — the only forge qualified for them — and are inherently slower to machine, regardless of supplier. CausalOCPM isolates the true causal effect of Halcyon Forge dependency on line-side delivery delay.",
    totalEvents: 20000,
    treatedPct: 33,
    outcomeMean: 9.3,
    outcomeStd: 4.92,
    simBaseline: 9.3,

    // All values below are the ACTUAL outputs of a from-scratch run of
    // scripts/reference/atlas-manufacturing/{generate_data,validate}.py —
    // real bootstrapped PC (causal-learn) + real Double ML (cross-fitted
    // sklearn GBM nuisance models, sandwich SEs) on a freshly generated
    // 20,000-row synthetic log (seed 71831), captured 2026-09-13. See
    // docs/reference-run/atlas-manufacturing/validate-report.txt.
    trueEffect: 5.78, // 6.8 × 0.85 mediated path (planted)
    naiveEffect: 7.61, // real group-mean difference (validate.py: 7.605)
    dmlEffect: 6.18, // Double ML point estimate (validate.py: 6.175, error 6.8%)
    dmlCiLow: 6.08, // validate.py 95% CI [6.077, 6.272]
    dmlCiHigh: 6.27,

    nodes: [
      { id: "order_complexity", label: "Spec Complexity", role: "confounder", x: 0, y: 2.6 },
      { id: "supplier_a", label: "Halcyon Forge Dependency", role: "treatment", x: 0, y: 0 },
      { id: "material_lead_time", label: "Material Lead Time", role: "mediator", x: 2.6, y: 0 },
      { id: "machine_queue_length", label: "Machine Queue Length", role: "mediator", x: 2.6, y: 2.6 },
      { id: "export_flag", label: "Export Flag", role: "exogenous", x: 2.6, y: 4.6 },
      { id: "approval_duration", label: "Approval Duration", role: "mediator", x: 5.2, y: 1.8 },
      { id: "carrier_express", label: "Express Carrier", role: "exogenous", x: 5.2, y: 0 },
      { id: "shipment_delay", label: "Line-Side Delivery Delay", role: "outcome", x: 7.8, y: 1.8 },
    ],
    // Discovery result matches the fresh run exactly: bootstrapped PC recovers
    // 8 of 9 edges (precision 1.00, recall 0.889, F1 0.941), no spurious edges;
    // only the order_complexity → supplier_a edge is missed — it's a THRESHOLD
    // effect (flat below the tight-tolerance cutoff, then a step up), not a
    // smooth trend, so it barely moves a linear (Fisher-Z) test even though
    // the dependency is real and strong.
    edges: [
      { source: "order_complexity", target: "supplier_a", coef: 0.58, discovered: false, bootstrapFreq: 0.3 },
      { source: "order_complexity", target: "machine_queue_length", coef: 0.72, discovered: true, bootstrapFreq: 1.0 },
      { source: "order_complexity", target: "shipment_delay", coef: 0.32, discovered: true, bootstrapFreq: 1.0 },
      { source: "supplier_a", target: "material_lead_time", coef: 6.8, discovered: true, bootstrapFreq: 1.0 },
      { source: "material_lead_time", target: "shipment_delay", coef: 0.85, discovered: true, bootstrapFreq: 1.0 },
      { source: "machine_queue_length", target: "approval_duration", coef: 1.15, discovered: true, bootstrapFreq: 1.0 },
      { source: "export_flag", target: "approval_duration", coef: 1.85, discovered: true, bootstrapFreq: 1.0 },
      { source: "approval_duration", target: "shipment_delay", coef: 0.58, discovered: true, bootstrapFreq: 1.0 },
      { source: "carrier_express", target: "shipment_delay", coef: -0.58, discovered: true, bootstrapFreq: 0.8 },
    ],
    spuriousEdges: [],
    signUncertainEdges: [],
    avgModelR2: 0.73, // real 5-fold CV-R² of the outcome model (validate.py: 0.734)
    avgCoefErrorPct: 3.2, // real avg structural-coefficient recovery error (validate.py: 3.15%)
    seedRobustness: { nSeeds: 10, causalMean: 6.1, causalStd: 0.039, causalLo: 6.06, causalHi: 6.18, naiveLo: 7.43, naiveHi: 7.56 },
    chain: ["Spec Complexity", "Halcyon Forge", "Material Lead Time", "Line-Side Delivery Delay"],
    strongestRel: { from: "Halcyon Forge", to: "Material Lead Time", coef: 6.8 },

    objects: [
      { name: "Orders", records: 20000, attributes: 12, missingPct: 3, qualityPct: 96, updatedHrs: 2 },
      { name: "Machines", records: 8, attributes: 14, missingPct: 4, qualityPct: 97, updatedHrs: 2 },
      { name: "Workers", records: 15, attributes: 9, missingPct: 5, qualityPct: 95, updatedHrs: 6 },
      { name: "Materials", records: 20000, attributes: 11, missingPct: 5, qualityPct: 95, updatedHrs: 4 },
      { name: "Shipments", records: 20000, attributes: 10, missingPct: 4, qualityPct: 97, updatedHrs: 2 },
    ],
    objectInteractionLabels: ["Orders", "Machines", "Workers", "Materials", "Shipments"],
    topResources: [
      { label: "Top machine", value: "MCH_01" },
      { label: "Top worker", value: "WRK_07" },
      { label: "Treatment arm", value: "HLF_01 · 33%" },
    ],
    correlationGroups: [
      { name: "Supplier", options: [ { label: "Halcyon Forge", onTimePct: 55, delayedPct: 45 }, { label: "Meridian Tool & Die", onTimePct: 82, delayedPct: 18 } ] },
      { name: "Carrier", options: [ { label: "Standard", onTimePct: 66, delayedPct: 34 }, { label: "Express", onTimePct: 87, delayedPct: 13 } ] },
    ],
    // The sourcing network: Halcyon is the hero case (confounded — looks slow,
    // isn't really); Meridian is the validated counterfactual alternative;
    // Vantage and Solaris are held-back depth material — a small, newer
    // supplier whose one bad month is noise rather than signal, and a
    // consistently-fast supplier that's never been tested on hard orders
    // (see the CATE segments below — its apparent edge would not survive
    // high-complexity work). Same four names surface as case primaryEntity.
    entities: ["Halcyon Forge", "Meridian Tool & Die", "Vantage Alloys", "Solaris Components"],
    categories: ["Turbine Brackets", "Titanium Forgings", "Composite Panels", "Fastener Sets", "Avionics Housings"],
    riskSegment: "Halcyon Forge · tight-tolerance orders",

    // Real CATE from validate.py: total effect of Halcyon dependency,
    // estimated separately within each spec-complexity tertile. Stable at
    // low/mid complexity, then rises sharply in the high-complexity segment —
    // exactly where the threshold effect concentrates Halcyon's book.
    cateSegments: [
      { label: "Low (1.0–2.6)", effect: 6.37, ciLow: 6.21, ciHigh: 6.53 },
      { label: "Mid (2.6–4.8)", effect: 6.11, ciLow: 5.94, ciHigh: 6.27 },
      { label: "High (4.8–10.0)", effect: 7.51, ciLow: 7.36, ciHigh: 7.65 },
    ],
    cateAte: 6.18,
    cateNote:
      "The effect is fairly stable at low and mid complexity, then rises sharply in the high-complexity segment — the tight-tolerance orders where Halcyon becomes the only qualified forge and the true delay penalty is largest. Any supplier's apparent edge on easy work is untested on hard work until this trend is checked.",

    // Real, computed sensitivity output from the fresh Atlas run — placebo
    // permutation, a random-common-cause refuter, a VanderWeele E-value, and
    // an injected-hidden-confounder sweep (see validate.py).
    sensitivity: {
      placeboEffect: -0.01, // real: -0.009 days (permuted treatment ≈ 0)
      placeboPass: true,
      randomCauseEstimate: 6.17, // add a random common cause → 6.169, stable
      randomCauseStable: true,
      eValue: 5.7, // VanderWeele E-value from the standardized effect
      strengths: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3],
      estimatesUnderConfounding: [5.61, 5.37, 5.01, 4.82, 4.63, 4.6],
      verdict:
        "The recovered effect stays positive across an injected-hidden-confounder sweep out to 30% strength (6.18 → 4.60 days). Placebo test -0.01 ≈ 0; adding a random common cause re-estimates 6.17. VanderWeele E-value ≈ 5.7 — a hidden confounder would need a risk-ratio association above 5.7 with both treatment and outcome to nullify the effect.",
    },

    levers: [
      { id: "supplier_reliability_pct", label: "Meridian Tool & Die Allocation", group: "Sourcing", kind: "slider", min: 0, max: 100, step: 5, unit: "%", baseline: 40, hint: "60% of volume currently goes to Halcyon Forge. Shift more to Meridian Tool & Die." },
      { id: "export_flag_reduction", label: "Streamline Export Documentation", group: "Sourcing", kind: "toggle", min: 0, max: 1, step: 1, unit: "", baseline: 0, hint: "Reduces export-related approval delay ~35%." },
      { id: "machine_capacity_expanded", label: "Expand Machine Capacity", group: "Machine & Capacity", kind: "toggle", min: 0, max: 1, step: 1, unit: "", baseline: 0, hint: "Adds processing units — reduces machine queue ~40%." },
      { id: "additional_workforce", label: "Additional Workforce", group: "Machine & Capacity", kind: "slider", min: 0, max: 20, step: 1, unit: "FTE", baseline: 0, hint: "Each additional worker reduces queue ~0.3 units." },
      { id: "approval_automation", label: "Automate Approval Steps", group: "Approvals & Process", kind: "toggle", min: 0, max: 1, step: 1, unit: "", baseline: 0, hint: "Reduces approval duration ~50%." },
      { id: "order_batching", label: "Enable Order Batching", group: "Approvals & Process", kind: "toggle", min: 0, max: 1, step: 1, unit: "", baseline: 0, hint: "Smooths order-complexity spikes ~20%." },
      { id: "carrier_express_pct", label: "Express Carrier Usage", group: "Logistics & Delivery", kind: "slider", min: 0, max: 100, step: 5, unit: "%", baseline: 15, hint: "Each 10% increase reduces delay ~0.08 days." },
      { id: "material_lead_time_mode", label: "Material Lead Time Strategy", group: "Logistics & Delivery", kind: "mode", min: 0, max: 2, step: 1, unit: "", baseline: 0, modes: ["Current", "Reduced (−20%)", "Optimised (−40%)"], hint: "Negotiate faster material delivery contracts." },
    ],

    actions: [
      { id: "act-1", title: "Shift ~25% sourcing from Halcyon Forge to Meridian Tool & Die", detail: "Halcyon Forge dependency is the dominant causal driver via Material Lead Time. Re-routing a quarter of volume to Meridian Tool & Die cuts exposure without breaching capacity.", reductionPct: 17, evidence: "MEASURED", confidence: "High", effort: "Medium", timeline: "Immediate", capex: 54000, annualSavings: 410000, lever: "supplier_reliability_pct" },
      { id: "act-2", title: "Automate export approval + reduce flag routing", detail: "Approval duration sits on the critical path. Automating export documentation routing removes most of the queueing delay.", reductionPct: 7.5, evidence: "ILLUSTRATIVE", confidence: "Medium", effort: "Low", timeline: "30 days", capex: 45000, annualSavings: 175000, lever: "approval_automation" },
      { id: "act-3", title: "Expand machine buffer capacity (≥20%)", detail: "Added buffer capacity absorbs queue spikes on the two most-loaded machine groups.", reductionPct: 3.1, evidence: "ILLUSTRATIVE", confidence: "High", effort: "High", timeline: "60 days", capex: 126000, annualSavings: 72000, lever: "machine_capacity_expanded" },
    ],

    copilotChips: [
      { key: "delays", label: "Why are delays increasing?", icon: "trend" },
      { key: "bottleneck", label: "What is the top bottleneck?", icon: "alert" },
      { key: "intervention", label: "Best intervention?", icon: "bulb" },
      { key: "suppliers", label: "Compare suppliers", icon: "swap" },
      { key: "chain", label: "Explain causal chain", icon: "link" },
      { key: "impact", label: "Predict impact of changes", icon: "chart" },
      { key: "executive", label: "Executive summary", icon: "doc" },
    ],
    copilotFollowUps: {
      delays: ["Best intervention?", "Explain causal chain", "Predict impact of changes"],
      bottleneck: ["Why are delays increasing?", "Best intervention?", "Compare suppliers"],
      intervention: ["Predict impact of changes", "What are the ROI opportunities?", "Compare suppliers"],
      suppliers: ["Why are delays increasing?", "Best intervention?", "Predict impact of changes"],
      chain: ["What is the top bottleneck?", "Best intervention?", "Executive summary"],
      impact: ["What are the ROI opportunities?", "Executive summary", "Compare suppliers"],
      executive: ["Best intervention?", "What are the ROI opportunities?", "Explain causal chain"],
      custom: ["Best intervention?", "Executive summary", "What is the top bottleneck?"],
    },
    copilotCapabilities: [
      { icon: "alert", title: "What is the top bottleneck?", detail: "Identify the most impactful constraint", tags: ["Bottleneck Analysis", "Root Cause"], prompt: "What is the top bottleneck?" },
      { icon: "chart", title: "Show causal KPI impact", detail: "See which factors drive shipment delay", tags: ["Causal Impact", "KPI Analysis"], prompt: "Which factors have the largest causal impact on shipment delay?" },
      { icon: "flask", title: "Run a what-if simulation", detail: "Test interventions & predict outcomes", tags: ["Simulation", "Forecasting"], prompt: "Predict impact of changes" },
      { icon: "doc", title: "Generate executive summary", detail: "AI-powered insights & recommendations", tags: ["AI Summary", "Insights"], prompt: "Executive summary" },
    ],
    copilotSeed: [
      { q: "Why are delays increasing?", a: "Line-side delivery delay is driven primarily by Halcyon Forge dependency, which raises Material Lead Time by 6.8 days on the treated arm; that flows through to delay with a 0.85 coefficient. Spec complexity (the confounder) inflates the raw correlation. The recovered causal effect of Halcyon Forge is +6.18 days (95% CI 6.08–6.27), a 6.8% error vs the planted ground truth of 5.78." },
      { q: "What is the top bottleneck?", a: "Material Lead Time is the binding constraint — the mediator between Halcyon Forge and Line-Side Delivery Delay. Every downstream action (approval automation, buffer capacity) moves the needle far less than re-sourcing does." },
      { q: "Best intervention?", a: "Shift ~25% sourcing from Halcyon Forge to Meridian Tool & Die: ~17% delay reduction, ~$410K/year expected savings at High confidence, payback ≈ 1.6 months." },
      { q: "Explain causal chain", a: "Spec Complexity → Halcyon Forge → Material Lead Time → Line-Side Delivery Delay. The Spec Complexity → Halcyon Forge edge is a threshold effect (flat, then a step at the tight-tolerance cutoff) and only recovered by domain knowledge; the rest is discovered by bootstrapped PC with ≥80% edge stability." },
      { q: "Compare suppliers", a: "On raw logs, orders through Halcyon Forge run 7.61 days later on average than the rest of the network — but 1.43 of that is confounding from spec complexity: Halcyon is the only qualified forge above the tight-tolerance cutoff. The true causal penalty of routing through Halcyon is 6.18 days via longer material lead time. (Vantage Alloys and Solaris Components round out the sourcing network — Vantage's shaky record is a small-sample artifact the placebo test rules out, and Solaris's strong average has never been tested on a high-complexity order.)" },
      { q: "Predict impact of changes", a: "In the simulator, moving Meridian Tool & Die allocation to 65% and enabling approval automation drops predicted delivery delay from 9.3 to about 6.0 days (~35%), for roughly $0 net implementation cost." },
      { q: "What are the ROI opportunities?", a: "Ranked by ROI: (1) sourcing shift ~$410K/yr at $54K capex, (2) export-approval automation ~$175K/yr at $45K, (3) machine buffer capacity ~$72K/yr at $126K." },
      { q: "Executive summary", a: "Halcyon Forge dependency is the dominant causal driver of line-side delivery delay: recovered effect 6.18 days vs a planted ground truth of 5.78 (6.8% error) — a naive dashboard would have said 7.61. ~17% reduction is achievable by shifting a quarter of sourcing to Meridian Tool & Die, worth ~$410K/year. Autonomous discovery F1 0.94 (8 of 9 edges, no spurious); VanderWeele E-value ≈ 5.7 indicates strong robustness to unmeasured confounding." },
    ],
    methodology: [
      { phase: "Causal Discovery", detail: "Bootstrapped PC algorithm · Fisher-Z tests at α=0.05 · 20 subsamples × 2,000 rows · 60% edge-stability threshold · domain-knowledge ablation" },
      { phase: "Structural Model", detail: "Mixed SCM — Logistic Regression for binary nodes, Gradient Boosting for the outcome (avoids the Linear Probability Model pitfall)" },
      { phase: "Effect Estimation", detail: "Double ML (Chernozhukov et al. 2018) · 5-fold cross-fitting · GBM nuisance models · Eicker-Huber-White sandwich SEs" },
      { phase: "Validation", detail: "Planted ground-truth coefficients · placebo-treatment & random-common-cause refuters · E-value · CATE across tertiles · 10-seed robustness (mean ± std)" },
      { phase: "Attribution", detail: "SCM-grounded SHAP on structural equations · features split into controllable vs. structural" },
    ],

    narrative: {
      agentName: "Sourcing Agent",
      agentRole: "autonomously selects a forge for each incoming precision order",
      decisionLabel: "Selected Halcyon Forge",
      altLabel: "Meridian Tool & Die",
      outcomeLabel: "Delivery delayed",
      agentSignals: [
        { label: "Quoted unit cost", weight: 0.36 },
        { label: "Stated capacity / availability", weight: 0.34 },
        { label: "Historical on-time rate", weight: 0.22 },
        { label: "Spec complexity", weight: 0.08 },
      ],
      agentBlindSpots: [
        "Tight-tolerance orders are routed to Halcyon Forge and are slower regardless of supplier — a confounded path",
        "Halcyon's effect runs through Material Lead Time, not visible in the quote",
        "The historical on-time rate is itself confounded by which orders Halcyon gets",
      ],
      stages: [
        { id: "order", label: "Order" },
        { id: "supplier", label: "Forge", agent: "Sourcing Agent" },
        { id: "material", label: "Material" },
        { id: "factory", label: "Factory", agent: "Production Agent" },
        { id: "transport", label: "Transport", agent: "Logistics Agent" },
        { id: "customer", label: "Line-Side" },
      ],
      incident: {
        trigger: "Halcyon Forge confirmed for a tight-tolerance order",
        steps: [
          { stageId: "supplier", t: "10:42", note: "Sourcing Agent selects Halcyon Forge", sev: "warn" },
          { stageId: "material", t: "11:18", note: "Material lead time runs 6.8 d over baseline", sev: "warn" },
          { stageId: "factory", t: "13:05", note: "Production queue backs up", sev: "warn" },
          { stageId: "transport", t: "15:40", note: "Booked transport window missed", sev: "crit" },
          { stageId: "customer", t: "next day", note: "Line-side delivery SLA breached", sev: "crit" },
        ],
      },
    },
  },

  healthcare: {
    id: "healthcare",
    domainLabel: "Healthcare",
    org: "Meridian Health System",
    scenarioName: "Length-of-Stay Analysis",
    outcomeVariable: "Length of Stay",
    outcomeUnit: "days",
    treatmentLabel: "Specialist Assignment",
    confounderLabel: "Patient Complexity",
    moderatorLabel: "Patient Complexity",
    timeRange: "Jan 2023 – Apr 2024",
    description:
      "Complex patients are both more likely to be assigned a specialist and inherently stay longer — a confounding path that makes specialists look worse than they are. CausalOCPM isolates the true causal effect of specialist assignment on length of stay.",
    totalEvents: 15000,
    treatedPct: 54,
    outcomeMean: 4.99,
    outcomeStd: 3.51,
    simBaseline: 7.9,

    // Real reference-pipeline outputs (validate.py, seed 42, captured 2026-09-01).
    trueEffect: 5.27, // 6.2 × 0.85 mediated path (planted)
    naiveEffect: 6.01, // real group-mean difference (6.010)
    dmlEffect: 5.25, // Double ML (5.251, error 0.4%)
    dmlCiLow: 5.16, // 95% CI [5.165, 5.337]
    dmlCiHigh: 5.34,

    nodes: [
      { id: "patient_complexity", label: "Patient Complexity", role: "confounder", x: 0, y: 2.6 },
      { id: "specialist_required", label: "Specialist Assignment", role: "treatment", x: 0, y: 0 },
      { id: "treatment_duration", label: "Treatment Duration", role: "mediator", x: 2.6, y: 0 },
      { id: "bed_occupancy_rate", label: "Bed Occupancy Rate", role: "mediator", x: 2.6, y: 2.6 },
      { id: "emergency_admission", label: "Emergency Admission", role: "exogenous", x: 2.6, y: 4.6 },
      { id: "approval_wait", label: "Approval Wait", role: "mediator", x: 5.2, y: 1.8 },
      { id: "insurance_expedited", label: "Insurance Expedited", role: "exogenous", x: 5.2, y: 0 },
      { id: "length_of_stay", label: "Length of Stay", role: "outcome", x: 7.8, y: 1.8 },
    ],
    // Discovery matches the reference exactly: PC-only recovers 7 of 9 edges
    // (precision 0.875, recall 0.778, F1 0.824) and retains ONE spurious edge —
    // a reversed length_of_stay → approval_wait. The two misses are the weakest
    // true edges; the nonlinear confounder edge IS found here (steeper sigmoid).
    edges: [
      { source: "patient_complexity", target: "specialist_required", coef: 0.9, discovered: true, bootstrapFreq: 0.67 },
      { source: "patient_complexity", target: "bed_occupancy_rate", coef: 0.06, discovered: true, bootstrapFreq: 0.88 },
      { source: "patient_complexity", target: "length_of_stay", coef: 0.18, discovered: true, bootstrapFreq: 0.74 },
      { source: "specialist_required", target: "treatment_duration", coef: 6.2, discovered: true, bootstrapFreq: 0.99 },
      { source: "treatment_duration", target: "length_of_stay", coef: 0.85, discovered: true, bootstrapFreq: 0.97 },
      { source: "bed_occupancy_rate", target: "approval_wait", coef: 2.1, discovered: false, bootstrapFreq: 0.44 },
      { source: "emergency_admission", target: "approval_wait", coef: 1.8, discovered: true, bootstrapFreq: 0.83 },
      { source: "approval_wait", target: "length_of_stay", coef: 0.11, discovered: false, bootstrapFreq: 0.47 },
      { source: "insurance_expedited", target: "length_of_stay", coef: -0.55, discovered: true, bootstrapFreq: 0.71 },
    ],
    spuriousEdges: [
      {
        source: "length_of_stay",
        target: "approval_wait",
        bootstrapFreq: 0.68,
        why: "approval wait and length of stay are strongly correlated through the shared mediated path, and PC oriented the edge the wrong way (LOS → approval wait). The constraint 'approval happens before discharge' flips it back.",
      },
    ],
    signUncertainEdges: [],
    avgModelR2: 0.94,
    avgCoefErrorPct: 1.1,
    seedRobustness: { nSeeds: 10, causalMean: 5.25, causalStd: 0.072, causalLo: 5.12, causalHi: 5.38, naiveLo: 5.9, naiveHi: 6.12 },
    chain: ["Patient Complexity", "Specialist Assignment", "Treatment Duration", "Length of Stay"],
    strongestRel: { from: "Specialist Assignment", to: "Treatment Duration", coef: 6.2 },

    objects: [
      { name: "Admissions", records: 15000, attributes: 14, missingPct: 3, qualityPct: 96, updatedHrs: 1 },
      { name: "Patients", records: 15000, attributes: 20, missingPct: 5, qualityPct: 95, updatedHrs: 3 },
      { name: "Care Teams", records: 20, attributes: 11, missingPct: 4, qualityPct: 96, updatedHrs: 4 },
      { name: "Diagnostics", records: 15000, attributes: 9, missingPct: 6, qualityPct: 94, updatedHrs: 2 },
      { name: "Beds", records: 6, attributes: 8, missingPct: 2, qualityPct: 98, updatedHrs: 1 },
    ],
    objectInteractionLabels: ["Admissions", "Patients", "Care Teams", "Diagnostics", "Beds"],
    topResources: [
      { label: "Top ward", value: "WRD_04" },
      { label: "Top clinician", value: "CLN_12" },
      { label: "Treatment arm", value: "MED_S · 54%" },
    ],
    correlationGroups: [
      { name: "Specialist", options: [ { label: "Specialist assigned", onTimePct: 48, delayedPct: 52 }, { label: "No specialist", onTimePct: 83, delayedPct: 17 } ] },
      { name: "Admission type", options: [ { label: "Emergency", onTimePct: 61, delayedPct: 39 }, { label: "Elective", onTimePct: 85, delayedPct: 15 } ] },
    ],
    entities: ["Cardiology", "Orthopedics", "General Medicine", "Neurology", "Pulmonology"],
    categories: ["Emergency", "Elective", "Transfer", "Day Case", "Maternity"],
    riskSegment: "Cardiology · high-complexity patients",

    cateSegments: [
      { label: "Low (1–4)", effect: -0.02, ciLow: -0.71, ciHigh: 0.67 },
      { label: "Mid (5–7)", effect: 0.04, ciLow: -0.68, ciHigh: 0.76 },
      { label: "High (8–10)", effect: 0.17, ciLow: -0.6, ciHigh: 0.94 },
    ],
    cateAte: 0.06,
    cateNote:
      "The binary specialist-assignment effect within each patient-complexity tertile (mediators fixed); small by construction — the 5.25-day figure is the full path effect through Treatment Duration. The effect rises with complexity, so an SLA targeted at the most complex admissions returns most.",

    sensitivity: {
      placeboEffect: 0.02, // reference: +0.017 days
      placeboPass: true,
      randomCauseEstimate: 5.25, // random common cause → 5.250, stable
      randomCauseStable: true,
      eValue: 7.1, // VanderWeele E-value from the standardized effect
      strengths: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3],
      estimatesUnderConfounding: [3.85, 2.89, 2.26, 1.84, 1.43, 1.11],
      verdict:
        "The effect stays positive across an assumed-confounding sweep out to 30% strength (5.25 → 1.11 days). Placebo +0.02 ≈ 0; random common cause re-estimates 5.25. VanderWeele E-value ≈ 7.1.",
    },

    levers: [
      { id: "specialist_allocation_pct", label: "Specialist Allocation", group: "Specialist & Allocation", kind: "slider", min: 0, max: 100, step: 5, unit: "%", baseline: 45, hint: "Baseline: 45% of cases assigned a specialist." },
      { id: "fast_track_eligibility_pct", label: "Fast-Track Eligibility", group: "Specialist & Allocation", kind: "slider", min: 0, max: 100, step: 5, unit: "%", baseline: 20, hint: "Baseline: 20% on the fast-track pathway." },
      { id: "bed_capacity_expanded", label: "Expand Bed Capacity", group: "Capacity & Staff", kind: "toggle", min: 0, max: 1, step: 1, unit: "", baseline: 0, hint: "Adds beds — reduces occupancy pressure." },
      { id: "additional_nursing_staff", label: "Additional Nursing Staff", group: "Capacity & Staff", kind: "slider", min: 0, max: 20, step: 1, unit: "FTE", baseline: 0, hint: "Each nurse reduces treatment duration ~0.15 days." },
      { id: "triage_automation", label: "Automate Triage Scoring", group: "Process & Diagnostics", kind: "toggle", min: 0, max: 1, step: 1, unit: "", baseline: 0, hint: "Reduces triage-to-treatment delay ~0.3 days." },
      { id: "diagnostic_speed_mode", label: "Diagnostic Speed Mode", group: "Process & Diagnostics", kind: "mode", min: 0, max: 2, step: 1, unit: "", baseline: 0, modes: ["Standard", "Fast (−20%)", "Express (−35%)"], hint: "Evening / express imaging blocks for inpatients." },
    ],

    actions: [
      { id: "act-1", title: "Guarantee specialist consult within 12 hours of request", detail: "Specialist assignment latency drives Treatment Duration on the critical path. A 12-hour consult SLA on the top three services removes most of the avoidable wait.", reductionPct: 17.1, evidence: "MEASURED", confidence: "High", effort: "Medium", timeline: "Immediate", capex: 90000, annualSavings: 610000, lever: "specialist_allocation_pct" },
      { id: "act-2", title: "Add evening imaging slots for inpatients", detail: "Shifting 20% of inpatient imaging demand into an evening block cuts diagnostic turnaround on the critical path.", reductionPct: 8.9, evidence: "ILLUSTRATIVE", confidence: "Medium", effort: "Low", timeline: "30 days", capex: 60000, annualSavings: 240000, lever: "diagnostic_speed_mode" },
      { id: "act-3", title: "Start discharge planning at admission for elective cases", detail: "Early discharge planning frees downstream beds sooner and reduces the queueing effect on new admissions.", reductionPct: 7.0, evidence: "ILLUSTRATIVE", confidence: "Medium", effort: "Medium", timeline: "60 days", capex: 45000, annualSavings: 175000, lever: "bed_capacity_expanded" },
    ],

    copilotChips: [
      { key: "delays", label: "Why is LOS increasing?", icon: "trend" },
      { key: "bottleneck", label: "What is the top bottleneck?", icon: "alert" },
      { key: "intervention", label: "Best intervention?", icon: "bulb" },
      { key: "suppliers", label: "Compare specialist vs. not", icon: "swap" },
      { key: "chain", label: "Explain causal chain", icon: "link" },
      { key: "impact", label: "Predict impact of changes", icon: "chart" },
      { key: "executive", label: "Executive summary", icon: "doc" },
    ],
    copilotFollowUps: {
      delays: ["Best intervention?", "Explain causal chain", "Predict impact of changes"],
      bottleneck: ["Why is LOS increasing?", "Best intervention?", "Compare specialist vs. not"],
      intervention: ["Predict impact of changes", "What are the ROI opportunities?", "Explain causal chain"],
      suppliers: ["Why is LOS increasing?", "Best intervention?", "Predict impact of changes"],
      chain: ["What is the top bottleneck?", "Best intervention?", "Executive summary"],
      impact: ["What are the ROI opportunities?", "Executive summary", "Explain causal chain"],
      executive: ["Best intervention?", "What are the ROI opportunities?", "Explain causal chain"],
      custom: ["Best intervention?", "Executive summary", "What is the top bottleneck?"],
    },
    copilotCapabilities: [
      { icon: "alert", title: "What is the top bottleneck?", detail: "Identify the most impactful constraint", tags: ["Bottleneck Analysis", "Root Cause"], prompt: "What is the top bottleneck?" },
      { icon: "chart", title: "Show causal KPI impact", detail: "See which factors drive length of stay", tags: ["Causal Impact", "KPI Analysis"], prompt: "Which factors have the largest causal impact on length of stay?" },
      { icon: "flask", title: "Run a what-if simulation", detail: "Test interventions & predict outcomes", tags: ["Simulation", "Forecasting"], prompt: "Predict impact of changes" },
      { icon: "doc", title: "Generate executive summary", detail: "AI-powered insights & recommendations", tags: ["AI Summary", "Insights"], prompt: "Executive summary" },
    ],
    copilotSeed: [
      { q: "Why is LOS increasing?", a: "Length of stay is driven primarily by specialist assignment, which raises Treatment Duration by 6.2 days on the specialist arm; that flows to LOS with a 0.85 coefficient. Patient complexity (the confounder) inflates the raw correlation. The recovered causal effect of specialist assignment is +5.25 days (95% CI 5.16–5.34), close to the planted ground truth of 5.27." },
      { q: "What is the top bottleneck?", a: "Treatment Duration is the binding constraint — the mediator between specialist assignment and length of stay. Bed capacity and triage automation help far less than shortening the specialist-driven treatment pathway." },
      { q: "Best intervention?", a: "Guarantee a specialist consult within 12 hours of request: ~17% length-of-stay reduction, ~$610K/year expected savings at High confidence, payback ≈ 1.8 months." },
      { q: "Explain causal chain", a: "Patient Complexity → Specialist Assignment → Treatment Duration → Length of Stay. The Patient Complexity → Specialist Assignment edge is nonlinear and only recovered by domain knowledge; the rest is discovered by bootstrapped PC with ≥86% edge stability." },
      { q: "Compare specialist vs. not", a: "On raw logs, specialist patients stay 6.01 days longer — but 0.76 of that is confounding from patient complexity. The true causal effect of assigning a specialist is 5.25 days via longer treatment duration." },
      { q: "Predict impact of changes", a: "In the simulator, setting diagnostic speed to Express and adding 6 nursing FTEs drops predicted LOS from 7.9 to about 5.8 days (−27%)." },
      { q: "What are the ROI opportunities?", a: "Ranked by ROI: (1) 12-hour consult SLA ~$610K/yr at $90K capex, (2) evening imaging ~$240K/yr at $60K, (3) discharge planning at admission ~$175K/yr at $45K. Blended payback ≈ 1.8 months." },
      { q: "Executive summary", a: "Specialist assignment is the dominant causal driver of length of stay: recovered effect 5.25 days vs a planted ground truth of 5.27 — naive would say 6.01. ~17% reduction is achievable with a 12-hour consult SLA, worth ~$610K/year. Autonomous discovery F1 0.83 (7 of 9 edges, 1 reversed) — healthcare is the harder domain; VanderWeele E-value ≈ 7.1." },
    ],
    methodology: [
      { phase: "Causal Discovery", detail: "Bootstrapped PC algorithm · Fisher-Z tests at α=0.05 · 20 subsamples × 2,000 rows · 60% edge-stability threshold · domain-knowledge ablation" },
      { phase: "Structural Model", detail: "Mixed SCM — Logistic Regression for binary nodes, Gradient Boosting for the outcome (avoids the Linear Probability Model pitfall)" },
      { phase: "Effect Estimation", detail: "Double ML (Chernozhukov et al. 2018) · 5-fold cross-fitting · GBM nuisance models · Eicker-Huber-White sandwich SEs" },
      { phase: "Validation", detail: "Planted ground-truth coefficients · placebo-treatment & random-common-cause refuters · E-value · CATE across tertiles · 10-seed robustness (mean ± std)" },
      { phase: "Attribution", detail: "SCM-grounded SHAP on structural equations · features split into controllable vs. structural" },
    ],

    narrative: {
      agentName: "Care Coordination Agent",
      agentRole: "autonomously assigns a specialist consult for each admission",
      decisionLabel: "Assigned a specialist",
      altLabel: "no specialist / hospitalist pathway",
      outcomeLabel: "Discharge delayed",
      agentSignals: [
        { label: "Presenting diagnosis severity", weight: 0.38 },
        { label: "Specialist availability", weight: 0.29 },
        { label: "Bed pressure on the ward", weight: 0.2 },
        { label: "Patient comorbidity index", weight: 0.13 },
      ],
      agentBlindSpots: [
        "Complex patients are both more likely to get a specialist and inherently stay longer — a confounded path",
        "The specialist's effect runs through Treatment Duration, not the referral decision itself",
        "Historical LOS for specialist patients is confounded by who gets referred",
      ],
      stages: [
        { id: "admission", label: "Admission" },
        { id: "triage", label: "Triage", agent: "Triage Agent" },
        { id: "specialist", label: "Specialist", agent: "Care Coordination Agent" },
        { id: "diagnostics", label: "Diagnostics" },
        { id: "discharge", label: "Discharge", agent: "Discharge Agent" },
      ],
      incident: {
        trigger: "Specialist consult ordered for a high-complexity admission",
        steps: [
          { stageId: "specialist", t: "Day 0 14:20", note: "Care Coordination Agent assigns cardiology consult", sev: "warn" },
          { stageId: "diagnostics", t: "Day 1 09:10", note: "Treatment duration extends 6.2 d on the specialist arm", sev: "warn" },
          { stageId: "discharge", t: "Day 2", note: "Downstream bed queue grows", sev: "warn" },
          { stageId: "discharge", t: "Day 5", note: "Discharge slips — 5.3 d longer stay", sev: "crit" },
        ],
      },
    },
  },
};
