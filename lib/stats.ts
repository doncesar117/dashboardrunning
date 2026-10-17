import type { Activity, Shoe } from "./strava";

const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);
export const TZ = "America/Mexico_City";

export const isRun = (a: Activity) => RUN_TYPES.has(a.sport_type);
export const km = (m: number) => m / 1000;

/* ---------- formato ---------- */

export function fmtPace(secPerKm: number | null | undefined): string {
  if (!secPerKm || !isFinite(secPerKm)) return "–";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtTime(totalSec: number | null | undefined): string {
  if (!totalSec || !isFinite(totalSec)) return "–";
  const t = Math.round(totalSec);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function parseTime(str: string | undefined): number | null {
  if (!str) return null;
  const parts = str.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

/* ---------- fechas (zona de Ciudad de México) ---------- */

export function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); // YYYY-MM-DD
}

const dayNum = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86400000;
export const daysBetween = (fromIso: string, toIso: string) => Math.round(dayNum(toIso) - dayNum(fromIso));

export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
}

export function mondayOf(iso: string): string {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = domingo
  return addDays(iso, -((dow + 6) % 7));
}

export const dateOf = (a: Activity) => a.start_date_local.slice(0, 10);

// Formato manual (no Intl) para que servidor y navegador escriban exactamente lo mismo.
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function fmtDateShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/* ---------- estadísticas ---------- */

export function weeklyKm(runs: Activity[], today: string, weeks = 12) {
  const thisMonday = mondayOf(today);
  const out: { label: string; start: string; km: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisMonday, -7 * i);
    const end = addDays(start, 7);
    const total = runs
      .filter((r) => dateOf(r) >= start && dateOf(r) < end)
      .reduce((sum, r) => sum + km(r.distance), 0);
    const [, mm, dd] = start.split("-");
    out.push({ label: `${dd}/${mm}`, start, km: Math.round(total * 10) / 10 });
  }
  return out;
}

export function summary(runs: Activity[], today: string) {
  const thisMonday = mondayOf(today);
  const weekRuns = runs.filter((r) => dateOf(r) >= thisMonday);
  const weekKm = weekRuns.reduce((s, r) => s + km(r.distance), 0);

  const since28 = addDays(today, -27);
  const last28 = runs.filter((r) => dateOf(r) >= since28);
  const km28 = last28.reduce((s, r) => s + km(r.distance), 0);
  const time28 = last28.reduce((s, r) => s + r.moving_time, 0);

  const since90 = addDays(today, -89);
  const last90 = runs.filter((r) => dateOf(r) >= since90);
  const longest90 = last90.reduce((best, r) => (r.distance > (best?.distance ?? 0) ? r : best), null as Activity | null);

  return {
    weekKm,
    weekRuns: weekRuns.length,
    km28,
    runs28: last28.length,
    avgPace28: km28 > 0 ? time28 / km28 : null,
    longest90,
  };
}

export function paceSeries(runs: Activity[], today: string, days = 90) {
  const since = addDays(today, -(days - 1));
  return runs
    .filter((r) => dateOf(r) >= since && r.distance >= 5000)
    .sort((a, b) => a.start_date_local.localeCompare(b.start_date_local))
    .map((r) => {
      const [, mm, dd] = dateOf(r).split("-");
      return {
        label: `${dd}/${mm}`,
        pace: Math.round(r.moving_time / km(r.distance)),
        km: Math.round(km(r.distance) * 10) / 10,
      };
    });
}

/* Mejores marcas aproximadas: carreras completas cuya distancia cae cerca de la distancia estándar. */
const BANDS = [
  { name: "5K", min: 4.9, max: 6 },
  { name: "10K", min: 9.8, max: 11.5 },
  { name: "21K", min: 20.5, max: 22.8 },
  { name: "42K", min: 41, max: 44 },
];

export function bestEfforts(runs: Activity[]) {
  return BANDS.map((b) => {
    const candidates = runs.filter((r) => km(r.distance) >= b.min && km(r.distance) <= b.max);
    const best = candidates.reduce((acc, r) => (!acc || r.moving_time / r.distance < acc.moving_time / acc.distance ? r : acc), null as Activity | null);
    return {
      name: b.name,
      time: best ? best.moving_time : null,
      pace: best ? best.moving_time / km(best.distance) : null,
      date: best ? dateOf(best) : null,
    };
  });
}

/* Predicción de Riegel con exponente 1.06, usando el mejor esfuerzo (5–25 km) de los últimos 90 días. */
const RIEGEL = 1.06;
export const PREDICT_DISTANCES = [
  { name: "5K", km: 5 },
  { name: "10K", km: 10 },
  { name: "21K", km: 21.0975 },
  { name: "42K", km: 42.195 },
];

export function predictions(runs: Activity[], today: string) {
  const since = addDays(today, -89);
  const pool = runs.filter((r) => dateOf(r) >= since && km(r.distance) >= 5 && km(r.distance) <= 25);
  if (!pool.length) return null;
  // el esfuerzo que proyecta el mejor tiempo en medio maratón
  const score = (r: Activity) => r.moving_time * Math.pow(21.0975 / km(r.distance), RIEGEL);
  const base = pool.reduce((best, r) => (score(r) < score(best) ? r : best), pool[0]);
  return {
    base: { km: km(base.distance), time: base.moving_time, date: dateOf(base), name: base.name },
    times: PREDICT_DISTANCES.map((d) => ({
      name: d.name,
      km: d.km,
      time: base.moving_time * Math.pow(d.km / km(base.distance), RIEGEL),
    })),
  };
}

/* ---------- tenis ---------- */

export function shoeStats(
  shoes: Shoe[],
  runs: Activity[],
  today: string,
  config: { shoeLifeKm: number; shoeLifeOverrides: Record<string, number> }
) {
  const since28 = addDays(today, -27);
  return shoes
    .filter((s) => !s.retired)
    .map((s) => {
      const mine = runs.filter((r) => r.gear_id === s.id);
      const last = mine.reduce((best, r) => (!best || r.start_date_local > best.start_date_local ? r : best), null as Activity | null);
      const override = Object.entries(config.shoeLifeOverrides).find(([k]) => s.name.toLowerCase().includes(k.toLowerCase()));
      const life = override ? override[1] : config.shoeLifeKm;
      const totalKm = km(s.distance);
      return {
        id: s.id,
        name: s.name,
        totalKm,
        life,
        pct: Math.min(100, (totalKm / life) * 100),
        km28: mine.filter((r) => dateOf(r) >= since28).reduce((sum, r) => sum + km(r.distance), 0),
        lastUsed: last ? dateOf(last) : null,
      };
    })
    .sort((a, b) => (b.lastUsed ?? "").localeCompare(a.lastUsed ?? ""));
}

export function unassignedRuns(runs: Activity[], today: string) {
  const since = addDays(today, -89);
  return runs.filter((r) => dateOf(r) >= since && !r.gear_id).length;
}
