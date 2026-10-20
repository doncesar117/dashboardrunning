// Almacén mínimo sobre Upstash Redis (REST), el que Vercel conecta desde su Marketplace.
// Acepta las variables KV_REST_API_* (Vercel) o UPSTASH_REDIS_REST_* (Upstash directo).

const URL_ = () => process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = () => process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export const storeReady = () => !!(URL_() && TOKEN());

export async function cmd<T = unknown>(args: (string | number)[]): Promise<T> {
  const url = URL_();
  const token = TOKEN();
  if (!url || !token) throw new Error("Almacenamiento no configurado");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const data = (await res.json()) as { result?: T; error?: string };
  if (!res.ok || data.error) throw new Error(data.error ?? `Error ${res.status}`);
  return data.result as T;
}

export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } };

export const validSub = (s: unknown): s is PushSub => {
  const x = s as PushSub;
  return !!x && typeof x.endpoint === "string" && x.endpoint.startsWith("https://") && typeof x.keys?.p256dh === "string" && typeof x.keys?.auth === "string";
};

export const saveSub = (s: PushSub) => cmd(["HSET", "push:subs", s.endpoint, JSON.stringify(s)]);
export const dropSub = (endpoint: string) => cmd(["HDEL", "push:subs", endpoint]);
export async function allSubs(): Promise<PushSub[]> {
  const flat = (await cmd<string[]>(["HVALS", "push:subs"])) ?? [];
  return flat.map((v) => JSON.parse(v) as PushSub);
}

// "Ya hice la fuerza de hoy": una marca por día que caduca sola.
const doneKey = (date: string) => `strength-done:${date}`;
export const getStrengthDone = async (date: string) => (await cmd<number>(["EXISTS", doneKey(date)])) === 1;
export const setStrengthDone = (date: string) => cmd(["SET", doneKey(date), "1", "EX", 172800]);
export const clearStrengthDone = (date: string) => cmd(["DEL", doneKey(date)]);
