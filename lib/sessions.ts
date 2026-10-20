// Ayudas para sesiones del plan: detectar fuerza y encontrar enlaces (YouTube u otros).

export type VideoLink = { title?: string; url: string };

export type LinkFields = {
  type?: string;
  title?: string;
  notes?: string;
  url?: string;
  link?: string;
  video?: string;
  youtube?: string;
  videos?: (string | VideoLink)[];
};

const URL_RE = /https?:\/\/[^\s)>\]]+/gi;
const STRENGTH_RE = /fuerza|strength|gimnasio|gym|pesas|core|calistenia|movilidad|mobility/i;

// Solo se aceptan http(s); cualquier otra cosa se ignora.
function safe(u: unknown): string | null {
  if (typeof u !== "string") return null;
  try {
    const x = new URL(u.trim().replace(/[.,;]+$/, ""));
    return x.protocol === "https:" || x.protocol === "http:" ? x.href : null;
  } catch {
    return null;
  }
}

export const isStrength = (s: LinkFields) => STRENGTH_RE.test(s.type ?? "") || (!s.type && STRENGTH_RE.test(s.title ?? ""));

export const isYouTube = (url: string) => /(^|\.)(youtube\.com|youtu\.be)$/i.test(new URL(url).hostname);

// Campos url / link / video / youtube, lista "videos" y cualquier enlace escrito dentro de las notas.
export function sessionLinks(s: LinkFields): VideoLink[] {
  const out: VideoLink[] = [];
  const add = (u: unknown, title?: string) => {
    const href = safe(u);
    if (href && !out.some((o) => o.url === href)) out.push({ url: href, title });
  };
  [s.url, s.link, s.video, s.youtube].forEach((u) => add(u));
  (s.videos ?? []).forEach((v) => (typeof v === "string" ? add(v) : add(v?.url, v?.title)));
  (s.notes?.match(URL_RE) ?? []).forEach((u) => add(u));
  return out;
}

// Notas sin las direcciones (los enlaces se muestran como botones).
export const notesText = (s: LinkFields) =>
  (s.notes ?? "")
    .replace(URL_RE, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/[\s,:;-]*\b(?:en|aquí|aqui|link|enlace|video|vídeo)\b[\s,:;.]*$/i, ".")
    .replace(/\.{2,}/g, ".")
    .trim();

export const linkLabel = (l: VideoLink) => l.title ?? (isYouTube(l.url) ? "Ver video" : "Abrir enlace");
