/**
 * Per-domain narrative + causal ground truth for the offline fixture builder.
 *
 * The causal structure mirrors the reference CausalOCPM pipeline's planted DAGs
 * (data/generate_data.py + generate_healthcare.py): a confounder driving both
 * treatment selection and the outcome, plus a mediated true causal path.
 * No PRIHIR — the manufacturing tenant is "Northwind Components Co.".
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
  chain: string[]; // headline causal chain (labels)
  strongestRel: { from: string; to: string; coef: number };

  objects: { name: string; records: number; attributes: number; missingPct: number; qualityPct: number; updatedHrs: number }[];
  objectInteractionLabels: string[];
  topResources: { label: string; value: string }[];

  correlationGroups: { name: string; options: { label: string; onTimePct: number; delayedPct: number }[] }[];

  entities: string[];
  categories: string[];
  riskSegment: string;

  cateSegments: { label: string; mult: number }[];

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
}

/* ────────────────────────────────────────────────────────────────────────── */

export const DOMAINS: Record<DomainSpec["id"], DomainSpec> = {
  manufacturing: {
    id: "manufacturing",
    domainLabel: "Manufacturing",
    org: "Northwind Components Co.",
    scenarioName: "Shipment Delay Analysis",
    outcomeVariable: "Shipment Delay",
    outcomeUnit: "days",
    treatmentLabel: "Supplier A Dependency",
    confounderLabel: "Order Complexity",
    moderatorLabel: "Order Complexity",
    timeRange: "Jan 2023 – Apr 2024",
    description:
      "Traditional process mining would read Supplier A's raw correlation with delay and re-source away from it. But complex orders are preferentially routed to Supplier A and are inherently slower — a confounding path. CausalOCPM isolates the true causal effect of Supplier A dependency on shipment delay.",
    totalEvents: 15000,
    treatedPct: 54,
    outcomeMean: 6.24,
    outcomeStd: 4.44,
    simBaseline: 8.2,

    trueEffect: 6.66, // 7.4 × 0.9 mediated path
    naiveEffect: 8.1,
    dmlEffect: 6.65,
    dmlCiLow: 6.44,
    dmlCiHigh: 6.86,

    nodes: [
      { id: "order_complexity", label: "Order Complexity", role: "confounder", x: 0, y: 2.6 },
      { id: "supplier_a", label: "Supplier A Dependency", role: "treatment", x: 0, y: 0 },
      { id: "material_lead_time", label: "Material Lead Time", role: "mediator", x: 2.6, y: 0 },
      { id: "machine_queue_length", label: "Machine Queue Length", role: "mediator", x: 2.6, y: 2.6 },
      { id: "export_flag", label: "Export Flag", role: "exogenous", x: 2.6, y: 4.6 },
      { id: "approval_duration", label: "Approval Duration", role: "mediator", x: 5.2, y: 1.8 },
      { id: "carrier_express", label: "Express Carrier", role: "exogenous", x: 5.2, y: 0 },
      { id: "shipment_delay", label: "Shipment Delay", role: "outcome", x: 7.8, y: 1.8 },
    ],
    edges: [
      { source: "order_complexity", target: "supplier_a", coef: 0.7, discovered: false, bootstrapFreq: 0.34 },
      { source: "order_complexity", target: "machine_queue_length", coef: 0.8, discovered: true, bootstrapFreq: 0.92 },
      { source: "order_complexity", target: "shipment_delay", coef: 0.2, discovered: true, bootstrapFreq: 0.71 },
      { source: "supplier_a", target: "material_lead_time", coef: 7.4, discovered: true, bootstrapFreq: 0.99 },
      { source: "material_lead_time", target: "shipment_delay", coef: 0.9, discovered: true, bootstrapFreq: 0.97 },
      { source: "machine_queue_length", target: "approval_duration", coef: 1.3, discovered: true, bootstrapFreq: 0.88 },
      { source: "export_flag", target: "approval_duration", coef: 2.0, discovered: true, bootstrapFreq: 0.83 },
      { source: "approval_duration", target: "shipment_delay", coef: 0.35, discovered: true, bootstrapFreq: 0.79 },
      { source: "carrier_express", target: "shipment_delay", coef: -0.6, discovered: true, bootstrapFreq: 0.7 },
    ],
    chain: ["Order Complexity", "Supplier A", "Material Lead Time", "Shipment Delay"],
    strongestRel: { from: "Supplier A", to: "Material Lead Time", coef: 7.4 },

    objects: [
      { name: "Orders", records: 15000, attributes: 12, missingPct: 3, qualityPct: 96, updatedHrs: 2 },
      { name: "Machines", records: 8, attributes: 14, missingPct: 4, qualityPct: 97, updatedHrs: 2 },
      { name: "Workers", records: 15, attributes: 9, missingPct: 5, qualityPct: 95, updatedHrs: 6 },
      { name: "Materials", records: 15000, attributes: 11, missingPct: 5, qualityPct: 95, updatedHrs: 4 },
      { name: "Shipments", records: 15000, attributes: 10, missingPct: 4, qualityPct: 97, updatedHrs: 2 },
    ],
    objectInteractionLabels: ["Orders", "Machines", "Workers", "Materials", "Shipments"],
    topResources: [
      { label: "Top machine", value: "MCH_01" },
      { label: "Top worker", value: "WRK_07" },
      { label: "Treatment arm", value: "MAT_A · 54%" },
    ],
    correlationGroups: [
      { name: "Supplier", options: [ { label: "Supplier A", onTimePct: 55, delayedPct: 45 }, { label: "Supplier B", onTimePct: 82, delayedPct: 18 } ] },
      { name: "Carrier", options: [ { label: "Standard", onTimePct: 66, delayedPct: 34 }, { label: "Express", onTimePct: 87, delayedPct: 13 } ] },
    ],
    entities: ["Supplier A", "Supplier B", "Supplier C", "Supplier D"],
    categories: ["Electronics", "Fasteners", "Assemblies", "Raw Metal", "Packaging"],
    riskSegment: "Supplier A · high-complexity orders",

    cateSegments: [
      { label: "Low (1–4)", mult: -0.15 },
      { label: "Mid (5–7)", mult: 0.35 },
      { label: "High (8–10)", mult: 1.0 },
    ],

    sensitivity: {
      placeboEffect: 0.03,
      placeboPass: true,
      randomCauseEstimate: 6.63,
      randomCauseStable: true,
      eValue: 4.7,
      strengths: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3],
      estimatesUnderConfounding: [6.58, 6.41, 6.12, 5.74, 5.21, 4.55],
      verdict:
        "An unmeasured confounder would need to be about as strong as Supplier A's own effect on both treatment and outcome (E-value 4.7) before the causal conclusion flips. The estimate stays materially positive through a 25% assumed-confounding sweep. High robustness.",
    },

    levers: [
      { id: "supplier_reliability_pct", label: "Supplier B Allocation", group: "Supplier & Procurement", kind: "slider", min: 0, max: 100, step: 5, unit: "%", baseline: 40, hint: "60% of volume currently goes to Supplier A. Shift more to Supplier B." },
      { id: "export_flag_reduction", label: "Streamline Export Documentation", group: "Supplier & Procurement", kind: "toggle", min: 0, max: 1, step: 1, unit: "", baseline: 0, hint: "Reduces export-related approval delay ~35%." },
      { id: "machine_capacity_expanded", label: "Expand Machine Capacity", group: "Machine & Capacity", kind: "toggle", min: 0, max: 1, step: 1, unit: "", baseline: 0, hint: "Adds processing units — reduces machine queue ~40%." },
      { id: "additional_workforce", label: "Additional Workforce", group: "Machine & Capacity", kind: "slider", min: 0, max: 20, step: 1, unit: "FTE", baseline: 0, hint: "Each additional worker reduces queue ~0.3 units." },
      { id: "approval_automation", label: "Automate Approval Steps", group: "Approvals & Process", kind: "toggle", min: 0, max: 1, step: 1, unit: "", baseline: 0, hint: "Reduces approval duration ~50%." },
      { id: "order_batching", label: "Enable Order Batching", group: "Approvals & Process", kind: "toggle", min: 0, max: 1, step: 1, unit: "", baseline: 0, hint: "Smooths order-complexity spikes ~20%." },
      { id: "carrier_express_pct", label: "Express Carrier Usage", group: "Logistics & Delivery", kind: "slider", min: 0, max: 100, step: 5, unit: "%", baseline: 15, hint: "Each 10% increase reduces delay ~0.08 days." },
      { id: "material_lead_time_mode", label: "Material Lead Time Strategy", group: "Logistics & Delivery", kind: "mode", min: 0, max: 2, step: 1, unit: "", baseline: 0, modes: ["Current", "Reduced (−20%)", "Optimised (−40%)"], hint: "Negotiate faster material delivery contracts." },
    ],

    actions: [
      { id: "act-1", title: "Shift ~25% procurement from Supplier A to Supplier B", detail: "Supplier A dependency is the dominant causal driver via Material Lead Time. Re-routing a quarter of volume to Supplier B cuts exposure without breaching capacity.", reductionPct: 20.5, evidence: "MEASURED", confidence: "High", effort: "Medium", timeline: "Immediate", capex: 54000, annualSavings: 479000, lever: "supplier_reliability_pct" },
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
      { q: "Why are delays increasing?", a: "Shipment delay is driven primarily by Supplier A dependency, which raises Material Lead Time by 7.4 days on the treated arm; that flows through to delay with a 0.9 coefficient. Order complexity (the confounder) inflates the raw correlation. The recovered causal effect of Supplier A is +6.65 days (95% CI 6.44–6.86)." },
      { q: "What is the top bottleneck?", a: "Material Lead Time is the binding constraint — the mediator between Supplier A and Shipment Delay. Every downstream action (approval automation, buffer capacity) moves the needle far less than re-sourcing does." },
      { q: "Best intervention?", a: "Shift ~25% procurement from Supplier A to Supplier B: ~20.5% shipment-delay reduction, ~$479K/year expected savings at High confidence, payback ≈ 3.2 months." },
      { q: "Explain causal chain", a: "Order Complexity → Supplier A → Material Lead Time → Shipment Delay. The Order Complexity → Supplier A edge is nonlinear (sigmoid) and only recovered by domain knowledge; the rest is discovered by bootstrapped PC with ≥88% edge stability." },
      { q: "Compare suppliers", a: "On raw logs Supplier A orders are delayed 45% of the time vs 18% for Supplier B — but ~1.4 days of that gap is confounding from order complexity. The true causal penalty of choosing Supplier A is 6.65 days via longer material lead time." },
      { q: "Predict impact of changes", a: "In the simulator, moving Supplier B allocation to 65% and enabling approval automation drops predicted shipment delay from 8.2 to about 5.2 days (−36%), for roughly $0 net implementation cost." },
      { q: "What are the ROI opportunities?", a: "Ranked by ROI: (1) procurement shift ~$479K/yr at $54K capex, (2) export-approval automation ~$175K/yr at $45K, (3) machine buffer capacity ~$72K/yr at $126K. Blended payback ≈ 3.2 months." },
      { q: "Executive summary", a: "Supplier A is the dominant causal driver of shipment delay (6.65 days, validated — not merely correlated). ~20.5% reduction is achievable by shifting a quarter of procurement to Supplier B, worth ~$479K/year. Discovery precision 1.00, recall 0.89; E-value 4.7 indicates the result is robust to unmeasured confounding." },
    ],
    methodology: [
      { phase: "Causal Discovery", detail: "Bootstrapped PC algorithm · Fisher-Z tests at α=0.05 · 20 subsamples × 2,000 rows · 60% edge-stability threshold · domain-knowledge ablation" },
      { phase: "Structural Model", detail: "Mixed SCM — Logistic Regression for binary nodes, Gradient Boosting for the outcome (avoids the Linear Probability Model pitfall)" },
      { phase: "Effect Estimation", detail: "Double ML (Chernozhukov et al. 2018) · 5-fold cross-fitting · GBM nuisance models · Eicker-Huber-White sandwich SEs" },
      { phase: "Validation", detail: "Planted ground-truth coefficients · placebo-treatment & random-common-cause refuters · E-value · CATE across tertiles · 10-seed robustness (mean ± std)" },
      { phase: "Attribution", detail: "SCM-grounded SHAP on structural equations · features split into controllable vs. structural" },
    ],
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

    trueEffect: 5.27, // 6.2 × 0.85
    naiveEffect: 6.2,
    dmlEffect: 5.27,
    dmlCiLow: 5.08,
    dmlCiHigh: 5.46,

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
    edges: [
      { source: "patient_complexity", target: "specialist_required", coef: 0.9, discovered: false, bootstrapFreq: 0.31 },
      { source: "patient_complexity", target: "bed_occupancy_rate", coef: 0.06, discovered: true, bootstrapFreq: 0.9 },
      { source: "patient_complexity", target: "length_of_stay", coef: 0.18, discovered: true, bootstrapFreq: 0.73 },
      { source: "specialist_required", target: "treatment_duration", coef: 6.2, discovered: true, bootstrapFreq: 0.99 },
      { source: "treatment_duration", target: "length_of_stay", coef: 0.85, discovered: true, bootstrapFreq: 0.96 },
      { source: "bed_occupancy_rate", target: "approval_wait", coef: 2.1, discovered: true, bootstrapFreq: 0.86 },
      { source: "emergency_admission", target: "approval_wait", coef: 1.8, discovered: true, bootstrapFreq: 0.82 },
      { source: "approval_wait", target: "length_of_stay", coef: 0.11, discovered: true, bootstrapFreq: 0.68 },
      { source: "insurance_expedited", target: "length_of_stay", coef: -0.55, discovered: true, bootstrapFreq: 0.7 },
    ],
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
      { label: "Low (1–4)", mult: -0.1 },
      { label: "Mid (5–7)", mult: 0.4 },
      { label: "High (8–10)", mult: 1.0 },
    ],

    sensitivity: {
      placeboEffect: -0.02,
      placeboPass: true,
      randomCauseEstimate: 5.29,
      randomCauseStable: true,
      eValue: 3.9,
      strengths: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3],
      estimatesUnderConfounding: [5.21, 5.06, 4.82, 4.49, 4.06, 3.52],
      verdict:
        "An unmeasured confounder would need a risk-ratio association of ~3.9 with both specialist assignment and length of stay to nullify the effect. The estimate remains clearly positive through a 25% confounding sweep. Robust.",
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
      { q: "Why is LOS increasing?", a: "Length of stay is driven primarily by specialist assignment, which raises Treatment Duration by 6.2 days on the specialist arm; that flows to LOS with a 0.85 coefficient. Patient complexity (the confounder) inflates the raw correlation. The recovered causal effect of specialist assignment is +5.27 days (95% CI 5.08–5.46)." },
      { q: "What is the top bottleneck?", a: "Treatment Duration is the binding constraint — the mediator between specialist assignment and length of stay. Bed capacity and triage automation help far less than shortening the specialist-driven treatment pathway." },
      { q: "Best intervention?", a: "Guarantee a specialist consult within 12 hours of request: ~17% length-of-stay reduction, ~$610K/year expected savings at High confidence, payback ≈ 1.8 months." },
      { q: "Explain causal chain", a: "Patient Complexity → Specialist Assignment → Treatment Duration → Length of Stay. The Patient Complexity → Specialist Assignment edge is nonlinear and only recovered by domain knowledge; the rest is discovered by bootstrapped PC with ≥86% edge stability." },
      { q: "Compare specialist vs. not", a: "On raw logs, specialist patients stay 6.0 days longer — but ~0.9 days of that is confounding from patient complexity. The true causal effect of assigning a specialist is 5.27 days via longer treatment duration." },
      { q: "Predict impact of changes", a: "In the simulator, setting diagnostic speed to Express and adding 6 nursing FTEs drops predicted LOS from 7.9 to about 5.8 days (−27%)." },
      { q: "What are the ROI opportunities?", a: "Ranked by ROI: (1) 12-hour consult SLA ~$610K/yr at $90K capex, (2) evening imaging ~$240K/yr at $60K, (3) discharge planning at admission ~$175K/yr at $45K. Blended payback ≈ 1.8 months." },
      { q: "Executive summary", a: "Specialist assignment is the dominant causal driver of length of stay (5.27 days, validated — not merely correlated). ~17% reduction is achievable with a 12-hour consult SLA, worth ~$610K/year. Discovery precision 1.00, recall 0.89; E-value 3.9 indicates robustness to unmeasured confounding." },
    ],
    methodology: [
      { phase: "Causal Discovery", detail: "Bootstrapped PC algorithm · Fisher-Z tests at α=0.05 · 20 subsamples × 2,000 rows · 60% edge-stability threshold · domain-knowledge ablation" },
      { phase: "Structural Model", detail: "Mixed SCM — Logistic Regression for binary nodes, Gradient Boosting for the outcome (avoids the Linear Probability Model pitfall)" },
      { phase: "Effect Estimation", detail: "Double ML (Chernozhukov et al. 2018) · 5-fold cross-fitting · GBM nuisance models · Eicker-Huber-White sandwich SEs" },
      { phase: "Validation", detail: "Planted ground-truth coefficients · placebo-treatment & random-common-cause refuters · E-value · CATE across tertiles · 10-seed robustness (mean ± std)" },
      { phase: "Attribution", detail: "SCM-grounded SHAP on structural equations · features split into controllable vs. structural" },
    ],
  },
};
