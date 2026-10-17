"use client";

import { useEffect, useState } from "react";
import { useCountUp } from "./useCountUp";

export function Ring({ value, goal, size = 148 }: { value: number; goal: number; size?: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 60);
    return () => clearTimeout(t);
  }, []);

  const shown = useCountUp(value, "ring");
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const filled = on ? pct : 0;

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${value.toFixed(1)} de ${goal} km esta semana`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#4CC230"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * filled} ${c}`}
          strokeOpacity={filled > 0 ? 1 : 0}
          style={{ transition: "stroke-dasharray 1.1s cubic-bezier(.2,.8,.2,1), stroke-opacity .3s ease" }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-label">
        <strong>{shown.toFixed(1)}</strong>
        <span>de {goal} km</span>
      </div>
    </div>
  );
}
