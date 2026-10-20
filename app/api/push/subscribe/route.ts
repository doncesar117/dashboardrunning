import { NextResponse } from "next/server";
import { dropSub, saveSub, storeReady, validSub } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!storeReady()) return NextResponse.json({ error: "Almacenamiento no configurado" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { subscription?: unknown } | null;
  if (!validSub(body?.subscription)) return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  await saveSub(body!.subscription as never);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!storeReady()) return NextResponse.json({ error: "Almacenamiento no configurado" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (!body?.endpoint) return NextResponse.json({ error: "Falta endpoint" }, { status: 400 });
  await dropSub(body.endpoint);
  return NextResponse.json({ ok: true });
}
