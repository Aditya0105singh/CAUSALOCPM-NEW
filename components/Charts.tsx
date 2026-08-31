"use client";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CausalFixture } from "@/lib/engine/types";

/** Recharts' ResponsiveContainer can measure 0px when mounted inside a tab that
 *  was just switched in. Deferring one frame lets layout settle first. */
function Frame({ height, children }: { height: number; children: React.ReactElement }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div style={{ width: "100%", height }}>
      {ready ? (
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}

const AXIS = { fontSize: 11, fill: "#8b887b" };
const GRID = "#e2ddcd";

export function EffectAccuracyChart({ data }: { data: CausalFixture["effectAccuracy"] }) {
  return (
    <Frame height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="bucket" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "rgba(79,122,74,0.08)" }}
          contentStyle={{ borderRadius: 10, border: "1px solid #e2ddcd", fontSize: 12 }}
        />
        <Bar dataKey="count" fill="#4f7a4a" radius={[4, 4, 0, 0]} maxBarSize={46} isAnimationActive={false} />
      </BarChart>
    </Frame>
  );
}

export function ImpactTrendChart({ data }: { data: CausalFixture["projectedImpact"]["trend"] }) {
  return (
    <Frame height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="period" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2ddcd", fontSize: 12 }} />
        <Line type="monotone" dataKey="baseline" stroke="#b9762f" strokeWidth={2} dot={false} name="Baseline" isAnimationActive={false} />
        <Line type="monotone" dataKey="withActions" stroke="#3d5a3d" strokeWidth={2.5} dot={{ r: 3 }} name="With actions" isAnimationActive={false} />
      </LineChart>
    </Frame>
  );
}
