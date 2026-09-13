/**
 * Configuración centralizada del tiempo de reseteo por inactividad.
 * Lee de NEXT_PUBLIC_RESET_TIME (ej: "20m", "30s", "1h") con fallback a "20m".
 */
export const RESET_TIME = process.env.NEXT_PUBLIC_RESET_TIME || "20m";

/**
 * Convierte un formato de tiempo (ej: "20m", "30s", "1h") a milisegundos para el frontend.
 */
export function parseResetTimeToMs(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d+)([smhd])?$/i);
  if (!match) return 20 * 60 * 1000; // fallback por defecto 20 minutos

  const value = parseInt(match[1], 10);
  const unit = (match[2] || "s").toLowerCase();

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return value * 1000;
  }
}

export const RESET_MS = parseResetTimeToMs(RESET_TIME);
