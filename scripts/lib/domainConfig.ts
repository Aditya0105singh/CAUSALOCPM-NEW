/**
 * Per-domain narrative + causal ground truth used by the offline fixture builder.
 * No PRIHIR anywhere — the manufacturing tenant is "Northwind Components Co.".
 */

export interface DriverSpec {
  id: string;
  label: string;
  /** true causal effect on the outcome, in outcome units (days) */
  groundTruthDays: number;
  /** naive (confounded) correlation-implied effect the raw logs would suggest */
  naiveDays: number;
  lever: string;
  maxShiftPct: number;
  kind: "driver" | "mediator";
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
  }[];
  counterfactualLabel: string;
  copilotSeed: { q: string; a: string }[];
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
      { id: "transport_time", label: "Transport Time", groundTruthDays: 2.31, naiveDays: 2.55, lever: "Carrier routing", maxShiftPct: 30, kind: "mediator" },
      { id: "warehouse_load", label: "Warehouse Load", groundTruthDays: 1.24, naiveDays: 1.62, lever: "Load balancing", maxShiftPct: 25, kind: "driver" },
      { id: "order_complexity", label: "Order Complexity", groundTruthDays: 0.9, naiveDays: 1.18, lever: "Order batching", maxShiftPct: 20, kind: "driver" },
      { id: "weather_delay", label: "Weather Delay", groundTruthDays: 0.41, naiveDays: 0.44, lever: "Buffer scheduling", maxShiftPct: 15, kind: "driver" },
    ],
    objects: [
      { name: "Orders", records: 4335, attributes: 12, missingPct: 3, qualityPct: 96, updatedHrs: 2 },
      { name: "Shipments", records: 4231, attributes: 10, missingPct: 4, qualityPct: 97, updatedHrs: 2 },
      { name: "Suppliers", records: 245, attributes: 18, missingPct: 6, qualityPct: 94, updatedHrs: 6 },
      { name: "Transport Legs", records: 3876, attributes: 9, missingPct: 5, qualityPct: 95, updatedHrs: 4 },
      { name: "External Factors", records: 2648, attributes: 7, missingPct: 8, qualityPct: 92, updatedHrs: 5 },
    ],
    extraVariables: [
      { name: "supplier_lead_time", object: "Suppliers", type: "numeric", role: "driver", missingPct: 4 },
      { name: "route_distance_km", object: "Transport Legs", type: "numeric", role: "mediator", missingPct: 3 },
      { name: "dock_utilization", object: "Shipments", type: "numeric", role: "driver", missingPct: 5 },
      { name: "sku_count", object: "Orders", type: "numeric", role: "driver", missingPct: 2 },
      { name: "peak_season_demand", object: "External Factors", type: "numeric", role: "confounder", missingPct: 7 },
      { name: "carrier_name", object: "Transport Legs", type: "categorical", role: "context", missingPct: 1 },
      { name: "promised_ship_date", object: "Orders", type: "datetime", role: "context", missingPct: 0 },
      { name: "expedited_flag", object: "Shipments", type: "boolean", role: "driver", missingPct: 0 },
    ],
    entities: ["Supplier A", "Supplier B", "Supplier C", "Supplier D"],
    categories: ["Electronics", "Fasteners", "Assemblies", "Raw Metal", "Packaging"],
    actions: [
      { id: "act-1", title: "Shift ~25% procurement from Supplier A to Supplier B", detail: "Supplier A dependency is the dominant causal driver. Re-routing a quarter of volume to Supplier B cuts exposure without breaching capacity limits.", deltaDays: 4.9, annualSavings: 479000, lever: "Procurement mix", maxShiftPct: 40, confidence: 0.9 },
      { id: "act-2", title: "Optimize transport routes for high-delay lanes", detail: "Consolidate the five worst-performing lanes onto carriers with lower variance in transit time.", deltaDays: 1.2, annualSavings: 112000, lever: "Carrier routing", maxShiftPct: 30, confidence: 0.82 },
      { id: "act-3", title: "Redistribute load across warehouses", detail: "Balance inbound volume away from the two warehouses operating above 90% dock utilization.", deltaDays: 0.8, annualSavings: 81000, lever: "Load balancing", maxShiftPct: 25, confidence: 0.76 },
    ],
    counterfactualLabel: "If we had chosen Supplier B instead of Supplier A",
    copilotSeed: [
      { q: "Why is shipment delay increasing?", a: "Shipment delay is primarily driven by higher dependency on Supplier A and increased transport time. Supplier A has a causal impact of +6.65 days on delay, which is the highest among all factors." },
      { q: "What is the impact of Supplier A?", a: "Supplier A dependency has a recovered causal effect of 6.65 days (95% CI 5.9–7.4). The raw logs suggested 7.91 days, but ~19% of that was confounding from peak-season demand." },
      { q: "Which action has the highest ROI?", a: "Shifting ~25% of procurement from Supplier A to Supplier B: about 4.9 days of delay reduction and ~$479K/year in expected savings at 0.90 confidence." },
    ],
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
      { id: "diagnostic_turnaround", label: "Diagnostic Turnaround", groundTruthDays: 1.05, naiveDays: 1.28, lever: "Lab/imaging capacity", maxShiftPct: 35, kind: "mediator" },
      { id: "bed_availability", label: "Downstream Bed Availability", groundTruthDays: 0.94, naiveDays: 1.21, lever: "Discharge planning", maxShiftPct: 30, kind: "driver" },
      { id: "case_complexity", label: "Case Complexity", groundTruthDays: 0.7, naiveDays: 0.92, lever: "Care pathway routing", maxShiftPct: 20, kind: "driver" },
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
      { id: "act-1", title: "Guarantee specialist consult within 12 hours of request", detail: "Specialist assignment latency is the dominant causal driver. A 12-hour consult SLA on the top three services removes most of the avoidable wait.", deltaDays: 1.35, annualSavings: 610000, lever: "Consult scheduling", maxShiftPct: 45, confidence: 0.88 },
      { id: "act-2", title: "Add evening imaging slots for inpatients", detail: "Shift 20% of inpatient imaging demand into an evening block to cut diagnostic turnaround on the critical path.", deltaDays: 0.7, annualSavings: 240000, lever: "Lab/imaging capacity", maxShiftPct: 35, confidence: 0.8 },
      { id: "act-3", title: "Start discharge planning at admission for elective cases", detail: "Early discharge planning frees downstream beds sooner and reduces the queueing effect on new admissions.", deltaDays: 0.55, annualSavings: 175000, lever: "Discharge planning", maxShiftPct: 30, confidence: 0.74 },
    ],
    counterfactualLabel: "If the specialist consult had happened within 12 hours",
    copilotSeed: [
      { q: "Why is discharge delay increasing?", a: "Discharge delay is primarily driven by specialist assignment latency and diagnostic turnaround. Specialist latency has a causal impact of +1.82 days, the highest among all factors." },
      { q: "What is the impact of specialist latency?", a: "Specialist assignment latency has a recovered causal effect of 1.82 days (95% CI 1.5–2.1). Raw logs suggested 2.15 days, but ~15.5% was confounding from patient acuity." },
      { q: "Which action has the highest ROI?", a: "A 12-hour specialist consult SLA: about 1.35 days of discharge-delay reduction and ~$610K/year in expected savings at 0.88 confidence." },
    ],
  },
};
