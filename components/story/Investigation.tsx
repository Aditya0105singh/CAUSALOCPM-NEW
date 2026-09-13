"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { PanelsTopLeft } from "lucide-react";
import type { CausalFixture } from "@/lib/engine/types";
import { SCENES, SCENE_LABELS } from "./scenes";
import { MiniStatusStrip } from "./StoryChain";

const SPEEDS = [1, 2, 4];

// what the persistent status strip says at each scene — a one-sentence,
// numbers-in-the-sentence recap of what's been learned so far, so someone
// reading the screen without hearing the presenter can still follow the
// argument. null = hide the strip (scene 1 already has its own full ripple).
function captionFor(i: number, f: CausalFixture): string | null {
  const s = f.story;
  const unit = s.outcomeUnit;
  switch (i) {
    case 0:
      return `About to decide: ${f.narrative.decisionLabel} instead of ${f.narrative.altLabel}`;
    case 1:
      return null;
    case 2:
      return `So far: a dashboard blames ${f.scenario.treatmentLabel} for ${s.cause.naiveDays} ${unit} — checking how much of that is real`;
    case 3:
      return `So far: only ${s.confidenceGap.causalPct}% of that ${s.cause.naiveDays}-day gap is real — testing what the other choice would have done`;
    case 4:
      return `So far: the real effect is ${s.cause.effectDays} ${unit}, not ${s.cause.naiveDays} — see what changing the cause does`;
    case 5:
      return `Fix applied — modeled to save ~${s.action.reductionPct}%, worth ~$${Math.round(s.action.annualSavings / 1000)}K/yr`;
    case 6:
      return "Checking whether this conclusion holds up under stress";
    default:
      return null;
  }
}

export function Investigation({ f, onOpenConsole }: { f: CausalFixture; onOpenConsole: () => void }) {
  const [i, setI] = useState(0);
  const [speed, setSpeed] = useState(1);
  const Scene = SCENES[i];
  const last = i === SCENES.length - 1;

  // final severity the incident reaches, per stage — the strip shows this
  // once the story has moved past the ripple scene
  const incidentSev = useMemo(() => {
    const sev: Record<string, "ok" | "warn" | "crit"> = {};
    for (const step of f.narrative.incident.steps) sev[step.stageId] = step.sev;
    return sev;
  }, [f]);
  const decisionStageId = useMemo(
    () => f.narrative.stages.find((s) => s.agent === f.narrative.agentName)?.id,
    [f],
  );

  const next = useCallback(() => setI((v) => Math.min(SCENES.length - 1, v + 1)), []);
  const prev = useCallback(() => setI((v) => Math.max(0, v - 1)), []);
  const restart = useCallback(() => setI(0), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // restart the domain's story when the domain switches
  useEffect(() => setI(0), [f.domain]);

  return (
    <div className="grid gap-6 lg:grid-cols-[190px_1fr]">
      {/* progress rail */}
      <aside className="no-print hidden lg:block">
        <ol className="sticky top-6 space-y-1">
          {SCENE_LABELS.map((label, idx) => {
            const state = idx === i ? "now" : idx < i ? "done" : "todo";
            return (
              <li key={label}>
                <button
                  onClick={() => setI(idx)}
                  className={clsx(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors",
                    state === "now" && "bg-sage font-semibold text-forest-deep",
                    state === "done" && "text-ink-soft hover:bg-paper-2",
                    state === "todo" && "text-muted hover:bg-paper-2",
                  )}
                >
                  <span
                    className={clsx(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      state === "now" && "bg-forest text-paper",
                      state === "done" && "bg-forest/20 text-forest-deep",
                      state === "todo" && "border border-line text-muted",
                    )}
                  >
                    {idx + 1}
                  </span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <div className="min-w-0">
        {/* controls */}
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="font-semibold uppercase tracking-wide">Guided investigation</span>
            <span>·</span>
            <span>
              {i + 1} / {SCENES.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-line bg-card p-0.5">
              {SPEEDS.map((sp) => (
                <button
                  key={sp}
                  onClick={() => setSpeed(sp)}
                  className={clsx(
                    "rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums transition-colors",
                    sp === speed ? "bg-forest text-paper" : "text-muted hover:text-ink",
                  )}
                >
                  {sp}×
                </button>
              ))}
            </div>
            <button
              onClick={onOpenConsole}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px] font-medium text-ink-soft hover:border-forest/40 hover:text-forest"
            >
              <PanelsTopLeft size={13} /> Full console
            </button>
          </div>
        </div>

        {/* persistent incident status — carries the story's state across scenes */}
        {captionFor(i, f) && (
          <MiniStatusStrip
            stages={f.narrative.stages}
            sev={i === 0 ? {} : incidentSev}
            activeId={i === 0 ? decisionStageId : undefined}
            resolved={i >= 5}
            caption={captionFor(i, f) ?? undefined}
          />
        )}

        {/* scene */}
        <motion.div
          key={f.domain + i}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-[60vh]"
        >
          <Scene f={f} speed={speed} onNext={next} onRestart={restart} last={last} />
        </motion.div>

        {/* prev/next footer */}
        <div className="no-print mt-8 flex items-center justify-between border-t border-line pt-4 text-[12px]">
          <button onClick={prev} disabled={i === 0} className="text-muted hover:text-ink disabled:opacity-30">
            ← Back
          </button>
          <div className="flex gap-1">
            {SCENES.map((_, idx) => (
              <span key={idx} className={clsx("h-1.5 w-1.5 rounded-full", idx === i ? "bg-forest" : "bg-line")} />
            ))}
          </div>
          <button onClick={next} disabled={last} className="text-muted hover:text-ink disabled:opacity-30">
            Skip →
          </button>
        </div>
      </div>
    </div>
  );
}
