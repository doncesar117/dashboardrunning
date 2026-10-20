"use client";

import { useEffect, useRef, useState } from "react";
import type { Activity } from "@/lib/strava";
import { ANIMS, FRAME_H, FRAME_W, type AnimName } from "@/lib/mascotAnims";
import { addDays, dateOf, daysBetween, km, mondayOf } from "@/lib/stats";
import { isStrength } from "@/lib/sessions";
import { fmtElapsed, type RunningNow } from "@/lib/useRunning";

type Session = { date: string; title?: string; type?: string };

// 256 × 384 px por cuadro → 112 × 168 px en pantalla (medidas enteras para que no haya costuras).
const SCALE = 0.4375;
const W = FRAME_W * SCALE;
const H = FRAME_H * SCALE;

/* ---------- animación por cuadros ---------- */

function Sprite({ anim, loop, onEnd, still }: { anim: AnimName; loop: boolean; onEnd?: () => void; still: boolean }) {
  const [frame, setFrame] = useState(0);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    setFrame(0);
    if (still) return;
    const { durations } = ANIMS[anim];
    let i = 0;
    let timer = 0;
    let alive = true;
    const step = () => {
      timer = window.setTimeout(() => {
        if (!alive) return;
        i += 1;
        if (i >= durations.length) {
          if (loop) i = 0;
          else {
            endRef.current?.();
            return;
          }
        }
        setFrame(i);
        step();
      }, durations[i]);
    };
    step();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [anim, loop, still]);

  return (
    <div
      className="sprite"
      aria-hidden="true"
      style={{
        width: W,
        height: H,
        backgroundImage: `url(/mascota/${anim}.webp)`,
        backgroundSize: `${W * 8}px ${H}px`,
        backgroundPosition: `${-frame * W}px 0`,
      }}
    />
  );
}

/* ---------- qué hace y qué dice según tus datos ---------- */

type State = "idle" | "celebrar" | "dormir" | "cansado";

const sumKm = (rs: Activity[]) => rs.reduce((s, r) => s + km(r.distance), 0);
const when = (n: number) => (n === 1 ? "mañana" : `en ${n} días`);

function decide(today: string, runs: Activity[], sessions: Session[], weeklyGoalKm: number): { state: State; message: string } {
  const todayKm = sumKm(runs.filter((r) => dateOf(r) === today));
  const weekKm = sumKm(runs.filter((r) => dateOf(r) >= mondayOf(today) && dateOf(r) <= today));
  const yesterdayKm = sumKm(runs.filter((r) => dateOf(r) === addDays(today, -1)));
  const todaySession = sessions.find((s) => s.date === today);
  const next = sessions.filter((s) => s.date > today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const label = (s: Session) => s.title ?? s.type ?? "entrenamiento";

  // 1. Ya corriste hoy → celebra
  if (todayKm > 0) return { state: "celebrar", message: `¡Hoy ya corriste ${todayKm.toFixed(1)} km! Eso se celebra.` };

  // 2. Hay plan en uso y hoy no toca salir → descansa
  if (next && !todaySession) {
    return { state: "dormir", message: `Día de descanso. Siguiente: ${label(next)}, ${when(daysBetween(today, next.date))}.` };
  }

  // 3. Mucha carga reciente → cansado
  if (yesterdayKm >= 15) return { state: "cansado", message: `Ayer metiste ${yesterdayKm.toFixed(0)} km. Hoy las piernas piden calma.` };
  if (weeklyGoalKm > 0 && weekKm >= weeklyGoalKm * 0.9) {
    return { state: "cansado", message: `Semana pesada: ya llevas ${weekKm.toFixed(0)} km. Cuida las piernas.` };
  }

  // 4. Todo lo demás → en reposo, esperando para salir
  if (todaySession) return { state: "idle", message: `Hoy toca: ${label(todaySession)}. ${isStrength(todaySession) ? "¡A darle!" : "¿Salimos?"}` };
  if (next) return { state: "idle", message: `Siguiente: ${label(next)}, ${when(daysBetween(today, next.date))}.` };
  return { state: "idle", message: "Listo para salir cuando quieras." };
}

/* ---------- tarjeta de la mascota ---------- */

const ALL: AnimName[] = ["idle", "celebrar", "dormir", "cansado", "saltar", "correr"];

export function Mascot({
  today,
  runs,
  sessions,
  weeklyGoalKm,
  busy,
  running,
}: {
  today: string;
  runs: Activity[];
  sessions: Session[];
  weeklyGoalKm: number;
  busy: boolean;
  running: RunningNow;
}) {
  const base = decide(today, runs, sessions, weeklyGoalKm);
  const [jumping, setJumping] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    // Carga todas las hojas de una vez para que el cambio de animación no parpadee.
    ALL.forEach((n) => {
      const img = new Image();
      img.src = `/mascota/${n}.webp`;
    });
  }, []);

  const live = running.startedAt !== null;
  const anim: AnimName = live ? "correr" : running.justFinished ? "celebrar" : busy ? "correr" : jumping ? "saltar" : base.state;
  const text = live
    ? "¡A darle! Aquí te espero."
    : running.justFinished
      ? "¡Buen trabajo! Tu salida aparecerá cuando Strava la reciba."
      : busy
        ? "Buscando tus datos en Strava…"
        : jumping
          ? "¡Vamos!"
          : base.message;
  const onTap = () => {
    if (reduce || busy || jumping || live || running.justFinished) return;
    setJumping(true);
  };

  return (
    <section className="card mascot">
      <button type="button" className="sprite-btn" onClick={onTap} aria-label="Tu personaje. Tócalo para que salte.">
        <Sprite anim={anim} loop={anim !== "saltar"} onEnd={() => setJumping(false)} still={reduce} />
        <span className="ground" aria-hidden="true" />
      </button>
      <div className="bubble">
        <p key={text} className="fade">
          {text}
        </p>
        {live ? (
          <div className="live">
            <span className="live-now" role="status">
              <i aria-hidden="true" /> Corriendo · {fmtElapsed(running.minutes)}
            </span>
            <button type="button" className="ghost tap" onClick={running.stop}>
              Terminé
            </button>
          </div>
        ) : (
          <div className="live">
            <small>Toca a tu personaje</small>
            <button type="button" className="ghost tap" onClick={running.start} disabled={busy}>
              ▶ Voy a correr
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
