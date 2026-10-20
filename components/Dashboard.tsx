"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { refreshStrava } from "@/app/actions";
import type { Activity, Shoe } from "@/lib/strava";
import {
  addDays,
  bestEfforts,
  dateOf,
  daysBetween,
  fmtDateShort,
  fmtPace,
  fmtTime,
  km,
  mondayOf,
  paceSeries,
  parseTime,
  predictions,
  shoeStats,
  summary,
  unassignedRuns,
  weeklyKm,
} from "@/lib/stats";
import { PaceChart, WeeklyChart } from "./Charts";
import { Chevron, Collapsible, Expandable } from "./Expandable";
import { IconHome, IconPlan, IconPlay, IconProgress, IconRefresh, IconShoe } from "./Icons";
import { isStrength, linkLabel, notesText, sessionLinks, type LinkFields } from "@/lib/sessions";
import { Mascot } from "./Mascot";
import { Ring } from "./Ring";
import { fmtElapsed, useRunning, type RunningNow } from "@/lib/useRunning";
import { Segmented } from "./Segmented";
import { useCountUp } from "./useCountUp";

/* ---------- tipos ---------- */

export type Session = LinkFields & {
  date: string;
  duration_min?: number;
  type?: string;
  title?: string;
  distance_km?: number;
  pace_target?: string;
  expected_time?: string;
  shoe?: string;
};

export type Goal = { name?: string; date?: string; distance_km?: number; target_time?: string };

export type DashboardProps = {
  today: string;
  updated: string;
  runs: Activity[];
  shoes: Shoe[] | null;
  config: { weeklyGoalKm: number; shoeLifeKm: number; shoeLifeOverrides: Record<string, number> };
  goal?: Goal;
  sessions: Session[];
};

const TABS = [
  { id: "inicio", label: "Inicio", title: "Running", icon: <IconHome /> },
  { id: "plan", label: "Plan", title: "Plan", icon: <IconPlan /> },
  { id: "progreso", label: "Progreso", title: "Progreso", icon: <IconProgress /> },
  { id: "tenis", label: "Tenis", title: "Tenis", icon: <IconShoe /> },
] as const;
type TabId = (typeof TABS)[number]["id"];

/* ---------- utilidades ---------- */

const paceOf = (r: Activity) => r.moving_time / km(r.distance);
const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

function relDay(n: number): string {
  if (n === 0) return "Hoy";
  if (n === 1) return "Mañana";
  if (n === -1) return "Ayer";
  return n > 1 ? `En ${n} días` : `Hace ${-n} días`;
}

const sameShoe = (a?: string, b?: string) => {
  if (!a || !b) return false;
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  return x.includes(y) || y.includes(x);
};

const sessionMeta = (s: Session) =>
  [s.duration_min ? `${s.duration_min} min` : null, s.distance_km ? `${s.distance_km} km` : null, s.pace_target ? `${s.pace_target} /km` : null, s.expected_time ? `≈ ${s.expected_time}` : null]
    .filter(Boolean)
    .join(" · ");

const sortDesc = (a: Activity, b: Activity) => b.start_date_local.localeCompare(a.start_date_local);

/* ---------- piezas pequeñas ---------- */

function Stat({ id, value, decimals = 0, suffix = "", label }: { id: string; value: number; decimals?: number; suffix?: string; label: string }) {
  const v = useCountUp(value, id);
  return (
    <div className="stat">
      <b>
        {v.toFixed(decimals)}
        {suffix}
      </b>
      <span>{label}</span>
    </div>
  );
}

function RunRow({ run, shoeName }: { run: Activity; shoeName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`item xrow ${open ? "open" : ""}`}>
      <button type="button" className="xhead tap" aria-expanded={open} onClick={() => setOpen(!open)}>
        <div className="date">{fmtDateShort(dateOf(run))}</div>
        <div className="body">
          <div className="title">{run.name}</div>
          <div className="meta">
            {km(run.distance).toFixed(1)} km · {fmtPace(paceOf(run))} /km
          </div>
        </div>
        <Chevron />
      </button>
      <Expandable open={open}>
        <div className="xbody">
          <div>Tiempo: {fmtTime(run.moving_time)}</div>
          {run.total_elevation_gain > 0 && <div>Desnivel: +{Math.round(run.total_elevation_gain)} m</div>}
          {run.average_heartrate ? <div>Frecuencia cardiaca: {Math.round(run.average_heartrate)} ppm</div> : null}
          {shoeName && <div>👟 {shoeName}</div>}
        </div>
      </Expandable>
    </div>
  );
}

/* ---------- Inicio ---------- */

type Ctx = DashboardProps & { goTo: (t: TabId) => void; busy: boolean; running: RunningNow };

function GoalCard({ goal, today, runs }: { goal: Goal; today: string; runs: Activity[] }) {
  const days = goal.date ? daysBetween(today, goal.date) : -1;
  const animated = useCountUp(Math.max(days, 0), "goaldays", 900);
  if (!goal.date || days < 0) return null;

  const pred = predictions(runs, today);
  const goalSec = parseTime(goal.target_time);
  const goalPace = goalSec && goal.distance_km ? goalSec / goal.distance_km : null;
  const goalPred = pred && goal.distance_km ? pred.base.time * Math.pow(goal.distance_km / pred.base.km, 1.06) : null;

  return (
    <section className="card goal">
      <h2>{goal.name ?? "Próxima carrera"}</h2>
      <div className="big">
        {Math.round(animated)} {days === 1 ? "día" : "días"}
      </div>
      <div className="row">
        {goal.target_time && (
          <div>
            <b>{goal.target_time}</b>
            Meta
          </div>
        )}
        {goalPace && (
          <div>
            <b>{fmtPace(goalPace)} /km</b>
            Ritmo meta
          </div>
        )}
        {goalPred && (
          <div>
            <b>{fmtTime(goalPred)}</b>
            Proyección hoy
          </div>
        )}
      </div>
    </section>
  );
}

function InicioPanel({ today, runs, shoes, config, goal, sessions, goTo, busy, running }: Ctx) {
  const sum = summary(runs, today);
  const upcoming = sessions.filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const next = upcoming[0];

  const monday = mondayOf(today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const [selDay, setSelDay] = useState(today);
  const [moreRuns, setMoreRuns] = useState(false);

  const dayRuns = runs.filter((r) => dateOf(r) === selDay);
  const dayKm = dayRuns.reduce((s, r) => s + km(r.distance), 0);
  const dayTime = dayRuns.reduce((s, r) => s + r.moving_time, 0);
  const dayPlan = sessions.find((s) => s.date === selDay);

  const recent = [...runs].sort(sortDesc).slice(0, 8);
  const visible = moreRuns ? recent : recent.slice(0, 3);
  const shoeName = (id: string | null) => shoes?.find((s) => s.id === id)?.name;

  return (
    <>
      <Mascot today={today} runs={runs} sessions={sessions} weeklyGoalKm={config.weeklyGoalKm} busy={busy} running={running} />

      <section className="card hero">
        <Ring value={sum.weekKm} goal={config.weeklyGoalKm} />
        <div className="stats">
          <Stat id="salidas" value={sum.weekRuns} label="salidas esta semana" />
          <Stat id="km28" value={sum.km28} suffix=" km" label="últimos 28 días" />
          <div className="stat">
            <b>{fmtPace(sum.avgPace28)} /km</b>
            <span>ritmo promedio 28 días</span>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="chd">
          <h2>Siguiente entrenamiento</h2>
          {next && <span className="pill">{relDay(daysBetween(today, next.date))}</span>}
        </div>
        {next ? (
          <>
            <div className="nx-title">{next.title ?? next.type ?? "Entrenamiento"}</div>
            <div className="meta">
              {fmtDateShort(next.date)}
              {sessionMeta(next) ? ` · ${sessionMeta(next)}` : ""}
            </div>
            {next.shoe && !isStrength(next) && <div className="meta">👟 {next.shoe}</div>}
            <VideoButtons links={sessionLinks(next)} className="vlinks main" />
            <button type="button" className="more tap" onClick={() => goTo("plan")}>
              Ver plan completo
            </button>
          </>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
            Todavía no hay entrenamientos cargados. Pídele a Claude tu plan de la semana y aparecerá aquí.
          </p>
        )}
      </section>

      <section className="card">
        <div className="chd">
          <h2>Esta semana</h2>
          <span className="muted" style={{ fontSize: 12 }}>
            {sum.weekKm.toFixed(1)} km
          </span>
        </div>
        <div className="wk">
          {week.map((d, i) => {
            const k = runs.filter((r) => dateOf(r) === d).reduce((s, r) => s + km(r.distance), 0);
            return (
              <button
                key={d}
                type="button"
                className={`${d === today ? "today" : ""} ${d === selDay ? "sel" : ""}`}
                aria-label={fmtDateShort(d)}
                aria-pressed={d === selDay}
                onClick={() => setSelDay(d)}
              >
                <span className={`dot ${k > 0 ? "ran" : ""}`}>{k > 0 ? Math.round(k) : ""}</span>
                <small>{DAY_LETTERS[i]}</small>
              </button>
            );
          })}
        </div>
        <p className="wk-detail">
          <b>{fmtDateShort(selDay)}</b>
          {" · "}
          {dayRuns.length > 0
            ? `${dayKm.toFixed(1)} km · ${fmtPace(dayTime / dayKm)} /km${dayRuns.length > 1 ? ` · ${dayRuns.length} salidas` : ""}`
            : dayPlan
              ? `Plan: ${dayPlan.title ?? dayPlan.type ?? "Entrenamiento"}`
              : selDay > today
                ? "Sin plan"
                : "Sin salida"}
        </p>
      </section>

      {goal && <GoalCard goal={goal} today={today} runs={runs} />}

      <section className="card last">
        <h2>Últimas salidas</h2>
        {recent.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Aún no hay salidas registradas en Strava.
          </p>
        ) : (
          <>
            <div className="list">
              {visible.map((r) => (
                <RunRow key={r.id} run={r} shoeName={shoeName(r.gear_id)} />
              ))}
            </div>
            {recent.length > 3 && (
              <button type="button" className="more tap" onClick={() => setMoreRuns(!moreRuns)}>
                {moreRuns ? "Ver menos" : `Ver más (${recent.length - 3})`}
              </button>
            )}
          </>
        )}
      </section>
    </>
  );
}

/* ---------- Plan ---------- */

function VideoButtons({ links, className = "vlinks" }: { links: ReturnType<typeof sessionLinks>; className?: string }) {
  if (links.length === 0) return null;
  return (
    <div className={className}>
      {links.map((l) => (
        <a key={l.url} className="vbtn tap" href={l.url} target="_blank" rel="noopener noreferrer">
          <IconPlay /> {linkLabel(l)}
        </a>
      ))}
    </div>
  );
}

function SessionItem({ s, open, onToggle, runs, shoes, past }: { s: Session; open: boolean; onToggle: () => void; runs: Activity[]; shoes: Shoe[] | null; past: boolean }) {
  const strength = isStrength(s);
  const links = sessionLinks(s);
  const notes = notesText(s);
  const direct = strength && links.length === 1; // un solo video: tocar la sesión abre YouTube
  const done = strength ? [] : runs.filter((r) => dateOf(r) === s.date);
  const d = done.reduce((sum, r) => sum + km(r.distance), 0);
  const t = done.reduce((sum, r) => sum + r.moving_time, 0);
  const usedShoes = Array.from(new Set(done.map((r) => shoes?.find((x) => x.id === r.gear_id)?.name).filter((x): x is string => !!x)));
  const mismatch = !!s.shoe && usedShoes.length > 0 && !usedShoes.some((u) => sameShoe(u, s.shoe));

  const head = (
    <>
      <div className="date">{fmtDateShort(s.date)}</div>
      <div className="body">
        <div className="title">{s.title ?? s.type ?? "Entrenamiento"}</div>
        <div className="meta">{sessionMeta(s)}</div>
        {direct && notes && <div className="meta clamp">{notes}</div>}
        {done.length > 0 ? (
          <span className="badge">
            Hecho: {d.toFixed(1)} km · {fmtPace(t / d)} /km
          </span>
        ) : past && !strength ? (
          <span className="badge soft">Sin registro</span>
        ) : null}
      </div>
    </>
  );

  if (direct) {
    return (
      <div className="item xrow video">
        <a className="xhead tap" href={links[0].url} target="_blank" rel="noopener noreferrer" aria-label={`${s.title ?? "Fuerza"}: abrir video en una pestaña nueva`}>
          {head}
          <span className="playchip" aria-hidden="true">
            <IconPlay />
          </span>
        </a>
      </div>
    );
  }

  return (
    <div className={`item xrow ${open ? "open" : ""}`}>
      <button type="button" className="xhead tap" aria-expanded={open} onClick={onToggle}>
        {head}
        <Chevron />
      </button>
      <Expandable open={open}>
        <div className="xbody">
          {s.type && <div>Tipo: {s.type}</div>}
          {!strength && s.shoe && <div>👟 Plan: {s.shoe}</div>}
          {usedShoes.length > 0 && (
            <div>
              👟 Usaste: {usedShoes.join(", ")}
              {mismatch ? " (distinto al plan)" : ""}
            </div>
          )}
          {done.length > 0 && s.distance_km ? (
            <div>
              Plan {s.distance_km} km → real {d.toFixed(1)} km
            </div>
          ) : null}
          {notes && <div className="notes">{notes}</div>}
          <VideoButtons links={links} />
        </div>
      </Expandable>
    </div>
  );
}

function PlanPanel({ today, runs, shoes, goal, sessions }: Ctx) {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter((s) => s.date >= today);
  const past = sorted.filter((s) => s.date < today && s.date >= addDays(today, -14)).reverse();
  const keyOf = (s: Session) => `${s.date}|${s.title ?? s.type ?? ""}`;

  const [openKey, setOpenKey] = useState<string | null>(upcoming[0] ? keyOf(upcoming[0]) : null);
  const [showPast, setShowPast] = useState(false);
  const toggle = (k: string) => setOpenKey(openKey === k ? null : k);

  const goalDays = goal?.date ? daysBetween(today, goal.date) : -1;

  return (
    <>
      {goal?.date && goalDays >= 0 && (
        <section className="card">
          <div className="chd">
            <h2>{goal.name ?? "Próxima carrera"}</h2>
            <span className="pill">{relDay(goalDays)}</span>
          </div>
          <div className="meta">
            {fmtDateShort(goal.date)}
            {goal.target_time ? ` · meta ${goal.target_time}` : ""}
          </div>
        </section>
      )}

      <section className="card">
        <h2>
          Próximos entrenamientos <span>toca para ver el detalle</span>
        </h2>
        {upcoming.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
            Todavía no hay entrenamientos cargados. Pídele a Claude tu plan de la semana y aparecerá aquí.
          </p>
        ) : (
          <div className="list">
            {upcoming.map((s) => (
              <SessionItem key={keyOf(s)} s={s} open={openKey === keyOf(s)} onToggle={() => toggle(keyOf(s))} runs={runs} shoes={shoes} past={false} />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <>
            <button type="button" className="more tap" onClick={() => setShowPast(!showPast)}>
              {showPast ? "Ocultar sesiones pasadas" : `Ver sesiones pasadas (${past.length})`}
            </button>
            <Expandable open={showPast}>
              <div className="list" style={{ paddingTop: 10 }}>
                {past.map((s) => (
                  <SessionItem key={keyOf(s)} s={s} open={openKey === keyOf(s)} onToggle={() => toggle(keyOf(s))} runs={runs} shoes={shoes} past />
                ))}
              </div>
            </Expandable>
          </>
        )}
      </section>
    </>
  );
}

/* ---------- Progreso ---------- */

function ProgresoPanel({ today, runs, config }: Ctx) {
  const allWeeks = weeklyKm(runs, today, 24);
  const [weeksN, setWeeksN] = useState<4 | 12 | 24>(12);
  const [selStart, setSelStart] = useState(allWeeks[allWeeks.length - 1].start);
  const [paceDays, setPaceDays] = useState<30 | 90 | 180>(90);

  const weeks = allWeeks.slice(-weeksN);
  const sel = weeks.find((w) => w.start === selStart) ?? weeks[weeks.length - 1];
  const selRuns = runs.filter((r) => dateOf(r) >= sel.start && dateOf(r) < addDays(sel.start, 7)).sort(sortDesc);
  const avgWeek = weeks.reduce((s, w) => s + w.km, 0) / weeks.length;

  const series = paceSeries(runs, today, paceDays);
  const paces = series.map((p) => p.pace);
  const bestPace = paces.length ? Math.min(...paces) : null;
  const avgPace = paces.length ? paces.reduce((a, b) => a + b, 0) / paces.length : null;

  const pred = predictions(runs, today);
  const bests = bestEfforts(runs);
  const firstBest = bests.find((b) => b.time);
  const half = pred?.times.find((t) => t.name === "21K");

  return (
    <>
      <section className="card">
        <div className="chd">
          <h2>Kilómetros por semana</h2>
          <Segmented
            label="Periodo"
            value={weeksN}
            onChange={setWeeksN}
            options={[
              { value: 4, label: "4 sem" },
              { value: 12, label: "12 sem" },
              { value: 24, label: "24 sem" },
            ]}
          />
        </div>
        <WeeklyChart data={weeks} goal={config.weeklyGoalKm} selected={sel.start} onSelect={setSelStart} />
        <div className="sumline">
          <span>
            Promedio: <b>{avgWeek.toFixed(1)} km</b>/sem
          </span>
          <span>Línea punteada: meta de {config.weeklyGoalKm} km</span>
        </div>

        <div className="weekdetail">
          <div className="wd-head">
            <b>Semana del {sel.label}</b>
            <span>
              {sel.km.toFixed(1)} km · {selRuns.length} {selRuns.length === 1 ? "salida" : "salidas"}
            </span>
          </div>
          {selRuns.length === 0 ? (
            <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>
              Sin salidas esa semana.
            </p>
          ) : (
            selRuns.map((r) => (
              <div className="mini" key={r.id}>
                <span>
                  {fmtDateShort(dateOf(r))} · {r.name}
                </span>
                <span>
                  {km(r.distance).toFixed(1)} km · {fmtPace(paceOf(r))}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <div className="chd">
          <h2>Ritmo en salidas de 5 km o más</h2>
          <Segmented
            label="Periodo"
            value={paceDays}
            onChange={setPaceDays}
            options={[
              { value: 30, label: "30 d" },
              { value: 90, label: "90 d" },
              { value: 180, label: "180 d" },
            ]}
          />
        </div>
        {series.length >= 2 ? (
          <>
            <PaceChart data={series} />
            <div className="sumline">
              <span>
                Mejor: <b>{fmtPace(bestPace)}</b> /km
              </span>
              <span>
                Promedio: <b>{fmtPace(avgPace)}</b> /km
              </span>
            </div>
            <p className="note">Más arriba en la gráfica significa más rápido.</p>
          </>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Aún no hay suficientes salidas largas en este periodo para dibujar la tendencia.
          </p>
        )}
      </section>

      <Collapsible title="Tiempos esperados" summary={half ? `21K ≈ ${fmtTime(half.time)}` : "Sin datos suficientes"}>
        {pred ? (
          <>
            <table>
              <thead>
                <tr>
                  <th>Distancia</th>
                  <th>Tiempo</th>
                  <th>Ritmo</th>
                </tr>
              </thead>
              <tbody>
                {pred.times.map((t) => (
                  <tr key={t.name}>
                    <td>{t.name}</td>
                    <td>
                      <b>{fmtTime(t.time)}</b>
                    </td>
                    <td>{fmtPace(t.time / t.km)} /km</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="note">
              Estimación calculada con la fórmula de Riegel a partir de tu mejor esfuerzo reciente ({pred.base.km.toFixed(1)} km en {fmtTime(pred.base.time)}, {fmtDateShort(pred.base.date)}). No es un dato de Strava y supone un esfuerzo a tope; en el maratón suele ser optimista.
            </p>
          </>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Se calculan con tus salidas de 5 a 25 km de los últimos 90 días.
          </p>
        )}
      </Collapsible>

      <Collapsible title="Mejores marcas" summary={firstBest ? `${firstBest.name} ${fmtTime(firstBest.time)}` : "Sin marcas todavía"}>
        <table>
          <thead>
            <tr>
              <th>Distancia</th>
              <th>Tiempo</th>
              <th>Ritmo</th>
            </tr>
          </thead>
          <tbody>
            {bests.map((b) => (
              <tr key={b.name}>
                <td>{b.name}</td>
                <td>{b.time ? <b>{fmtTime(b.time)}</b> : <span className="muted">–</span>}</td>
                <td>{b.pace ? `${fmtPace(b.pace)} /km` : <span className="muted">–</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="note">Últimos 180 días. Son salidas completas cuya distancia cae cerca de la marca (por ejemplo 20.5 a 22.8 km para el 21K), no parciales.</p>
      </Collapsible>
    </>
  );
}

/* ---------- Tenis ---------- */

function ShoeCard({ shoe, runs }: { shoe: ReturnType<typeof shoeStats>[number]; runs: Activity[] }) {
  const [open, setOpen] = useState(false);
  const color = shoe.pct >= 90 ? "var(--bad)" : shoe.pct >= 70 ? "var(--warn)" : "var(--accent)";
  const mine = runs.filter((r) => r.gear_id === shoe.id).sort(sortDesc).slice(0, 5);
  const left = Math.max(0, shoe.life - shoe.totalKm);

  return (
    <section className={`card ccard shoe ${open ? "open" : ""}`}>
      <button type="button" className="chead tap" aria-expanded={open} onClick={() => setOpen(!open)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="head">
            <b>{shoe.name}</b>
            <span>
              {shoe.totalKm.toFixed(0)} / {shoe.life} km
            </span>
          </div>
          <div className="bar">
            <i style={{ width: `${shoe.pct}%`, background: color }} />
          </div>
          <div className="sub">
            {shoe.km28.toFixed(0)} km en 28 días · último uso {shoe.lastUsed ? fmtDateShort(shoe.lastUsed) : "sin salidas recientes"}
          </div>
        </div>
        <Chevron />
      </button>
      <Expandable open={open}>
        <div className="cbody">
          <p className="note" style={{ marginTop: 0 }}>
            {shoe.pct.toFixed(0)} % de su vida útil · quedan aprox. {left.toFixed(0)} km
          </p>
          {mine.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Sin salidas con estos tenis en los últimos 180 días.
            </p>
          ) : (
            mine.map((r) => (
              <div className="mini" key={r.id}>
                <span>
                  {fmtDateShort(dateOf(r))} · {r.name}
                </span>
                <span>
                  {km(r.distance).toFixed(1)} km · {fmtPace(paceOf(r))}
                </span>
              </div>
            ))
          )}
        </div>
      </Expandable>
    </section>
  );
}

function TenisPanel({ today, runs, shoes, config }: Ctx) {
  const [all, setAll] = useState(false);
  if (shoes === null) {
    return (
      <section className="card">
        <h2>Tenis</h2>
        <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
          Para ver tus tenis hay que autorizar Strava con el permiso profile:read_all (ver README).
        </p>
      </section>
    );
  }

  const list = shoeStats(shoes, runs, today, config);
  if (list.length === 0) {
    return (
      <section className="card">
        <h2>Tenis</h2>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          No hay tenis registrados en tu perfil de Strava.
        </p>
      </section>
    );
  }

  const visible = all ? list : list.slice(0, 3);
  const unassigned = unassignedRuns(runs, today);

  return (
    <>
      <p className="hint">{all ? "Todos tus tenis, del más reciente al menos usado." : "Los 3 que has usado más recientemente. Toca uno para ver sus salidas."}</p>
      {visible.map((s) => (
        <ShoeCard key={s.id} shoe={s} runs={runs} />
      ))}
      {list.length > 3 && (
        <button type="button" className="more tap" onClick={() => setAll(!all)}>
          {all ? "Ver solo los 3 recientes" : `Ver todos (${list.length})`}
        </button>
      )}
      {unassigned > 0 && (
        <p className="note">
          {unassigned} {unassigned === 1 ? "salida" : "salidas"} de los últimos 90 días no tienen tenis asignado en Strava, así que no suman a ningún par.
        </p>
      )}
    </>
  );
}

/* ---------- Estructura principal ---------- */

export function Dashboard(props: DashboardProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("inicio");
  const [pending, startTransition] = useTransition();
  const [cooling, setCooling] = useState(false);
  const running = useRunning(props.runs);

  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (TABS.some((t) => t.id === h)) setTab(h as TabId);
  }, []);

  const goTo = (id: TabId) => {
    setTab(id);
    try {
      window.history.replaceState(null, "", `#${id}`);
    } catch {
      /* sin historial: no pasa nada */
    }
    window.scrollTo({ top: 0 });
  };

  const onRefresh = () => {
    if (pending || cooling) return;
    startTransition(async () => {
      await refreshStrava();
      router.refresh();
    });
    setCooling(true);
    setTimeout(() => setCooling(false), 15000);
  };

  const ctx: Ctx = { ...props, goTo, busy: pending, running };
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];
  const panels: Record<TabId, ReactNode> = {
    inicio: <InicioPanel {...ctx} />,
    plan: <PlanPanel {...ctx} />,
    progreso: <ProgresoPanel {...ctx} />,
    tenis: <TenisPanel {...ctx} />,
  };

  return (
    <>
      <main className="wrap">
        <header className="top">
          <div>
            <h1>{current.title}</h1>
            <small>
              {running.startedAt ? (
                <span className="live-now">
                  <i aria-hidden="true" /> Corriendo · {fmtElapsed(running.minutes)}
                </span>
              ) : pending ? (
                "Actualizando…"
              ) : (
                `Actualizado ${props.updated}`
              )}
            </small>
          </div>
          <button type="button" className={`icon-btn tap ${pending ? "spin" : ""}`} onClick={onRefresh} disabled={pending || cooling} aria-label="Actualizar datos de Strava">
            <IconRefresh />
          </button>
        </header>

        <div className={`panel p-${tab}`} key={tab}>
          {panels[tab]}
        </div>
      </main>

      <nav className="tabs" aria-label="Secciones">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`${tab === t.id ? "on" : ""} tap`} aria-current={tab === t.id ? "page" : undefined} onClick={() => goTo(t.id)}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
