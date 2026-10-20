# Running — dashboard personal con datos de Strava

App web (PWA) para iPhone. Lee tus actividades de Strava y muestra: kilómetros de la semana, tendencia de ritmo, tiempos esperados, mejores marcas, desgaste de tenis y tus próximos entrenamientos.

## Puesta en marcha (una sola vez)

### 1. Subir el proyecto a GitHub
Descomprime el zip y sube todo el contenido al repositorio (en github.com: **Add file → Upload files**). No subas `node_modules` ni `.env`.

### 2. Publicar en Vercel
1. En vercel.com: **Add New → Project** y elige este repositorio.
2. Antes de desplegar, en **Environment Variables** agrega:
   - `STRAVA_CLIENT_ID` (el ID de cliente de tu app de Strava)
   - `STRAVA_CLIENT_SECRET` (el secreto de cliente)
3. Despliega. Vercel te dará una dirección tipo `algo.vercel.app`.

### 3. Autorizar Strava con los permisos correctos
Los tokens que Strava muestra en la página de configuración solo tienen permiso básico y **no pueden leer actividades ni tenis**. Hay que generar uno nuevo:

1. En strava.com/settings/api, en **Authorization Callback Domain** escribe tu dominio de Vercel, sin `https://` (por ejemplo `algo.vercel.app`).
2. (Recomendado) En Strava, **Configuración → Mis aplicaciones → Revocar acceso**, para invalidar los tokens viejos.
3. Abre `https://algo.vercel.app/api/callback`, toca **Autorizar con Strava** y acepta todos los permisos.
4. La página te mostrará un valor largo: pégalo en Vercel como `STRAVA_REFRESH_TOKEN` y vuelve a desplegar (**Deployments → ⋯ → Redeploy**).
5. Opcional: borra la carpeta `app/api/callback` cuando termines.

### 4. Agregarla a tu iPhone
Abre la dirección en Safari → **Compartir → Agregar a pantalla de inicio**.

## Ajustes
- `data/config.json`: meta semanal de km (`weeklyGoalKm`) y vida útil de tenis en km (`shoeLifeKm`; para un modelo en particular usa `shoeLifeOverrides`, por ejemplo `{ "Boston": 700 }`).
- `data/plan.json`: tu carrera objetivo (`goal`) y tus entrenamientos (`sessions`). Cada vez que Claude te dé un plan nuevo, se reemplaza este archivo y Vercel republica la app sola.

Formato de una sesión:

```json
{
  "date": "2026-10-20",
  "type": "Rodaje",
  "title": "Rodaje suave",
  "distance_km": 8,
  "pace_target": "6:10",
  "expected_time": "0:49:20",
  "shoe": "ASICS Nimbus 27",
  "notes": "Frecuencia cardiaca en zona 2"
}
```

### Sesiones de fuerza con video
Una sesión cuyo `type` (o `title`) diga fuerza, core, gym, pesas, movilidad, etc. se trata como fuerza: sin km, ritmo ni tenis, y sin la marca "Sin registro". Ejemplo:

```json
{
  "date": "2026-10-21",
  "type": "Fuerza",
  "title": "Fuerza de piernas y glúteos",
  "duration_min": 25,
  "url": "https://www.youtube.com/watch?v=XXXX",
  "notes": "3 series de 12 repeticiones"
}
```

- Con **un** video, tocar la sesión en el Plan abre YouTube directamente (pestaña nueva o la app de YouTube). En Inicio, "Siguiente entrenamiento" muestra el botón **▶ Ver video**.
- Con **varios** videos, usa `"videos": [{ "title": "Core 10 min", "url": "https://..." }, "https://..."]`; la sesión se expande con un botón por video.
- El enlace puede ir en `url`, `link`, `video` o `youtube`, o simplemente escrito dentro de `notes` (se convierte en botón). Solo se aceptan direcciones `http` o `https`.
- `duration_min` es opcional y se muestra como "25 min".

## Cómo se calculan algunas cosas
- **Tiempos esperados**: fórmula de Riegel (exponente 1.06) sobre tu mejor esfuerzo de 5 a 25 km en los últimos 90 días. Es una estimación propia, no un dato de Strava.
- **Mejores marcas**: salidas completas cuya distancia cae cerca de 5K, 10K, 21K o 42K.
- **Tenis**: kilometraje acumulado de Strava. Las salidas sin tenis asignado en Strava no suman a ningún par.
- Los datos se refrescan cada vez que abres la app (con un respaldo de 15 minutos para no exceder el límite de Strava). El botón circular de arriba a la derecha pide datos nuevos al momento (queda en pausa 15 segundos después de usarlo).

## Cómo está organizada la app
- **Inicio**: anillo de la semana, siguiente entrenamiento, tira de días (toca un día para ver su salida), cuenta regresiva a tu carrera y últimas salidas.
- **Plan**: tus próximos entrenamientos (toca uno para ver el detalle) y, si quieres, las sesiones pasadas comparadas con lo que corriste.
- **Progreso**: kilómetros por semana (4, 12 o 24 semanas; toca una barra para ver sus salidas), tendencia de ritmo (30, 90 o 180 días), tiempos esperados y mejores marcas.
- **Tenis**: los 3 usados más recientemente, con opción de ver todos.

En tablet y escritorio la app se acomoda en dos columnas (Inicio y Progreso) y se centra con un ancho máximo.

## La mascota
Tu personaje aparece arriba en Inicio, con un globo de texto, y cambia según tus datos (en este orden):
1. **Celebra** si ya corriste hoy.
2. **Duerme** si hoy no hay entrenamiento en el plan pero sí hay uno próximo (día de descanso).
3. **Se ve cansado** si ayer corriste 15 km o más, o si la semana ya va en el 90 % de tu meta semanal.
4. **Reposo** en cualquier otro caso (con el entrenamiento de hoy o el siguiente en el globo).

Al tocarlo **salta**, y mientras se actualizan los datos **corre**. Si tu iPhone tiene activado "Reducir movimiento", se queda quieto.

- Las animaciones están en `public/mascota/` (una tira de 8 cuadros por animación) y sus duraciones en `lib/mascotAnims.ts`.
- Las reglas y los textos están en la función `decide` de `components/Mascot.tsx`.

## Corriendo ahora
En la tarjeta del personaje hay un botón discreto **▶ Voy a correr**. Al tocarlo:
- El personaje corre y el globo dice **Corriendo · 32 min** (el tiempo avanza solo). En las demás pestañas queda un puntito verde con el tiempo debajo del título.
- **Terminé** lo apaga y el personaje celebra unos segundos.
- Se apaga solo cuando tu salida llega a Strava (si empezó después de tocar el botón, con 10 minutos de margen) o a las 4 horas.

El estado se guarda en el navegador de ese dispositivo (no se comparte entre tu iPhone y otras pantallas). No usa la API de Garmin: es un aviso manual.

## Avisos en el teléfono (opcional)
La app puede mandarte una notificación:
- **5:30 AM**: si el plan de hoy es de correr y todavía no hay salida de hoy en Strava (incluye el tenis del plan).
- **6:00 PM**: si hoy toca fuerza y no tocaste **Ya la hice** (botón en "Siguiente entrenamiento"). Si la sesión tiene video, al tocar el aviso se abre YouTube.

Cómo funciona: la campana 🔔 de arriba activa los avisos en ese dispositivo; un servicio de tareas programadas llama a `/api/notify` a las 5:30 y a las 18:00. En iPhone hace falta iOS 16.4 o más nuevo y abrir la app desde la pantalla de inicio.

Configuración (una sola vez):
1. En Vercel, **Storage**: crea una base **Upstash Redis** (plan gratis) y conéctala al proyecto. Agrega solas las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
2. En **Environment Variables** agrega `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (par de llaves de los avisos) y `CRON_SECRET` (una contraseña larga inventada). Opcional: `VAPID_SUBJECT` (por ejemplo `mailto:tu@correo.com`). Vuelve a desplegar.
3. En un servicio de tareas programadas gratis (por ejemplo cron-job.org) crea dos tareas, con zona horaria **America/Mexico_City**:
   - 5:30 todos los días → `https://TU-DOMINIO/api/notify?slot=am`
   - 18:00 todos los días → `https://TU-DOMINIO/api/notify?slot=pm`
   En cada una agrega el encabezado `Authorization: Bearer TU_CRON_SECRET` (o, más simple, añade `&key=TU_CRON_SECRET` a la dirección).
4. En el iPhone abre la app desde la pantalla de inicio, toca la campana y acepta.
5. Prueba: abre `https://TU-DOMINIO/api/notify?test=1&key=TU_CRON_SECRET` y debe llegar un aviso. Con `&dry=1&slot=am` (o `pm`) ves qué enviaría sin mandar nada.

Mientras falte alguna de estas piezas, la campana y el botón no aparecen y todo lo demás funciona igual.
