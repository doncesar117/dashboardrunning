"use server";

import { revalidateTag } from "next/cache";

// Borra la copia guardada de las respuestas de Strava para que el siguiente
// router.refresh() pida datos nuevos en lugar de esperar los 15 minutos de respaldo.
export async function refreshStrava() {
  revalidateTag("strava");
}
