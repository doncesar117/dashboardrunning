"use client";

import { useCallback, useEffect, useState } from "react";
import type { Activity } from "@/lib/strava";

// Estado "corriendo ahora". Se guarda en este mismo dispositivo (localStorage).
const KEY = "running-now";
export const MAX_RUN_MS = 4 * 60 * 60 * 1000; // se apaga solo a las 4 horas
const GRACE_MS = 10 * 60 * 1000; // margen por si iniciaste el reloj antes de tocar el botón

function read(): number | null {
  try {
    const v = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

function write(v: number | null) {
  try {
    if (v) window.localStorage.setItem(KEY, String(v));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento: el estado vive solo mientras la página esté abierta */
  }
}

export type RunningNow = {
  startedAt: number | null;
  minutes: number;
  justFinished: boolean;
  start: () => void;
  stop: () => void;
};

export function useRunning(runs: Activity[]): RunningNow {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [justFinished, setJustFinished] = useState(false);

  // Recupera el estado guardado y lo mantiene al día entre pestañas.
  useEffect(() => {
    setStartedAt(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) setStartedAt(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Reloj ligero: una vez cada 15 s basta para mostrar minutos.
  useEffect(() => {
    if (!startedAt) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    const onVisible = () => document.visibilityState === "visible" && setNow(Date.now());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [startedAt]);

  const stop = useCallback((celebrate = true) => {
    write(null);
    setStartedAt(null);
    if (celebrate) setJustFinished(true);
  }, []);

  const start = useCallback(() => {
    const t = Date.now();
    write(t);
    setStartedAt(t);
    setNow(t);
    setJustFinished(false);
  }, []);

  // La felicitación dura unos segundos.
  useEffect(() => {
    if (!justFinished) return;
    const id = window.setTimeout(() => setJustFinished(false), 7000);
    return () => window.clearTimeout(id);
  }, [justFinished]);

  // Se apaga solo: pasaron 4 horas, o ya llegó a Strava una salida posterior al inicio.
  useEffect(() => {
    if (!startedAt) return;
    const arrived = runs.some((r) => r.start_date && Date.parse(r.start_date) >= startedAt - GRACE_MS);
    if (arrived || now - startedAt > MAX_RUN_MS) stop(false);
  }, [startedAt, now, runs, stop]);

  const minutes = startedAt ? Math.max(0, Math.floor((now - startedAt) / 60000)) : 0;
  return { startedAt, minutes, justFinished, start: () => start(), stop: () => stop(true) };
}

export function fmtElapsed(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}
