"use client";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
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

export function CoefficientChart({ data }: { data: CausalFixture["coefficients"] }) {
  const rows = data.map((d) => ({
    edge: d.edge.replace(/ → .*/, " →"),
    Estimated: d.estimated,
    "Ground truth": d.groundTruth,
  }));
  return (
    <Frame height={Math.max(200, rows.length * 34)}>
      <BarChart layout="vertical" data={rows} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis type="category" dataKey="edge" tick={{ ...AXIS, fontSize: 10 }} width={130} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2ddcd", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Estimated" fill="#4f7a4a" radius={[0, 3, 3, 0]} maxBarSize={9} isAnimationActive={false} />
        <Bar dataKey="Ground truth" fill="#c9b79a" radius={[0, 3, 3, 0]} maxBarSize={9} isAnimationActive={false} />
      </BarChart>
    </Frame>
  );
}

export function CateChart({ segments, ate }: { segments: CausalFixture["cate"]["segments"]; ate: number }) {
  const rows = segments.map((s) => ({
    label: s.label,
    effect: s.effect,
    err: [s.effect - s.ciLow, s.ciHigh - s.effect] as [number, number],
  }));
  return (
    <Frame height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2ddcd", fontSize: 12 }} />
        <ReferenceLine y={ate} stroke="#b9762f" strokeDasharray="4 4" label={{ value: "ATE", fontSize: 10, fill: "#b9762f" }} />
        <Bar dataKey="effect" radius={[3, 3, 0, 0]} maxBarSize={54} isAnimationActive={false}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.effect > ate ? "#3d5a3d" : "#9bb08a"} />
          ))}
          <ErrorBar dataKey="err" width={4} strokeWidth={1.5} stroke="#55534a" />
        </Bar>
      </BarChart>
    </Frame>
  );
}

export function SensitivitySweepChart({
  strengths,
  estimates,
  reported,
}: {
  strengths: number[];
  estimates: number[];
  reported: number;
}) {
  const rows = strengths.map((s, i) => ({ label: `${Math.round(s * 100)}%`, estimate: estimates[i] }));
  return (
    <Frame height={220}>
      <LineChart data={rows} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[0, "dataMax + 1"]} />
        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2ddcd", fontSize: 12 }} />
        <ReferenceLine y={reported} stroke="#3d5a3d" strokeDasharray="4 4" label={{ value: `reported ${reported}`, fontSize: 10, fill: "#3d5a3d", position: "insideTopRight" }} />
        <Line type="monotone" dataKey="estimate" stroke="#b9762f" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} name="Estimate under assumed confounding" />
      </LineChart>
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
