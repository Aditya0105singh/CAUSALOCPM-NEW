import type { CausalFixture } from "./engine/types";
import { DOMAINS } from "@/scripts/lib/domainConfig";

/** Compact factual context handed to Claude (or used to build scripted replies). */
export function buildContext(f: CausalFixture): string {
  const top = f.effects[0];
  return [
    `Scenario: ${f.scenario.org} — ${f.scenario.name} (${f.scenario.timeRange}).`,
    `Outcome: ${f.scenario.outcomeVariable} in ${f.scenario.outcomeUnit}.`,
    `${f.scenario.totalEvents.toLocaleString()} events across ${f.scenario.objectTypes} object types, ${f.scenario.dataSources} data sources.`,
    `Discovery: precision ${f.discoveryMetrics.precision}, recall ${f.discoveryMetrics.recall}, F1 ${f.discoveryMetrics.f1}, ${f.discoveryMetrics.bootstrapRuns} bootstrap runs, SHD ${f.discoveryMetrics.shd}.`,
    `Recovered causal effects (days): ${f.effects
      .map((e) => `${e.label} ${e.effectDays} (naive ${e.baselineDays}, ${e.reductionPct}% was confounding, ${e.method})`)
      .join("; ")}.`,
    `Dominant driver: ${top.label} at ${top.effectDays} ${f.scenario.outcomeUnit} (95% CI ${top.ciLow}–${top.ciHigh}).`,
    `Recommended actions: ${f.recommendedActions
      .map((a) => `${a.title} (−${a.deltaDays}d, ~$${Math.round(a.annualSavings / 1000)}K/yr, ROI ${a.roi}x, ${Math.round(a.confidence * 100)}% conf)`)
      .join("; ")}.`,
    `Projected combined impact: ${f.projectedImpact.totalReductionPct}% (${f.projectedImpact.totalReductionDays} days).`,
  ].join("\n");
}

export function systemPrompt(f: CausalFixture): string {
  return `You are the CausalOCPM Decision Intelligence Copilot. CausalOCPM is a causal audit layer that combines object-centric process mining with structural causal models to explain autonomous / agentic business-process decisions.

Answer ONLY from the grounded facts below. Be concise (2-4 sentences), quantitative, and distinguish causation from correlation. If asked something the facts don't cover, say so briefly.

GROUNDED FACTS
${buildContext(f)}`;
}

/** Offline fallback — keyword routed answers derived from the fixture. */
export function groundedAnswer(f: CausalFixture, question: string): string {
  const q = question.toLowerCase();
  const seed = DOMAINS[f.domain].copilotSeed.find((s) => overlap(s.q.toLowerCase(), q) >= 2);
  if (seed) return seed.a;

  const top = f.effects[0];

  if (/(roi|savings|action|recommend|do|fix)/.test(q)) {
    const a = f.recommendedActions[0];
    return `${a.title}. Expected impact ~${a.deltaDays} ${f.scenario.outcomeUnit} of reduction and ~$${Math.round(
      a.annualSavings / 1000,
    )}K/year at ${Math.round(a.confidence * 100)}% confidence (ROI ${a.roi}×).`;
  }
  if (/(confound|bias|correlat|spurious|adjust)/.test(q)) {
    return `Raw event logs suggested ${top.label} drove ${top.baselineDays} ${f.scenario.outcomeUnit}, but ${top.reductionPct}% of that was confounding from ${DOMAINS[f.domain].confounder.label}. After backdoor adjustment via Double ML, the true causal effect is ${top.effectDays} ${f.scenario.outcomeUnit}.`;
  }
  if (/(counterfactual|what if|what-if|had we|instead)/.test(q)) {
    const c = [...f.cases].sort((a, b) => b.actualDelayDays - a.actualDelayDays)[0];
    return `Take case ${c.id}: actual ${c.actualDelayDays} ${f.scenario.outcomeUnit}. ${c.counterfactualLabel} → estimated ${c.counterfactualDelayDays} ${f.scenario.outcomeUnit}, a reduction of ${(c.actualDelayDays - c.counterfactualDelayDays).toFixed(1)} ${f.scenario.outcomeUnit}.`;
  }
  if (/(precision|recall|accuracy|f1|reliab|trust|valid)/.test(q)) {
    const m = f.discoveryMetrics;
    return `DAG recovery: precision ${m.precision}, recall ${m.recall}, F1 ${m.f1}, stable across ${m.bootstrapRuns} bootstrap reruns (SHD ${m.shd}). Model reliability is ${f.scenario.reliabilityPct}%.`;
  }
  if (/(driver|cause|why|impact|factor)/.test(q)) {
    return `The dominant causal driver of ${f.scenario.outcomeVariable.toLowerCase()} is ${top.label}, with a recovered effect of ${top.effectDays} ${f.scenario.outcomeUnit} (95% CI ${top.ciLow}–${top.ciHigh}). Next are ${f.effects
      .slice(1, 3)
      .map((e) => `${e.label} (${e.effectDays}d)`)
      .join(" and ")}.`;
  }
  return `For the ${f.scenario.org} ${f.scenario.name}: ${f.executiveSummary.headline} ${f.executiveSummary.bullets[0]}.`;
}

function overlap(a: string, b: string): number {
  const wa = new Set(a.split(/\W+/).filter((w) => w.length > 3));
  return [...wa].filter((w) => b.includes(w)).length;
}
