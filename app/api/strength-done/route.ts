import { NextResponse } from "next/server";
import { clearStrengthDone, getStrengthDone, setStrengthDone, storeReady } from "@/lib/store";
import { todayLocal } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const off = () => NextResponse.json({ error: "Almacenamiento no configurado" }, { status: 503 });

export async function GET() {
  if (!storeReady()) return off();
  return NextResponse.json({ done: await getStrengthDone(todayLocal()) });
}
export async function POST() {
  if (!storeReady()) return off();
  await setStrengthDone(todayLocal());
  return NextResponse.json({ done: true });
}
export async function DELETE() {
  if (!storeReady()) return off();
  await clearStrengthDone(todayLocal());
  return NextResponse.json({ done: false });
}
