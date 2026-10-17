"use client";

import { useState, type ReactNode } from "react";

export function Chevron() {
  return (
    <svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// Contenido que se despliega con altura animada (sin saltos).
export function Expandable({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={`xp ${open ? "open" : ""}`} aria-hidden={!open} inert={!open}>
      <div className="xp-inner">{children}</div>
    </div>
  );
}

// Tarjeta completa que se abre y se cierra al tocar su encabezado.
export function Collapsible({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`card ccard ${open ? "open" : ""}`}>
      <button type="button" className="chead tap" aria-expanded={open} onClick={() => setOpen(!open)}>
        <div>
          <span className="ctitle">{title}</span>
          {summary && <span className="csum">{summary}</span>}
        </div>
        <Chevron />
      </button>
      <Expandable open={open}>
        <div className="cbody">{children}</div>
      </Expandable>
    </section>
  );
}
