// Generado a partir de las hojas de sprites. Duración (ms) de cada uno de los 8 cuadros.
export const FRAME_W = 256;
export const FRAME_H = 384;

export type AnimName = "idle" | "celebrar" | "dormir" | "cansado" | "saltar" | "correr";

export const ANIMS: Record<AnimName, { durations: number[]; loop: boolean }> = {
  idle: { durations: [250, 250, 250, 250, 250, 250, 250, 250], loop: true },
  celebrar: { durations: [400, 160, 160, 120, 120, 120, 160, 360], loop: true },
  dormir: { durations: [480, 400, 400, 320, 400, 400, 320, 480], loop: true },
  cansado: { durations: [240, 160, 160, 160, 200, 160, 160, 360], loop: true },
  saltar: { durations: [120, 80, 80, 80, 100, 80, 80, 180], loop: true },
  correr: { durations: [100, 100, 100, 100, 100, 100, 100, 100], loop: true },
};
