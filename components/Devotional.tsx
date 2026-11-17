export type Devotional = {
  date: string;
  series?: string;
  day_label: string;
  theme: string;
  title: string;
  verse: { text: string; ref: string };
  read: string;
  steps: { title: string; minutes: number; body: string }[];
  closing?: string;
};

export function DevotionalCard({ d }: { d: Devotional }) {
  const total = d.steps.reduce((s, x) => s + x.minutes, 0);
  return (
    <section className="card devo">
      <div className="chd">
        <h2>{d.series ?? "Devocional de hoy"}</h2>
        <span className="muted" style={{ fontSize: 12 }}>
          ~{total} min
        </span>
      </div>
      <div className="muted devo-when">{d.day_label}</div>
      <div className="devo-theme">{d.theme}</div>
      <div className="devo-title">{d.title}</div>

      <blockquote className="devo-verse">
        <p>{d.verse.text}</p>
        <cite>{d.verse.ref} · Reina-Valera 1960</cite>
      </blockquote>

      <div className="devo-read">
        <b>Lee en tu Biblia:</b> {d.read}
      </div>

      <ol className="devo-steps">
        {d.steps.map((s) => (
          <li key={s.title}>
            <div className="devo-step-hd">
              <b>{s.title}</b>
              <span className="pill">{s.minutes} min</span>
            </div>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>

      {d.closing && <div className="devo-closing">{d.closing}</div>}
    </section>
  );
}
