"use client";

import { useEffect, useState } from "react";

// Ids que ya contaron una vez en esta sesión: al cambiar de pestaña y volver
// los números aparecen directo, sin repetir la animación.
const played = new Set<string>();

export function useCountUp(target: number, id: string, duration = 800): number {
  const [value, setValue] = useState(() => (played.has(id) ? target : 0));

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || played.has(id)) {
      setValue(target);
      played.add(id);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else played.add(id);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, id, duration]);

  return value;
}
