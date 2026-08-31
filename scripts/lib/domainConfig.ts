/**
 * Per-domain narrative + causal ground truth used by the offline fixture builder.
 * No PRIHIR anywhere — the manufacturing tenant is "Northwind Components Co.".
 */

export interface DriverSpec {
  id: string;
  label: string;
  groundTruthDays: number;
  naiveDays: number;
  lever: string;
  maxShiftPct: number;
  kind: "driver" | "mediator";
}

export interface LeverSpec {
  id: string;
  label: string;
  group: string;
  kind: "slider" | "toggle";
  min: number;
  max: number;
  step: number;
  unit: string;
  baseline: number;
  maxEffectDays: number;
  mediator?: string;
  hint: string;
}

export interface DomainSpec {
  id: "manufacturing" | "healthcare";
  domainLabel: string;
  org: string;
  scenarioName: string;
  outcomeVariable: string;
  outcomeUnit: string;
  timeRange: string;
  description: string;
  confounder: { id: string; label: string; inflatesPct: number };
  outcomeNodeLabel: string;
  drivers: DriverSpec[];
  objects: {
    name: string;
    records: number;
    attributes: number;
    missingPct: number;
    qualityPct: number;
    updatedHrs: number;
  }[];
  extraVariables: {
    name: string;
    object: string;
    type: "numeric" | "categorical" | "boolean" | "datetime";
    role: "driver" | "mediator" | "confounder" | "outcome" | "context";
    missingPct: number;
  }[];
  entities: string[];
  categories: string[];
  actions: {
    id: string;
    title: string;
    detail: string;
    deltaDays: number;
    annualSavings: number;
    lever: string;
    maxShiftPct: number;
    confidence: number;
    effort: "Low" | "Medium" | "High";
    timeline: string;
    capex: number;
    evidence: "MEASURED" | "ILLUSTRATIVE";
  }[];
  counterfactualLabel: string;
  copilotSeed: { q: string; a: string }[];
  primaryChain: string[];
  strongestRel: { from: string; to: string; coefficient: number };
  riskSegment: string;
  segmentVar: string;
  cateSegments: { label: string; mult: number }[];
  mediators: { name: string; baseline: number; unit: string }[];
  levers: LeverSpec[];
  correlationGroups: {
    name: string;
    options: { label: string; onTimePct: number; delayedPct: number }[];
  }[];
  methodology: { phase: string; detail: string }[];
  copilotCapabilities: { icon: string; title: string; detail: string; tags: string[]; prompt: string }[];
  annualVolume: number;
  costPerDelayDay: number;
  treatedPct: number;
  objectInteractionLabels: string[];
}

export const DOMAINS: Record<DomainSpec["id"], DomainSpec> = {
  manufacturing: {
    id: "manufacturing",
    domainLabel: "Manufacturing",
    org: "Northwind Components Co.",
    scenarioName: "Shipment Delay Analysis",
    outcomeVariable: "Shipment Delay",
    outcomeUnit: "days",
    timeRange: "Jan 2022 – Apr 2024",
    description:
      "We analyse how supplier, logistics, and external factors causally influence shipment delays across the order-to-shipment pipeline. The model isolates true drivers and quantifies interventions that guide effective corrective action.",
    confounder: { id: "peak_demand", label: "Peak-Season Demand", inflatesPct: 19 },
    outcomeNodeLabel: "Shipment Delay",
    drivers: [
      { id: "supplier_a_dep", label: "Supplier A Dependency", groundTruthDays: 6.65, naiveDays: 8.21, lever: "Procurement mix", maxShiftPct: 40, kind: "driver" },
      { id: "material_lead_time", label: "Material Lead Time", groundTruthDays: 2.31, naiveDays: 2.55, lever: "Lead-time mode", maxShiftPct: 30, kind: "mediator" },
      { id: "machine_queue", label: "Machine Queue Length", groundTruthDays: 1.24, naiveDays: 1.62, lever: "Buffer capacity", maxShiftPct: 25, kind: "driver" },
      { id: "order_complexity", label: "Order Complexity", groundTruthDays: 0.9, naiveDays: 1.18, lever: "Order batching", maxShiftPct: 20, kind: "driver" },
      { id: "approval_duration", label: "Approval Duration", groundTruthDays: 0.62, naiveDays: 0.71, lever: "Approval routing", maxShiftPct: 30, kind: "driver" },
      { id: "carrier_express", label: "Carrier Choice", groundTruthDays: 0.41, naiveDays: 0.44, lever: "Carrier upgrade", maxShiftPct: 20, kind: "driver" },
    ],
    objects: [
      { name: "Orders", records: 4335, attributes: 12, missingPct: 3, qualityPct: 96, updatedHrs: 2 },
      { name: "Machines", records: 312, attributes: 14, missingPct: 4, qualityPct: 97, updatedHrs: 2 },
      { name: "Workers", records: 486, attributes: 9, missingPct: 5, qualityPct: 95, updatedHrs: 6 },
      { name: "Materials", records: 3876, attributes: 11, missingPct: 5, qualityPct: 95, updatedHrs: 4 },
      { name: "Shipments", records: 4231, attributes: 10, missingPct: 4, qualityPct: 97, updatedHrs: 2 },
    ],
    extraVariables: [
      { name: "supplier_lead_time", object: "Materials", type: "numeric", role: "driver", missingPct: 4 },
      { name: "route_distance_km", object: "Shipments", type: "numeric", role: "mediator", missingPct: 3 },
      { name: "machine_utilization", object: "Machines", type: "numeric", role: "driver", missingPct: 5 },
      { name: "sku_count", object: "Orders", type: "numeric", role: "driver", missingPct: 2 },
      { name: "peak_season_demand", object: "Orders", type: "numeric", role: "confounder", missingPct: 7 },
      { name: "carrier_name", object: "Shipments", type: "categorical", role: "context", missingPct: 1 },
      { name: "promised_ship_date", object: "Orders", type: "datetime", role: "context", missingPct: 0 },
      { name: "expedited_flag", object: "Shipments", type: "boolean", role: "driver", missingPct: 0 },
    ],
    entities: ["Supplier A", "Supplier B", "Supplier C", "Supplier D"],
    categories: ["Electronics", "Fasteners", "Assemblies", "Raw Metal", "Packaging"],
    actions: [
      { id: "act-1", title: "Shift ~25% procurement from Supplier A to Supplier B", detail: "Supplier A dependency is the dominant causal driver. Re-routing a quarter of volume to Supplier B cuts exposure without breaching capacity limits.", deltaDays: 1.66, annualSavings: 479000, lever: "Procurement mix", maxShiftPct: 40, confidence: 0.9, effort: "Medium", timeline: "Immediate", capex: 54000, evidence: "MEASURED" },
      { id: "act-2", title: "Automate export approval + reduce flag routing", detail: "Approval duration sits on the critical path. Automating export documentation routing removes most of the queueing delay.", deltaDays: 0.61, annualSavings: 175000, lever: "Approval routing", maxShiftPct: 30, confidence: 0.78, effort: "Low", timeline: "30 days", capex: 40000, evidence: "ILLUSTRATIVE" },
      { id: "act-3", title: "Expand machine buffer capacity (≥20%)", detail: "Added buffer capacity absorbs queue spikes on the two most-loaded machine groups.", deltaDays: 0.25, annualSavings: 72000, lever: "Buffer capacity", maxShiftPct: 25, confidence: 0.84, effort: "High", timeline: "60 days", capex: 126000, evidence: "ILLUSTRATIVE" },
    ],
    counterfactualLabel: "If procurement had been re-routed to Supplier B",
    copilotSeed: [
      { q: "Why is shipment delay increasing?", a: "Shipment delay is primarily driven by higher dependency on Supplier A, which pushes up Material Lead Time. Supplier A has a recovered causal impact of +6.65 days — the largest of any factor." },
      { q: "What is the impact of Supplier A?", a: "Supplier A dependency has a recovered causal effect of 6.65 days (95% CI 6.59–6.71). Raw logs suggested 8.21 days, but ~19% of that was confounding from peak-season demand, removed via Double ML." },
      { q: "Which action has the highest ROI?", a: "Shifting ~25% of procurement from Supplier A to Supplier B: ~20.5% delay reduction and ~$479K/year in expected savings at 0.90 confidence, payback ~3.2 months." },
      { q: "What is the top bottleneck?", a: "The binding constraint is Material Lead Time, the mediator between Supplier A and Shipment Delay. Optimising lead-time mode alone reaches the 20% reduction target in the simulator." },
    ],
    primaryChain: ["Supplier A", "Material Lead Time", "Shipment Delay"],
    strongestRel: { from: "Supplier A", to: "Material Lead Time", coefficient: 7.38 },
    riskSegment: "Supplier A",
    segmentVar: "Order Complexity",
    cateSegments: [
      { label: "Low (1–4)", mult: -0.02 },
      { label: "Mid (5–7)", mult: 0.4 },
      { label: "High (8–10)", mult: 1.0 },
    ],
    mediators: [
      { name: "Material Lead Time", baseline: 7.2, unit: "days" },
      { name: "Machine Queue Length", baseline: 3.1, unit: "units" },
      { name: "Approval Duration", baseline: 2.4, unit: "days" },
    ],
    levers: [
      { id: "supplier_b_alloc", label: "Supplier B Allocation", group: "Supplier & Procurement", kind: "slider", min: 0, max: 100, step: 5, unit: "%", baseline: 20, maxEffectDays: 3.9, mediator: "Material Lead Time", hint: "Share of volume moved off Supplier A onto Supplier B." },
      { id: "leadtime_mode", label: "Optimise Lead-Time Mode", group: "Supplier & Procurement", kind: "toggle", min: 0, max: 1, step: 1, unit: "", baseline: 0, maxEffectDays: 2.9, mediator: "Material Lead Time", hint: "Switch materials planning to the optimised replenishment policy." },
      { id: "machine_capacity", label: "Expand Machine Capacity", group: "Machine & Capacity", kind: "slider", min: 0, max: 40, step: 5, unit: "%", baseline: 0, maxEffectDays: 1.2, mediator: "Machine Queue Length", hint: "Additional effective capacity on the two most-loaded machine groups." },
      { id: "extra_workforce", label: "Additional Workforce", group: "Machine & Capacity", kind: "slider", min: 0, max: 20, step: 1, unit: "FTE", baseline: 0, maxEffectDays: 0.7, mediator: "Machine Queue Length", hint: "Extra shop-floor FTEs to relieve queueing." },
      { id: "auto_approval", label: "Automate Export Approvals", group: "Approvals & Process", kind: "toggle", min: 0, max: 1, step: 1, unit: "", baseline: 0, maxEffectDays: 0.62, mediator: "Approval Duration", hint: "Route export documentation through the automated approval workflow." },
      { id: "order_batching", label: "Order Batching Discipline", group: "Approvals & Process", kind: "slider", min: 0, max: 30, step: 5, unit: "%", baseline: 0, maxEffectDays: 0.9, hint: "Consolidate low-complexity orders to reduce handling overhead." },
      { id: "carrier_upgrade", label: "Express Carrier Share", group: "Logistics & Delivery", kind: "slider", min: 0, max: 60, step: 10, unit: "%", baseline: 10, maxEffectDays: 0.41, hint: "Share of high-delay lanes moved to the express carrier." },
    ],
    correlationGroups: [
      { name: "Supplier", options: [ { label: "Supplier A", onTimePct: 58, delayedPct: 42 }, { label: "Supplier B", onTimePct: 81, delayedPct: 19 } ] },
      { name: "Carrier", options: [ { label: "Standard Carrier", onTimePct: 67, delayedPct: 33 }, { label: "Express Carrier", onTimePct: 88, delayedPct: 12 } ] },
    ],
    methodology: [
      { phase: "Causal Discovery", detail: "Bootstrapped PC algorithm · 20 subsamples × 2,000 rows · 60% edge-stability threshold" },
      { phase: "Effect Estimation", detail: "Double ML (Chernozhukov et al. 2018) · 5-fold cross-fitting · gradient-boosted nuisance models · sandwich SEs" },
      { phase: "Validation", detail: "Planted ground-truth coefficients · placebo-treatment refuter (expected ≈ 0) · 10-seed stability check · bootstrap CIs" },
    ],
    copilotCapabilities: [
      { icon: "alert", title: "What is the top bottleneck?", detail: "Identify the most impactful constraint", tags: ["Bottleneck Analysis", "Root Cause"], prompt: "What is the top bottleneck?" },
      { icon: "chart", title: "Show causal KPI impact", detail: "See which factors drive shipment delay", tags: ["Causal Impact", "KPI Analysis"], prompt: "Which factors have the largest causal impact on shipment delay?" },
      { icon: "flask", title: "Run a what-if simulation", detail: "Test interventions & predict outcomes", tags: ["Simulation", "Forecasting"], prompt: "Run a counterfactual for the worst case" },
      { icon: "doc", title: "Generate executive summary", detail: "AI-powered insights & recommendations", tags: ["AI Summary", "Insights"], prompt: "Generate an executive summary of the causal findings" },
    ],
    annualVolume: 300,
    costPerDelayDay: 1597,
    treatedPct: 54,
    objectInteractionLabels: ["Orders", "Machines", "Workers", "Materials", "Shipments"],
  },

  healthcare: {
    id: "healthcare",
    domainLabel: "Healthcare",
    org: "Meridian Health System",
    scenarioName: "Discharge Delay Analysis",
    outcomeVariable: "Discharge Delay",
    outcomeUnit: "days",
    timeRange: "Mar 2022 – Jun 2024",
    description:
      "We analyse how specialist scheduling, diagnostics, and bed capacity causally influence discharge delays across the inpatient admission workflow. The model separates true clinical drivers from acuity-driven confounding.",
    confounder: { id: "acuity_index", label: "Acuity / Comorbidity Index", inflatesPct: 15.5 },
    outcomeNodeLabel: "Discharge Delay",
    drivers: [
      { id: "specialist_latency", label: "Specialist Assignment Latency", groundTruthDays: 1.82, naiveDays: 2.15, lever: "Consult scheduling", maxShiftPct: 45, kind: "driver" },
      { id: "diagnostic_turnaround", label: "Diagnostic Turnaround", groundTruthDays: 1.05, naiveDays: 1.28, lever: "Imaging capacity", maxShiftPct: 35, kind: "mediator" },
      { id: "bed_availability", label: "Downstream Bed Availability", groundTruthDays: 0.94, naiveDays: 1.21, lever: "Discharge planning", maxShiftPct: 30, kind: "driver" },
      { id: "case_complexity", label: "Case Complexity", groundTruthDays: 0.7, naiveDays: 0.92, lever: "Pathway routing", maxShiftPct: 20, kind: "driver" },
      { id: "medication_recon", label: "Medication Reconciliation", groundTruthDays: 0.48, naiveDays: 0.57, lever: "Pharmacy workflow", maxShiftPct: 30, kind: "driver" },
      { id: "staffing_ratio", label: "Nurse Staffing Ratio", groundTruthDays: 0.38, naiveDays: 0.44, lever: "Shift planning", maxShiftPct: 18, kind: "driver" },
    ],
    objects: [
      { name: "Admissions", records: 5120, attributes: 14, missingPct: 3, qualityPct: 96, updatedHrs: 1 },
      { name: "Patients", records: 4712, attributes: 20, missingPct: 5, qualityPct: 95, updatedHrs: 3 },
      { name: "Care Teams", records: 318, attributes: 11, missingPct: 4, qualityPct: 96, updatedHrs: 4 },
      { name: "Diagnostic Orders", records: 8944, attributes: 9, missingPct: 6, qualityPct: 94, updatedHrs: 2 },
      { name: "Bed Resources", records: 640, attributes: 8, missingPct: 2, qualityPct: 98, updatedHrs: 1 },
    ],
    extraVariables: [
      { name: "consult_wait_hrs", object: "Care Teams", type: "numeric", role: "driver", missingPct: 4 },
      { name: "imaging_tat_hrs", object: "Diagnostic Orders", type: "numeric", role: "mediator", missingPct: 5 },
      { name: "ward_occupancy_pct", object: "Bed Resources", type: "numeric", role: "driver", missingPct: 2 },
      { name: "comorbidity_count", object: "Patients", type: "numeric", role: "confounder", missingPct: 6 },
      { name: "admission_source", object: "Admissions", type: "categorical", role: "context", missingPct: 1 },
      { name: "icu_flag", object: "Admissions", type: "boolean", role: "context", missingPct: 0 },
      { name: "attending_service", object: "Care Teams", type: "categorical", role: "context", missingPct: 1 },
      { name: "admit_datetime", object: "Admissions", type: "datetime", role: "context", missingPct: 0 },
    ],
    entities: ["Cardiology", "Orthopedics", "General Medicine", "Neurology", "Pulmonology"],
    categories: ["Emergency", "Elective", "Transfer", "Observation"],
    actions: [
      { id: "act-1", title: "Guarantee specialist consult within 12 hours of request", detail: "Specialist assignment latency is the dominant causal driver. A 12-hour consult SLA on the top three services removes most of the avoidable wait.", deltaDays: 1.35, annualSavings: 610000, lever: "Consult scheduling", maxShiftPct: 45, confidence: 0.88, effort: "Medium", timeline: "Immediate", capex: 90000, evidence: "MEASURED" },
      { id: "act-2", title: "Add evening imaging slots for inpatients", detail: "Shifting 20% of inpatient imaging demand into an evening block cuts diagnostic turnaround on the critical path.", deltaDays: 0.7, annualSavings: 240000, lever: "Imaging capacity", maxShiftPct: 35, confidence: 0.8, effort: "Low", timeline: "30 days", capex: 60000, evidence: "ILLUSTRATIVE" },
      { id: "act-3", title: "Start discharge planning at admission for elective cases", detail: "Early discharge planning frees downstream beds sooner and reduces the queueing effect on new admissions.", deltaDays: 0.55, annualSavings: 175000, lever: "Discharge planning", maxShiftPct: 30, confidence: 0.74, effort: "Medium", timeline: "60 days", capex: 45000, evidence: "ILLUSTRATIVE" },
    ],
    counterfactualLabel: "If the specialist consult had happened within 12 hours",
    copilotSeed: [
      { q: "Why is discharge delay increasing?", a: "Discharge delay is primarily driven by specialist assignment latency, which pushes up diagnostic turnaround on the critical path. Specialist latency has a recovered causal impact of +1.82 days." },
      { q: "What is the impact of specialist latency?", a: "Specialist assignment latency has a recovered causal effect of 1.82 days (95% CI 1.71–1.93). Raw logs suggested 2.15 days, but ~15.5% was confounding from patient acuity, removed via Double ML." },
      { q: "Which action has the highest ROI?", a: "A 12-hour specialist consult SLA: ~17% discharge-delay reduction and ~$610K/year in expected savings at 0.88 confidence, payback ~1.8 months." },
      { q: "What is the top bottleneck?", a: "The binding constraint is Diagnostic Turnaround, the mediator between specialist latency and discharge delay. Adding evening imaging slots reaches most of the reduction target in the simulator." },
    ],
    primaryChain: ["Specialist Latency", "Diagnostic Turnaround", "Discharge Delay"],
    strongestRel: { from: "Specialist Latency", to: "Diagnostic Turnaround", coefficient: 4.11 },
    riskSegment: "Cardiology",
    segmentVar: "Case Complexity",
    cateSegments: [
      { label: "Low (1–4)", mult: 0.1 },
      { label: "Mid (5–7)", mult: 0.5 },
      { label: "High (8–10)", mult: 1.0 },
    ],
    mediators: [
      { name: "Diagnostic Turnaround", baseline: 14.6, unit: "hrs" },
      { name: "Bed Queue Depth", baseline: 2.4, unit: "beds" },
      { name: "Medication Recon Time", baseline: 3.1, unit: "hrs" },
    ],
    levers: [
      { id: "consult_sla", label: "Specialist Consult SLA", group: "Consults & Scheduling", kind: "slider", min: 4, max: 48, step: 2, unit: "hrs", baseline: 26, maxEffectDays: 1.6, mediator: "Diagnostic Turnaround", hint: "Guaranteed time from consult request to specialist review." },
      { id: "priority_consult", label: "Priority Consult Pathway", group: "Consults & Scheduling", kind: "toggle", min: 0, max: 1, step: 1, unit: "", baseline: 0, maxEffectDays: 0.9, mediator: "Diagnostic Turnaround", hint: "Fast-track pathway for the top three admitting services." },
      { id: "evening_imaging", label: "Evening Imaging Capacity", group: "Diagnostics", kind: "slider", min: 0, max: 40, step: 5, unit: "%", baseline: 0, maxEffectDays: 1.05, mediator: "Diagnostic Turnaround", hint: "Share of inpatient imaging demand shifted into an evening block." },
      { id: "pharmacy_workflow", label: "Streamline Med Reconciliation", group: "Diagnostics", kind: "toggle", min: 0, max: 1, step: 1, unit: "", baseline: 0, maxEffectDays: 0.48, mediator: "Medication Recon Time", hint: "Move reconciliation to the ward pharmacist workflow." },
      { id: "early_discharge_planning", label: "Discharge Planning at Admission", group: "Beds & Flow", kind: "toggle", min: 0, max: 1, step: 1, unit: "", baseline: 0, maxEffectDays: 0.94, mediator: "Bed Queue Depth", hint: "Begin discharge planning at admission for elective cases." },
      { id: "staffing_ratio", label: "Improve Nurse Staffing Ratio", group: "Beds & Flow", kind: "slider", min: 0, max: 20, step: 2, unit: "%", baseline: 0, maxEffectDays: 0.38, hint: "Additional nursing hours per patient-day on the busiest wards." },
      { id: "pathway_routing", label: "Care-Pathway Routing Discipline", group: "Beds & Flow", kind: "slider", min: 0, max: 30, step: 5, unit: "%", baseline: 0, maxEffectDays: 0.7, hint: "Share of complex cases routed to the standardised pathway." },
    ],
    correlationGroups: [
      { name: "Consult timing", options: [ { label: "Consult > 24h", onTimePct: 49, delayedPct: 51 }, { label: "Consult < 12h", onTimePct: 84, delayedPct: 16 } ] },
      { name: "Imaging block", options: [ { label: "Day only", onTimePct: 63, delayedPct: 37 }, { label: "Day + evening", onTimePct: 86, delayedPct: 14 } ] },
    ],
    methodology: [
      { phase: "Causal Discovery", detail: "Bootstrapped PC algorithm · 20 subsamples × 2,400 rows · 60% edge-stability threshold" },
      { phase: "Effect Estimation", detail: "Double ML (Chernozhukov et al. 2018) · 5-fold cross-fitting · gradient-boosted nuisance models · sandwich SEs" },
      { phase: "Validation", detail: "Planted ground-truth coefficients · placebo-treatment refuter (expected ≈ 0) · 10-seed stability check · bootstrap CIs" },
    ],
    copilotCapabilities: [
      { icon: "alert", title: "What is the top bottleneck?", detail: "Identify the most impactful constraint", tags: ["Bottleneck Analysis", "Root Cause"], prompt: "What is the top bottleneck?" },
      { icon: "chart", title: "Show causal KPI impact", detail: "See which factors drive discharge delay", tags: ["Causal Impact", "KPI Analysis"], prompt: "Which factors have the largest causal impact on discharge delay?" },
      { icon: "flask", title: "Run a what-if simulation", detail: "Test interventions & predict outcomes", tags: ["Simulation", "Forecasting"], prompt: "Run a counterfactual for the worst case" },
      { icon: "doc", title: "Generate executive summary", detail: "AI-powered insights & recommendations", tags: ["AI Summary", "Insights"], prompt: "Generate an executive summary of the causal findings" },
    ],
    annualVolume: 5100,
    costPerDelayDay: 1650,
    treatedPct: 51,
    objectInteractionLabels: ["Admissions", "Patients", "Care Teams", "Diagnostics", "Beds"],
  },
};
