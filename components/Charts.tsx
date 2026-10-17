"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
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
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, "0")}`;
}

const tooltipStyle = {
  borderRadius: 12,
  border: "none",
  boxShadow: "0 6px 24px rgba(0,0,0,.15)",
  fontSize: 12,
};

export type WeekBar = { label: string; start: string; km: number };

// Tocar cualquier parte de una columna selecciona esa semana.
export function WeeklyChart({
  data,
  goal,
  selected,
  onSelect,
}: {
  data: WeekBar[];
  goal: number;
  selected: string;
  onSelect: (start: string) => void;
}) {
  return (
    <div style={{ width: "100%", height: 200, cursor: "pointer" }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, left: -22, bottom: 0 }}
          onClick={(e) => {
            const start = (e as { activePayload?: { payload?: WeekBar }[] } | null)?.activePayload?.[0]?.payload?.start;
            if (start) onSelect(start);
          }}
        >
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
          <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis
            tick={tick}
            tickLine={false}
            axisLine={false}
            domain={[0, (max: number) => Math.ceil(Math.max(max, goal) * 1.1)]}
          />
          <ReferenceLine y={goal} stroke="currentColor" strokeOpacity={0.35} strokeDasharray="4 4" />
          <Tooltip
            cursor={{ fill: "rgba(76,194,48,.12)" }}
            contentStyle={tooltipStyle}
            formatter={(v: number) => [`${v} km`, "Semana"]}
            labelFormatter={(l) => `Semana del ${l}`}
          />
          <Bar dataKey="km" radius={[8, 8, 0, 0]} animationDuration={700}>
            {data.map((d) => (
              <Cell key={d.start} fill={GREEN} fillOpacity={d.start === selected ? 1 : 0.4} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
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
          <Line
            type="monotone"
            dataKey="pace"
            stroke={GREEN}
            strokeWidth={3}
            dot={{ r: 3, fill: GREEN, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            animationDuration={700}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
