"use client";
import { motion, AnimatePresence } from "framer-motion";

type Sev = "ok" | "warn" | "crit";
const DOT = { ok: "#3d5a3d", warn: "#b1702c", crit: "#b0413a" } as const;

export type Stage = { id: string; label: string; agent?: string };

/**
 * Persistent, compact version of the ripple chain — meant to sit above every
 * scene in the guided story so the incident's state carries across screens
 * instead of resetting each time. `resolved` flips every stage green with a
 * soft "settling" transition, used once the recommended action is reached.
 */
export function MiniStatusStrip({
  stages,
  sev,
  activeId,
  resolved = false,
  caption,
}: {
  stages: Stage[];
  sev: Record<string, Sev>;
  activeId?: string;
  resolved?: boolean;
  caption?: string;
}) {
  const W = 640;
  const H = 46;
  const gap = W / stages.length;
  return (
    <div className="mb-4 rounded-xl border border-line-soft bg-paper-2/50 px-3 py-2">
      <div className="scroll-slim overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[420px]" style={{ height: H }}>
          {stages.slice(0, -1).map((_, i) => (
            <line
              key={i}
              x1={gap * (i + 0.5)}
              y1={H / 2}
              x2={gap * (i + 1.5)}
              y2={H / 2}
              stroke="#d9d2c2"
              strokeWidth={1.2}
            />
          ))}
          {stages.map((s, i) => {
            const cx = gap * (i + 0.5);
            const st: Sev = resolved ? "ok" : (sev[s.id] ?? "ok");
            const active = activeId === s.id;
            return (
              <g key={s.id}>
                {active && (
                  <motion.circle
                    cx={cx}
                    cy={H / 2}
                    fill="none"
                    stroke={DOT[st]}
                    strokeWidth={1.2}
                    initial={{ r: 7, opacity: 0.7 }}
                    animate={{ r: 15, opacity: 0 }}
                    transition={{ duration: 1.3, repeat: Infinity }}
                  />
                )}
                <motion.circle
                  cx={cx}
                  cy={H / 2}
                  r={5.5}
                  animate={{ fill: DOT[st] }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
                <text x={cx} y={H / 2 + 17} textAnchor="middle" className="fill-muted" style={{ fontSize: 8.5, fontWeight: 600 }}>
                  {s.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <AnimatePresence mode="wait">
        {caption && (
          <motion.div
            key={caption}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-0.5 text-center text-[10.5px] text-muted"
          >
            {caption}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Controlled horizontal supply-chain flow. Parent drives severity + which node is active. */
export function StoryChain({
  stages,
  sev,
  activeId,
  reachedIndex = -1,
  height = 150,
}: {
  stages: Stage[];
  sev: Record<string, Sev>;
  activeId?: string;
  reachedIndex?: number;
  height?: number;
}) {
  const W = 760;
  const gap = W / stages.length;
  return (
    <div className="scroll-slim overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full min-w-[560px]" style={{ height }}>
        {stages.slice(0, -1).map((_, i) => {
          const lit = i < reachedIndex;
          return (
            <line
              key={i}
              x1={gap * (i + 0.5)}
              y1={height / 2}
              x2={gap * (i + 1.5)}
              y2={height / 2}
              stroke={lit ? DOT.warn : "#d9d2c2"}
              strokeWidth={lit ? 2.5 : 1.5}
              strokeDasharray="5 5"
              className={lit ? "flow-dash" : undefined}
            />
          );
        })}
        {stages.map((s, i) => {
          const cx = gap * (i + 0.5);
          const st: Sev = sev[s.id] ?? "ok";
          const active = activeId === s.id;
          return (
            <g key={s.id}>
              {active && (
                <motion.circle
                  cx={cx}
                  cy={height / 2}
                  fill="none"
                  stroke={DOT[st]}
                  strokeWidth={1.5}
                  initial={{ r: 12, opacity: 0.8 }}
                  animate={{ r: 27, opacity: 0 }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
              <motion.circle cx={cx} cy={height / 2} r={11} animate={{ fill: DOT[st] }} transition={{ duration: 0.4 }} />
              <text x={cx} y={height / 2 + 33} textAnchor="middle" className="fill-ink" style={{ fontSize: 11, fontWeight: 600 }}>
                {s.label}
              </text>
              {s.agent && (
                <text x={cx} y={height / 2 - 21} textAnchor="middle" className="fill-forest" style={{ fontSize: 8.5 }}>
                  ▸ {s.agent}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
