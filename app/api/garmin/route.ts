import { NextResponse } from "next/server";
import { garminGet, garminReady } from "@/lib/garmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Versión de PRUEBA: muestra qué devuelve cada endpoint del API personal de Garmin.
//   /api/garmin?key=<CRON_SECRET>            (o encabezado Authorization: Bearer <CRON_SECRET>)
// Opcional: &days=7 (1 a 28). No devuelve la llave ni el token.
const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("key");
  if (!secret || given !== secret) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!garminReady()) return NextResponse.json({ error: "Falta GARMIN_PERSONAL_API_KEY en Vercel" }, { status: 503 });

  const days = Math.min(28, Math.max(1, Number(url.searchParams.get("days")) || 7));
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  const s = iso(start);
  const e = iso(end);

  const paths: Record<string, string> = {
    hrv_resumen: `/hrv-service/hrv/daily/${s}/${e}`,
    sueno_resumen: `/sleep-service/sleep/dailySleepSummariesByDate?startDate=${s}&endDate=${e}`,
    diario_resumen: `/usersummary-service/v2/dailysummaries?startDate=${s}&endDate=${e}`,
    actividades: `/activitylist-service/activities/search/activities?start=0&limit=5`,
  };

  const out: Record<string, unknown> = { rango: { desde: s, hasta: e } };
  try {
    for (const [name, p] of Object.entries(paths)) {
      const r = await garminGet(p);
      out[name] = { http: r.status, ruta: p, datos: r.ok ? r.body : String(typeof r.body === "string" ? r.body : JSON.stringify(r.body)).slice(0, 300) };
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 502 });
  }
  return NextResponse.json(out);
}
