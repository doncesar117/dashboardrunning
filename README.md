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
