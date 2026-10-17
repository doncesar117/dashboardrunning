"use client";

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

const GREEN = "#4CC230";
const tick = { fill: "currentColor", opacity: 0.6, fontSize: 11 };

function fmtPace(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const tooltipStyle = {
  borderRadius: 12,
  border: "none",
  boxShadow: "0 6px 24px rgba(0,0,0,.15)",
  fontSize: 12,
};

export function WeeklyChart({ data, goal }: { data: { label: string; km: number }[]; goal: number }) {
  return (
    <div style={{ width: "100%", height: 190 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
          <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={tick} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(76,194,48,.12)" }}
            contentStyle={tooltipStyle}
            formatter={(v: number) => [`${v} km`, "Semana"]}
            labelFormatter={(l) => `Semana del ${l}`}
          />
          <Bar dataKey="km" fill={GREEN} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>
        Meta semanal: {goal} km
      </p>
    </div>
  );
}

export function PaceChart({ data }: { data: { label: string; pace: number; km: number }[] }) {
  return (
    <div style={{ width: "100%", height: 190 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
          <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis
            reversed
            domain={["dataMin - 15", "dataMax + 15"]}
            tick={tick}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => fmtPace(v)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, _n, item) => [`${fmtPace(v)} /km · ${item?.payload?.km} km`, "Ritmo"]}
          />
          <Line type="monotone" dataKey="pace" stroke={GREEN} strokeWidth={3} dot={{ r: 3, fill: GREEN, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
