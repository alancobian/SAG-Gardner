"use server";

import { obtenerSesion } from "@/lib/auth";
import { obtenerAnalitica, type Analitica } from "@/lib/analitica";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export async function obtenerAnaliticaAction(
  desde: string,
  hasta: string
): Promise<Resultado<Analitica>> {
  const sesion = await obtenerSesion();
  if (!sesion) return { ok: false, error: "Sesión no válida" };

  const formato = /^\d{4}-\d{2}-\d{2}$/;
  if (!formato.test(desde) || !formato.test(hasta)) {
    return { ok: false, error: "Fechas no válidas" };
  }
  if (desde > hasta) {
    return { ok: false, error: "La fecha inicial no puede ser posterior a la final" };
  }

  try {
    // El alcance sale de la sesión, nunca del cliente.
    return { ok: true, data: await obtenerAnalitica(desde, hasta, sesion.niveles) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo generar el análisis" };
  }
}
