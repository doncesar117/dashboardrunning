// API personal de Garmin (solo lectura, solo tus datos).
// La llave vive en GARMIN_PERSONAL_API_KEY (variable de entorno del servidor). Nunca se envía al navegador.
const BASE = "https://personal.connectapi.garmin.com";
const TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token";

let cached: { token: string; exp: number } | null = null;

export function garminReady() {
  return Boolean(process.env.GARMIN_PERSONAL_API_KEY);
}

/** Cambia la llave por un token de acceso (dura ~24 h). Se reutiliza mientras no venza. */
export async function getGarminToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (cached && cached.exp - 300 > now) return cached.token;
  const key = process.env.GARMIN_PERSONAL_API_KEY;
  if (!key) throw new Error("Falta GARMIN_PERSONAL_API_KEY");
  const res = await fetch(BASE + TOKEN_PATH, { method: "POST", headers: { Authorization: `ApiKey ${key}` }, cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new Error(`Garmin rechazó la llave (HTTP ${res.status})`);
  let token = text.trim();
  let exp = now + 23 * 3600;
  try {
    const j = JSON.parse(text);
    token = j.access_token ?? j.accessToken ?? j.token ?? token;
    const e = j.expires_at ?? j.expiresAt;
    if (typeof e === "number") exp = e > 1e12 ? e / 1000 : e;
    else if (typeof j.expires_in === "number") exp = now + j.expires_in;
  } catch {
    /* la respuesta no era JSON: se toma el texto como token */
  }
  cached = { token, exp };
  return token;
}

export async function garminGet(path: string) {
  const token = await getGarminToken();
  const res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* se deja como texto */
  }
  return { status: res.status, ok: res.ok, body };
}
