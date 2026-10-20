import { NextResponse } from "next/server";
import webpush from "web-push";
import plan from "@/data/plan.json";
import { decideReminder, type Slot } from "@/lib/notify";
import { allSubs, dropSub, getStrengthDone, storeReady } from "@/lib/store";
import { getRecentActivities } from "@/lib/strava";
import { isRun, todayLocal } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lo llama un servicio de tareas programadas:
//   /api/notify?slot=am   (5:30 AM)      /api/notify?slot=pm   (6:00 PM)
// Con la contraseña en el encabezado "Authorization: Bearer <CRON_SECRET>" o en ?key=<CRON_SECRET>.
// Extras para probar: &dry=1 (solo muestra qué enviaría) y &test=1 (envía un aviso de prueba).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("key");
  if (!secret || given !== secret) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!storeReady() || !pub || !priv) return NextResponse.json({ error: "Faltan la base de datos o las llaves VAPID" }, { status: 503 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:avisos@example.com", pub, priv);

  const test = url.searchParams.get("test") === "1";
  const dry = url.searchParams.get("dry") === "1";
  const slot = url.searchParams.get("slot") as Slot | null;
  if (!test && slot !== "am" && slot !== "pm") return NextResponse.json({ error: "slot debe ser am o pm" }, { status: 400 });

  const today = todayLocal();
  let reminder;
  if (test) {
    reminder = { title: "✅ Avisos activados", body: "Así te llegarán los recordatorios de tu entrenamiento.", url: "/#inicio", tag: "test" };
  } else if (slot === "am") {
    let runs: Awaited<ReturnType<typeof getRecentActivities>> = [];
    try {
      runs = (await getRecentActivities(3)).filter(isRun);
    } catch {
      /* si Strava falla, mejor avisar de más que quedarte sin aviso */
    }
    reminder = decideReminder("am", today, plan.sessions, runs, false);
  } else {
    reminder = decideReminder("pm", today, plan.sessions, [], await getStrengthDone(today));
  }

  if (!reminder) return NextResponse.json({ sent: 0, reason: "Nada que avisar", today, slot });
  if (dry) return NextResponse.json({ dry: true, reminder, today, slot });

  const subs = await allSubs();
  let sent = 0;
  const payload = JSON.stringify(reminder);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(s, payload, { TTL: 3600, urgency: "high" });
        sent += 1;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await dropSub(s.endpoint); // el teléfono ya no la acepta
      }
    }),
  );
  return NextResponse.json({ sent, subscribers: subs.length, reminder, today, slot });
}
