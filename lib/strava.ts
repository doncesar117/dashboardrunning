const API = "https://www.strava.com/api/v3";

export class StravaError extends Error {}

export type Activity = {
  id: number;
  name: string;
  sport_type: string;
  distance: number; // metros
  moving_time: number; // segundos
  elapsed_time: number;
  total_elevation_gain: number;
  start_date?: string; // UTC (ISO)
  start_date_local: string;
  average_heartrate?: number;
  gear_id: string | null;
};

export type Shoe = {
  id: string;
  name: string;
  distance: number; // metros acumulados según Strava
  retired?: boolean;
  primary?: boolean;
};

let cached: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cached && cached.exp - 60 > Date.now() / 1000) return cached.token;

  const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID?.trim();
  const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET?.trim();
  const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN?.trim();
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
    throw new StravaError(
      "Faltan las variables de entorno de Strava en Vercel (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET y STRAVA_REFRESH_TOKEN)."
    );
  }

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: STRAVA_REFRESH_TOKEN,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new StravaError(
      `Strava rechazó la renovación del token (código ${res.status}). Revisa que las 3 variables de entorno estén bien copiadas.`
    );
  }

  const json = await res.json();
  cached = { token: json.access_token, exp: json.expires_at };
  return cached.token;
}

async function stravaGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 900, tags: ["strava"] },
  });
  if (res.status === 401) {
    throw new StravaError(
      "Strava dice que no hay permiso para leer tus datos. Hay que autorizar la app con los permisos activity:read_all y profile:read_all (ver README, paso 3)."
    );
  }
  if (res.status === 429) {
    throw new StravaError("Strava pidió esperar un poco (límite de llamadas). Vuelve a abrir la app en unos minutos.");
  }
  if (!res.ok) {
    throw new StravaError(`Strava respondió con error ${res.status}.`);
  }
  return res.json() as Promise<T>;
}

export async function getRecentActivities(days = 180): Promise<Activity[]> {
  const after = Math.floor(Date.now() / 1000) - days * 86400;
  const all: Activity[] = [];
  for (let page = 1; page <= 4; page++) {
    const batch = await stravaGet<Activity[]>(`/athlete/activities?per_page=200&page=${page}&after=${after}`);
    all.push(...batch);
    if (batch.length < 200) break;
  }
  return all;
}

export async function getShoes(): Promise<Shoe[] | null> {
  try {
    const athlete = await stravaGet<{ shoes?: Shoe[] }>("/athlete");
    return athlete.shoes ?? [];
  } catch {
    return null; // sin permiso profile:read_all: la app sigue funcionando sin la sección de tenis
  }
}
