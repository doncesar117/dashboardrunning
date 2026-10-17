// Ruta de configuración inicial: sirve para autorizar tu cuenta de Strava con los
// permisos correctos y mostrarte el refresh token que debes pegar en Vercel.
// Cuando termines la configuración puedes borrar esta carpeta (app/api/callback).

export const dynamic = "force-dynamic";

const page = (body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Configurar Strava</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;max-width:520px;margin:32px auto;padding:0 18px;line-height:1.5;color:#0e1a12}
a.btn{display:inline-block;background:#4cc230;color:#0b2208;font-weight:700;padding:14px 20px;border-radius:14px;text-decoration:none}
code{display:block;word-break:break-all;background:#eef7e6;padding:12px;border-radius:12px;margin:8px 0 16px;font-size:14px}</style></head><body>${body}</body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = process.env.STRAVA_CLIENT_ID;
  const secret = process.env.STRAVA_CLIENT_SECRET;

  if (!id || !secret) {
    return page("<h2>Falta configurar</h2><p>Agrega STRAVA_CLIENT_ID y STRAVA_CLIENT_SECRET en Vercel (Settings → Environment Variables), vuelve a desplegar y abre esta página otra vez.</p>", 500);
  }

  const redirect = `${url.origin}/api/callback`;
  const code = url.searchParams.get("code");

  if (!code) {
    const link =
      `https://www.strava.com/oauth/authorize?client_id=${encodeURIComponent(id)}` +
      `&response_type=code&redirect_uri=${encodeURIComponent(redirect)}` +
      `&approval_prompt=force&scope=read,activity:read_all,profile:read_all`;
    return page(
      `<h2>Autorizar Strava</h2><p>Toca el botón y acepta <b>todos</b> los permisos que Strava te pida (actividades y perfil).</p><p><a class="btn" href="${link}">Autorizar con Strava</a></p>`
    );
  }

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, code, grant_type: "authorization_code" }),
    cache: "no-store",
  });

  if (!res.ok) {
    return page(`<h2>No funcionó</h2><p>Strava respondió con error ${res.status}. El código dura poco y solo sirve una vez: vuelve a <a href="${redirect}">empezar</a>.</p>`, 400);
  }

  const json = await res.json();
  const scope = url.searchParams.get("scope") ?? "";
  const missing = ["activity:read_all", "profile:read_all"].filter((s) => !scope.includes(s));
  const warn = missing.length
    ? `<p style="color:#b42318"><b>Ojo:</b> faltó aceptar el permiso ${missing.join(" y ")}. Vuelve a <a href="${redirect}">empezar</a> y deja todas las casillas activadas.</p>`
    : "<p>Permisos correctos ✅</p>";

  return page(
    `<h2>Listo</h2>${warn}<p>Copia este valor y pégalo en Vercel como <b>STRAVA_REFRESH_TOKEN</b> (Settings → Environment Variables). Luego vuelve a desplegar.</p><code>${json.refresh_token}</code><p>No lo compartas con nadie. Cuando termines puedes borrar la carpeta app/api/callback del proyecto.</p>`
  );
}
