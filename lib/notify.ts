import type { Activity } from "@/lib/strava";
import { dateOf } from "@/lib/stats";
import { isStrength, sessionLinks, notesText, type LinkFields } from "@/lib/sessions";

export type Slot = "am" | "pm";

type Planned = LinkFields & { date: string; distance_km?: number; pace_target?: string; shoe?: string; duration_min?: number };

export type Reminder = { title: string; body: string; url: string; tag: string };

// 5:30 AM ("am"): hoy toca correr y todavía no hay salida en Strava.
// 6:00 PM ("pm"): hoy toca fuerza y no la marcaste como hecha.
export function decideReminder(slot: Slot, today: string, sessions: Planned[], runs: Activity[], strengthDone: boolean): Reminder | null {
  const todays = sessions.filter((s) => s.date === today);

  if (slot === "am") {
    const run = todays.find((s) => !isStrength(s));
    if (!run) return null;
    if (runs.some((r) => dateOf(r) === today)) return null;
    const what = run.title ?? run.type ?? "Entrenamiento";
    const meta = [run.distance_km ? `${run.distance_km} km` : null, run.pace_target ? `${run.pace_target} /km` : null].filter(Boolean).join(" · ");
    const shoe = run.shoe ? ` 👟 ${run.shoe}.` : "";
    return { title: "🏃 Hoy toca correr", body: `${what}${meta ? ` (${meta})` : ""}. Aún no sales.${shoe}`, url: "/#inicio", tag: `am-${today}` };
  }

  const str = todays.find((s) => isStrength(s));
  if (!str || strengthDone) return null;
  const links = sessionLinks(str);
  const what = str.title ?? "Fuerza";
  const hint = notesText(str).split(/(?<=\.)\s/)[0];
  return {
    title: "💪 Hoy toca fuerza",
    body: `${what}.${links.length ? " Toca para abrir el video." : ""}${!links.length && hint ? ` ${hint}` : ""}`.trim(),
    url: links[0]?.url ?? "/#inicio",
    tag: `pm-${today}`,
  };
}
