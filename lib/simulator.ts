import type { CausalFixture, Lever } from "./engine/types";

export type LeverValues = Record<string, number>;

export interface SimResult {
  baseline: number;
  predicted: number;
  deltaDays: number;
  deltaPct: number;
  throughput: number;
  throughputDelta: number;
  riskIndex: number;
  riskDelta: number;
  annualSavings: number;
  implCost: number;
  roiPaybackMonths: number | null;
  contributions: { label: string; deltaDays: number }[];
  mediatorStates: { name: string; unit: string; baseline: number; predicted: number; delta: number }[];
}

/** Fraction of this lever's range currently deflected from baseline (0..1). */
export function deflection(lever: Lever, value: number): number {
  const span = lever.max - lever.min;
  if (span === 0) return 0;
  if (lever.kind === "toggle") return value >= 1 ? 1 : 0;
  // some levers improve as the value goes DOWN (e.g. an SLA in hours)
  const improvesDown = lever.baseline > (lever.max + lever.min) / 2;
  const raw = improvesDown ? (lever.baseline - value) / (lever.baseline - lever.min || 1) : (value - lever.baseline) / (lever.max - lever.baseline || 1);
  return Math.max(0, Math.min(1, raw));
}

export function defaultLeverValues(f: CausalFixture): LeverValues {
  return Object.fromEntries(f.simulator.levers.map((l) => [l.id, l.baseline]));
}

export function simulate(f: CausalFixture, values: LeverValues): SimResult {
  const s = f.simulator;
  const baseline = s.baselineOutcome;

  const contributions = s.levers
    .map((l) => {
      const d = deflection(l, values[l.id] ?? l.baseline);
      // diminishing returns so stacked levers never overshoot into nonsense
      const eff = -l.maxEffectDays * Math.pow(d, 0.85);
      return { label: l.label, deltaDays: round(eff) };
    })
    .filter((c) => Math.abs(c.deltaDays) > 0.001);

  const totalDelta = clampReduction(
    contributions.reduce((acc, c) => acc + c.deltaDays, 0),
    baseline,
  );
  const predicted = round(Math.max(baseline * 0.25, baseline + totalDelta));
  const deltaDays = round(predicted - baseline);
  const deltaPct = round((deltaDays / baseline) * 100, 1);

  const improveFrac = -deltaDays / baseline;
  const throughputDelta = Math.round(improveFrac * s.throughputBaseline * 0.35);
  const riskDelta = round(-improveFrac * 40, 1);

  const annualSavings = Math.round(-deltaDays * s.costPerDelayDay * s.annualVolume);
  const implCost = Math.round(
    s.levers.reduce((acc, l) => {
      const d = deflection(l, values[l.id] ?? l.baseline);
      const unitCost = l.group.includes("Capacity") || l.group.includes("Beds") ? 90000 : l.kind === "toggle" ? 40000 : 22000;
      return acc + d * unitCost;
    }, 0),
  );
  const roiPaybackMonths = annualSavings > 0 && implCost > 0 ? round((implCost / annualSavings) * 12, 1) : implCost === 0 && annualSavings > 0 ? 0 : null;

  const mediatorStates = s.mediators.map((m) => {
    const pull = s.levers
      .filter((l) => l.mediator === m.name)
      .reduce((acc, l) => acc + deflection(l, values[l.id] ?? l.baseline), 0);
    const predictedM = round(m.baseline * (1 - Math.min(0.55, pull * 0.28)), 2);
    return { name: m.name, unit: m.unit, baseline: m.baseline, predicted: predictedM, delta: round(predictedM - m.baseline, 2) };
  });

  return {
    baseline,
    predicted,
    deltaDays,
    deltaPct,
    throughput: s.throughputBaseline + throughputDelta,
    throughputDelta,
    riskIndex: round(s.riskBaseline + riskDelta, 1),
    riskDelta,
    annualSavings,
    implCost,
    roiPaybackMonths,
    contributions,
    mediatorStates,
  };
}

/** Cheapest lever combination that reaches a target % reduction. */
export function recommendPlan(f: CausalFixture, targetPct: number) {
  const baseline = f.simulator.baselineOutcome;
  const targetDays = -(baseline * targetPct) / 100;
  const ranked = [...f.simulator.levers]
    .map((l) => {
      const cost = l.group.includes("Capacity") || l.group.includes("Beds") ? 90000 : l.kind === "toggle" ? 40000 : 22000;
      return { lever: l, costPerDay: cost / l.maxEffectDays, cost };
    })
    .sort((a, b) => a.costPerDay - b.costPerDay);

  const chosen: { label: string; setting: string; deltaDays: number; id: string; value: number }[] = [];
  let acc = 0;
  let implCost = 0;
  for (const r of ranked) {
    if (acc <= targetDays) break;
    const l = r.lever;
    chosen.push({
      id: l.id,
      label: l.label,
      setting: l.kind === "toggle" ? "Enabled" : `${l.hint.includes("SLA") ? "12" : Math.round(l.max)}${l.unit}`,
      deltaDays: round(-l.maxEffectDays),
      value: l.kind === "toggle" ? 1 : (l.baseline > (l.max + l.min) / 2 ? l.min : l.max),
    });
    acc -= l.maxEffectDays;
    implCost += r.cost;
  }
  const predicted = round(Math.max(baseline * 0.25, baseline + Math.max(acc, targetDays)));
  const annualSavings = Math.round((baseline - predicted) * f.simulator.costPerDelayDay * f.simulator.annualVolume);
  return {
    reachable: acc <= targetDays,
    predicted,
    reductionPct: round(((baseline - predicted) / baseline) * 100),
    implCost,
    annualSavings,
    paybackMonths: annualSavings > 0 ? round((implCost / annualSavings) * 12, 1) : 0,
    levers: chosen,
  };
}

function round(n: number, d = 2) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
function clampReduction(delta: number, baseline: number) {
  return Math.max(delta, -baseline * 0.75);
}
