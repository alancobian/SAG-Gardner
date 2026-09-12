"use server";

import { obtenerSesion } from "@/lib/auth";
import { obtenerReporteAcumulado, type ReporteAcumulado } from "@/lib/acumulados";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export async function obtenerReporteAcumuladoAction(
  desde: string,
  hasta: string
): Promise<Resultado<ReporteAcumulado>> {
  // El alcance por nivel se resuelve aquí, en el servidor, a partir de la
  // sesión -- nunca se acepta del cliente. Si viniera del formulario, un
  // director de Primaria podría pedir el reporte de Prepa cambiando la petición.
  const sesion = await obtenerSesion();
  if (!sesion) return { ok: false, error: "Sesión no válida" };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    return { ok: false, error: "Fechas no válidas" };
  }
  if (desde > hasta) {
    return { ok: false, error: "La fecha inicial no puede ser posterior a la final" };
  }

  try {
    const data = await obtenerReporteAcumulado(desde, hasta, sesion.niveles);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al generar el reporte" };
  }
}
