"use client";

import { useEffect, useState } from "react";

// "Ya la hice": apaga el aviso de las 6 PM para la fuerza de hoy.
export function StrengthDone() {
  const [done, setDone] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/strength-done", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { done: boolean } | null) => setDone(d ? d.done : null))
      .catch(() => setDone(null));
  }, []);

  if (done === null) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !done;
    setDone(next);
    try {
      const r = await fetch("/api/strength-done", { method: next ? "POST" : "DELETE" });
      if (!r.ok) throw new Error();
    } catch {
      setDone(!next);
    }
    setBusy(false);
  };

  return (
    <button type="button" className={`more tap ${done ? "done" : ""}`} onClick={toggle} aria-pressed={done}>
      {done ? "✓ Fuerza hecha (toca para deshacer)" : "Ya la hice"}
    </button>
  );
}
