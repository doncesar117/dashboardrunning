import type { Recovery } from "@/lib/recovery";

const LABEL = { verde: "🟢", amarillo: "🟡", rojo: "🔴" } as const;
const STATUS: Record<string, string> = { BALANCED: "Equilibrada", UNBALANCED: "Desequilibrada", LOW: "Baja", POOR: "Mala" };

function fmtH(h: number) {
  const m = Math.round(h * 60);
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
}

export function RecoveryCard({ r }: { r: Recovery }) {
  const rhrDiff = r.restingHr != null && r.restingHrBase != null ? Math.round(r.restingHr - r.restingHrBase) : null;
  return (
    <section className={`card rec ${r.light}`}>
      <div className="chd">
        <h2>Recuperación</h2>
        <span className="muted" style={{ fontSize: 12 }}>
          Garmin
        </span>
      </div>
      <div className="rec-head">
        <span className="rec-dot" aria-hidden="true">
          {LABEL[r.light]}
        </span>
        <div>
          <div className="rec-title">{r.headline}</div>
          <div className="muted rec-detail">{r.detail}</div>
        </div>
      </div>
      <div className="rec-grid">
        <div>
          <b>{r.hrv ?? "–"} ms</b>
          <span>VFC de anoche{r.hrvLow != null && r.hrvHigh != null ? ` (rango ${r.hrvLow}-${r.hrvHigh})` : ""}</span>
        </div>
        <div>
          <b>{r.hrvWeekly ?? "–"} ms</b>
          <span>VFC semanal{r.hrvStatus ? ` · ${STATUS[r.hrvStatus] ?? r.hrvStatus.toLowerCase()}` : ""}</span>
        </div>
        <div>
          <b>{r.sleepHours != null ? fmtH(r.sleepHours) : "–"}</b>
          <span>Sueño{r.sleepScore != null ? ` · puntaje ${r.sleepScore}` : ""}</span>
        </div>
        <div>
          <b>{r.restingHr ?? "–"} lpm</b>
          <span>Pulso en reposo{rhrDiff != null ? ` (${rhrDiff > 0 ? "+" : ""}${rhrDiff} vs. tu base)` : ""}</span>
        </div>
      </div>
      {r.bodyBattery != null && <div className="muted rec-foot">Body Battery ahora: {r.bodyBattery}. Si la rodilla izquierda se hace notar, baja un nivel.</div>}
    </section>
  );
}
