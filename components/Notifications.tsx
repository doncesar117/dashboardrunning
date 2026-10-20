"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconBell } from "./Icons";

type State = "checking" | "off" | "on" | "denied" | "unsupported" | "needs-install" | "busy";

function keyBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export function Notifications({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("checking");
  const [msg, setMsg] = useState("");
  const timer = useRef(0);

  const say = useCallback((t: string) => {
    setMsg(t);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(""), 7000);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (isIOS() && !isStandalone()) return setState("needs-install");
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (Notification.permission === "denied") return setState("denied");
        setState(sub ? "on" : "off");
      } catch {
        setState("unsupported");
      }
    })();
    return () => window.clearTimeout(timer.current);
  }, []);

  const toggle = async () => {
    if (state === "busy" || state === "checking") return;
    if (state === "needs-install") return say("Para recibir avisos, agrega la app a la pantalla de inicio y ábrela desde ahí.");
    if (state === "unsupported") return say("Este navegador no permite avisos.");
    if (state === "denied") return say("Los avisos están bloqueados. Actívalos en Ajustes del teléfono → Notificaciones.");
    const prev = state;
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const existing = await reg.pushManager.getSubscription();
      if (prev === "on") {
        if (existing) {
          await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: existing.endpoint }) });
          await existing.unsubscribe();
        }
        setState("off");
        return say("Avisos desactivados.");
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return say("No se activaron los avisos.");
      }
      const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      if (!res.ok) throw new Error("subscribe");
      setState("on");
      say("Avisos activados: 5:30 AM si no has salido a correr y 6 PM si falta la fuerza.");
    } catch {
      setState(prev);
      say("No pude activar los avisos. Intenta de nuevo.");
    }
  };

  return (
    <div className="bellwrap">
      <button
        type="button"
        className={`icon-btn tap ${state === "on" ? "on" : ""}`}
        onClick={toggle}
        aria-pressed={state === "on"}
        aria-label={state === "on" ? "Desactivar avisos de entrenamiento" : "Activar avisos de entrenamiento"}
        disabled={state === "checking"}
      >
        <IconBell />
      </button>
      {msg && (
        <p className="pop" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
