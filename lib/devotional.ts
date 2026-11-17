import devotionals from "@/data/devotionals.json";
import type { Devotional } from "@/components/Devotional";

// Solo el devocional de hoy sale del servidor. Los demás nunca llegan al navegador,
// para no caer en la tentación de leerlos por adelantado.
export function getTodayDevotional(today: string): Devotional | null {
  return (devotionals as Devotional[]).find((d) => d.date === today) ?? null;
}
