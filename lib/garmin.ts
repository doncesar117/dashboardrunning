import { addDays, todayLocal } from "@/lib/stats";
import { judge, type Recovery } from "@/lib/recovery";

// API personal de Garmin (solo lectura, solo tus datos).
// La llave vive en GARMIN_PERSONAL_API_KEY (variable de entorno del servidor). Nunca se envía al navegador.
const BASE = "https://personal.connectapi.garmin.com";
const TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token";

let cached: { token: string; exp: number } | null = null;

export function garminReady() {
  return Boolean(process.env.GARMIN_PERSONAL_API_KEY);
}

/** Cambia la llave por un token de acceso (dura ~24 h). Se reutiliza mientras no venza. */
export async function getGarminToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (cached && cached.exp - 300 > now) return cached.token;
  const key = process.env.GARMIN_PERSONAL_API_KEY;
  if (!key) throw new Error("Falta GARMIN_PERSONAL_API_KEY");
  const res = await fetch(BASE + TOKEN_PATH, { method: "POST", headers: { Authorization: `ApiKey ${key}` }, cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new Error(`Garmin rechazó la llave (HTTP ${res.status})`);
  let token = text.trim();
  let exp = now + 23 * 3600;
  try {
    const j = JSON.parse(text);
    token = j.access_token ?? j.accessToken ?? j.token ?? token;
    const e = j.expires_at ?? j.expiresAt;
    if (typeof e === "number") exp = e > 1e12 ? e / 1000 : e;
    else if (typeof j.expires_in === "number") exp = now + j.expires_in;
  } catch {
    /* la respuesta no era JSON: se toma el texto como token */
  }
  cached = { token, exp };
  return token;
}

export async function garminGet(path: string) {
  const token = await getGarminToken();
  const res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* se deja como texto */
  }
  return { status: res.status, ok: res.ok, body };
}

/* ---------- Recuperación ---------- */

type Obj = Record<string, unknown>;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);

let memo: { at: number; data: Recovery | null } | null = null;
const TTL_MS = 10 * 60 * 1000;

/** Lee VFC, sueño, pulso en reposo y Body Battery. Devuelve null si Garmin no responde (la tarjeta se oculta). */
export async function getRecovery(): Promise<Recovery | null> {
  if (!garminReady()) return null;
  if (memo && Date.now() - memo.at < TTL_MS) return memo.data;
  try {
    const today = todayLocal();
    const from8 = addDays(today, -7);
    const [hrvR, sleepR, dayR] = await Promise.all([
      garminGet(`/hrv-service/hrv/daily/${from8}/${today}`),
      garminGet(`/sleep-service/sleep/dailySleepSummariesByDate?startDate=${addDays(today, -2)}&endDate=${today}`),
      garminGet(`/usersummary-service/v2/dailysummaries?startDate=${from8}&endDate=${today}`),
    ]);

    const hrvs = arr((hrvR.body as Obj)?.hrvSummaries).sort((a, b) => String(a.calendarDate).localeCompare(String(b.calendarDate)));
    const lastHrv = hrvs[hrvs.length - 1];
    const base = (lastHrv?.baseline ?? {}) as Obj;

    const sleeps = arr(sleepR.body).sort((a, b) => String(a.calendarDate).localeCompare(String(b.calendarDate)));
    const lastSleep = sleeps[sleeps.length - 1];
    const overall = ((lastSleep?.sleepScores ?? {}) as Obj).overall as Obj | undefined;
    const sleepSec = num(lastSleep?.sleepTimeSeconds);

    const days = arr((dayR.body as Obj)?.data).sort((a, b) => String(a.calendarDate).localeCompare(String(b.calendarDate)));
    const lastDay = days[days.length - 1];
    const rhrOf = (d: Obj) => num(((d.heartRate ?? {}) as Obj).restingValue);
    const restingHr = lastDay ? rhrOf(lastDay) : null;
    const prev = days.slice(0, -1).map(rhrOf).filter((v): v is number => v != null);
    const restingHrBase = prev.length > 0 ? prev.reduce((a, b) => a + b, 0) / prev.length : null;

    const partial = {
      date: String(lastHrv?.calendarDate ?? today),
      hrv: num(lastHrv?.lastNightAvg),
      hrvWeekly: num(lastHrv?.weeklyAvg),
      hrvLow: num(base.balancedLow),
      hrvHigh: num(base.balancedUpper),
      hrvStatus: typeof lastHrv?.status === "string" ? lastHrv.status : null,
      restingHr,
      restingHrBase,
      sleepHours: sleepSec != null ? sleepSec / 3600 : null,
      sleepScore: num(overall?.value),
      bodyBattery: num(((lastDay?.bodyBattery ?? {}) as Obj).latestValue),
    };
    const data: Recovery = { ...partial, ...judge(partial) };
    memo = { at: Date.now(), data };
    return data;
  } catch {
    return null;
  }
}
