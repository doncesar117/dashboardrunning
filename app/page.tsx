import { PaceChart, WeeklyChart } from "@/components/Charts";
import { Ring } from "@/components/Ring";
import config from "@/data/config.json";
import plan from "@/data/plan.json";
import { getRecentActivities, getShoes, StravaError } from "@/lib/strava";
import {
  bestEfforts,
  dateOf,
  daysBetween,
  fmtDateShort,
  fmtPace,
  fmtTime,
  isRun,
  km,
  paceSeries,
  parseTime,
  predictions,
  shoeStats,
  summary,
  todayLocal,
  unassignedRuns,
  weeklyKm,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

type Session = {
  date: string;
  type?: string;
  title?: string;
  distance_km?: number;
  pace_target?: string;
  expected_time?: string;
  shoe?: string;
  notes?: string;
};

export default async function Home() {
  const today = todayLocal();

  let data;
  try {
    const [activities, shoes] = await Promise.all([getRecentActivities(180), getShoes()]);
    data = { runs: activities.filter(isRun), shoes };
  } catch (e) {
    const msg = e instanceof StravaError ? e.message : "No pude cargar tus datos de Strava. Intenta de nuevo en unos minutos.";
    return (
      <main className="wrap">
        <header className="top">
          <h1>Running</h1>
        </header>
        <div className="card error">
          <h2>No se pudo cargar</h2>
          <p style={{ margin: 0, lineHeight: 1.45 }}>{msg}</p>
        </div>
      </main>
    );
  }

  const { runs, shoes } = data;
  const sum = summary(runs, today);
  const weeks = weeklyKm(runs, today, 12);
  const pace = paceSeries(runs, today);
  const bests = bestEfforts(runs);
  const pred = predictions(runs, today);
  const shoeList = shoes ? shoeStats(shoes, runs, today, config) : null;
  const unassigned = unassignedRuns(runs, today);

  const goal = plan.goal as { name?: string; date?: string; distance_km?: number; target_time?: string } | undefined;
  const goalDays = goal?.date ? daysBetween(today, goal.date) : null;
  const goalSec = parseTime(goal?.target_time);
  const goalPace = goalSec && goal?.distance_km ? goalSec / goal.distance_km : null;
  const goalPred =
    pred && goal?.distance_km
      ? pred.base.time * Math.pow(goal.distance_km / pred.base.km, 1.06)
      : null;

  const sessions = (plan.sessions as Session[])
    .filter((s) => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);
  const actualOn = (date: string) => runs.filter((r) => dateOf(r) === date);

  const recent = [...runs].sort((a, b) => b.start_date_local.localeCompare(a.start_date_local)).slice(0, 8);
  const shoeName = (id: string | null) => shoes?.find((s) => s.id === id)?.name;

  const updated = new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date());

  return (
    <>
      <main className="wrap">
        <header className="top" id="inicio">
          <h1>Running</h1>
          <small>Actualizado {updated}</small>
        </header>

        <section className="card hero">
          <Ring value={sum.weekKm} goal={config.weeklyGoalKm} />
          <div className="stats">
            <div className="stat">
              <b>{sum.weekRuns}</b>
              <span>salidas esta semana</span>
            </div>
            <div className="stat">
              <b>{sum.km28.toFixed(0)} km</b>
              <span>últimos 28 días</span>
            </div>
            <div className="stat">
              <b>{fmtPace(sum.avgPace28)} /km</b>
              <span>ritmo promedio 28 días</span>
            </div>
          </div>
        </section>

        {goal?.date && goalDays !== null && goalDays >= 0 && (
          <section className="card goal">
            <h2>{goal.name ?? "Próxima carrera"}</h2>
            <div className="big">
              {goalDays} {goalDays === 1 ? "día" : "días"}
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
        )}

        <section className="card" id="plan">
          <h2>
            Próximos entrenamientos <span>según tu plan</span>
          </h2>
          {sessions.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
              Todavía no hay entrenamientos cargados. Pídele a Claude tu plan de la semana y aparecerá aquí.
            </p>
          ) : (
            <div className="list">
              {sessions.map((s, i) => {
                const done = actualOn(s.date);
                const d = done.reduce((sum, r) => sum + km(r.distance), 0);
                const t = done.reduce((sum, r) => sum + r.moving_time, 0);
                return (
                  <div className="item" key={`${s.date}-${i}`}>
                    <div className="date">{fmtDateShort(s.date)}</div>
                    <div className="body">
                      <div className="title">{s.title ?? s.type ?? "Entrenamiento"}</div>
                      <div className="meta">
                        {[
                          s.distance_km ? `${s.distance_km} km` : null,
                          s.pace_target ? `${s.pace_target} /km` : null,
                          s.expected_time ? `≈ ${s.expected_time}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      {s.shoe && <div className="meta">👟 {s.shoe}</div>}
                      {s.notes && <div className="meta">{s.notes}</div>}
                      {done.length > 0 && (
                        <span className="badge">
                          Hecho: {d.toFixed(1)} km · {fmtPace(t / d)} /km
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          <h2>
            Kilómetros por semana <span>12 semanas</span>
          </h2>
          <WeeklyChart data={weeks} goal={config.weeklyGoalKm} />
        </section>

        <section className="card">
          <h2>
            Ritmo en salidas de 5 km o más <span>90 días</span>
          </h2>
          {pace.length >= 2 ? (
            <PaceChart data={pace} />
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              Aún no hay suficientes salidas largas para dibujar la tendencia.
            </p>
          )}
          <p className="note">Más arriba en la gráfica significa más rápido.</p>
        </section>

        <section className="card">
          <h2>Tiempos esperados</h2>
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
                Estimación calculada con la fórmula de Riegel a partir de tu mejor esfuerzo reciente ({pred.base.km.toFixed(1)} km en{" "}
                {fmtTime(pred.base.time)}, {fmtDateShort(pred.base.date)}). No es un dato de Strava y supone un esfuerzo a tope; en el
                maratón suele ser optimista.
              </p>
            </>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              Se calculan con tus salidas de 5 a 25 km de los últimos 90 días.
            </p>
          )}
        </section>

        <section className="card">
          <h2>
            Mejores marcas <span>últimos 180 días</span>
          </h2>
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
          <p className="note">Son salidas completas cuya distancia cae cerca de la marca (por ejemplo 20.5 a 22.8 km para el 21K), no parciales.</p>
        </section>

        <section className="card" id="tenis">
          <h2>Tenis</h2>
          {shoeList === null ? (
            <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
              Para ver tus tenis hay que autorizar Strava con el permiso profile:read_all (ver README).
            </p>
          ) : shoeList.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              No hay tenis registrados en tu perfil de Strava.
            </p>
          ) : (
            shoeList.map((s) => {
              const color = s.pct >= 90 ? "var(--bad)" : s.pct >= 70 ? "var(--warn)" : "var(--accent)";
              return (
                <div className="shoe" key={s.id}>
                  <div className="head">
                    <b>{s.name}</b>
                    <span>
                      {s.totalKm.toFixed(0)} / {s.life} km
                    </span>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${s.pct}%`, background: color }} />
                  </div>
                  <div className="sub">
                    {s.km28.toFixed(0)} km en 28 días · último uso {s.lastUsed ? fmtDateShort(s.lastUsed) : "sin salidas recientes"}
                  </div>
                </div>
              );
            })
          )}
          {unassigned > 0 && (
            <p className="note">
              {unassigned} {unassigned === 1 ? "salida" : "salidas"} de los últimos 90 días no tienen tenis asignado en Strava, así que no suman a
              ningún par.
            </p>
          )}
        </section>

        <section className="card" id="historial">
          <h2>Últimas salidas</h2>
          <div className="list">
            {recent.map((r) => (
              <div className="item" key={r.id}>
                <div className="date">{fmtDateShort(dateOf(r))}</div>
                <div className="body">
                  <div className="title">{r.name}</div>
                  <div className="meta">
                    {km(r.distance).toFixed(1)} km · {fmtPace(r.moving_time / km(r.distance))} /km · {fmtTime(r.moving_time)}
                    {r.average_heartrate ? ` · ${Math.round(r.average_heartrate)} ppm` : ""}
                  </div>
                  {shoeName(r.gear_id) && <div className="meta">👟 {shoeName(r.gear_id)}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <nav className="tabs" aria-label="Secciones">
        <a href="#inicio">Inicio</a>
        <a href="#plan">Plan</a>
        <a href="#tenis">Tenis</a>
        <a href="#historial">Historial</a>
      </nav>
    </>
  );
}
