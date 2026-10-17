import { Dashboard, type Goal, type Session } from "@/components/Dashboard";
import config from "@/data/config.json";
import plan from "@/data/plan.json";
import { getRecentActivities, getShoes, StravaError, type Activity, type Shoe } from "@/lib/strava";
import { isRun, todayLocal } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Home() {
  const today = todayLocal();

  let runs: Activity[];
  let shoes: Shoe[] | null;
  try {
    const [activities, shoeList] = await Promise.all([getRecentActivities(180), getShoes()]);
    // Solo mandamos al navegador los campos que la app usa.
    runs = activities.filter(isRun).map((a) => ({
      id: a.id,
      name: a.name,
      sport_type: a.sport_type,
      distance: a.distance,
      moving_time: a.moving_time,
      elapsed_time: a.elapsed_time,
      total_elevation_gain: a.total_elevation_gain,
      start_date_local: a.start_date_local,
      average_heartrate: a.average_heartrate,
      gear_id: a.gear_id,
    }));
    shoes = shoeList
      ? shoeList.map((s) => ({ id: s.id, name: s.name, distance: s.distance, retired: s.retired, primary: s.primary }))
      : null;
  } catch (e) {
    const msg = e instanceof StravaError ? e.message : "No pude cargar tus datos de Strava. Intenta de nuevo en unos minutos.";
    return (
      <main className="wrap">
        <header className="top">
          <div>
            <h1>Running</h1>
          </div>
        </header>
        <div className="card error">
          <h2>No se pudo cargar</h2>
          <p style={{ margin: 0, lineHeight: 1.45 }}>{msg}</p>
        </div>
      </main>
    );
  }

  const updated = new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date());

  return (
    <Dashboard
      today={today}
      updated={updated}
      runs={runs}
      shoes={shoes}
      config={config}
      goal={plan.goal as Goal | undefined}
      sessions={plan.sessions as Session[]}
    />
  );
}
