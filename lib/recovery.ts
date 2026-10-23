// Tipos y reglas del semáforo de recuperación. Sin dependencias del servidor.
export type Light = "verde" | "amarillo" | "rojo";

export type Recovery = {
  date: string; // día del dato más reciente
  hrv: number | null; // VFC promedio de anoche (ms)
  hrvWeekly: number | null; // promedio de 7 noches
  hrvLow: number | null; // inicio de tu rango equilibrado
  hrvHigh: number | null;
  hrvStatus: string | null; // estado que da Garmin
  restingHr: number | null;
  restingHrBase: number | null; // promedio de los días anteriores
  sleepHours: number | null;
  sleepScore: number | null;
  bodyBattery: number | null;
  light: Light;
  headline: string;
  detail: string;
};

// Por debajo de este valor de VFC (ms) bajamos a rojo; entre este y el piso de tu rango, amarillo.
export const HRV_RED = 36;
// Subida del pulso en reposo (latidos) frente a tu base reciente que pide frenar.
export const RHR_ALERT = 5;

export function judge(r: Pick<Recovery, "hrv" | "hrvLow" | "restingHr" | "restingHrBase">): Pick<Recovery, "light" | "headline" | "detail"> {
  const rhrUp = r.restingHr != null && r.restingHrBase != null ? r.restingHr - r.restingHrBase : 0;
  if (r.hrv == null) return { light: "amarillo", headline: "Sin VFC de anoche", detail: "Garmin aún no sube el dato. Guíate por cómo te sientes." };
  if (rhrUp >= RHR_ALERT) return { light: "rojo", headline: "Descansa hoy", detail: `Tu pulso en reposo subió ${Math.round(rhrUp)} latidos. Mejor camina o descansa.` };
  if (r.hrv < HRV_RED) return { light: "rojo", headline: "Recuperación baja", detail: "Reduce a 6 km fáciles o descansa. Que la rodilla y el sueño decidan." };
  if (r.hrvLow != null && r.hrv < r.hrvLow) return { light: "amarillo", headline: "Con cuidado", detail: "Sigue el plan, pero baja ~20% el volumen y mantén todo fácil." };
  return { light: "verde", headline: "Luz verde", detail: "Estás recuperado: sigue el plan como está." };
}
