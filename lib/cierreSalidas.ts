// Cierre automático de salidas del día.
//
// Muchos alumnos entran y no pasan su credencial al salir, así que su registro
// quedaría abierto para siempre. Este cierre marca la salida al final de la
// jornada, todos los días.
//
// Antes vivía en Wix (cerrarSalidas-supabase.jsw) como un job de Velo. Se
// movió aquí para que el SAG no dependa de dos plataformas: si el sitio de Wix
// se mueve o se cancela, el cierre dejaría de correr en silencio y nadie se
// enteraría hasta ver todos los registros abiertos.

import { supaGet, supaUpdate, eqP, qs } from "./supabaseAdmin";
import { fechaHoyMx } from "./reportes";

/** Hora a la que se da por terminada la jornada escolar. */
const HORA_CIERRE = "14:30";

export type ResultadoCierre = {
  fecha: string;
  cerrados: number;
};

export async function cerrarSalidasPendientes(fechaParam?: string): Promise<ResultadoCierre> {
  const fecha = fechaParam || fechaHoyMx();

  // La "Z" no es una conversión de zona horaria: todo el sistema guarda la hora
  // de pared local etiquetada como UTC (ver lib/escaneo.ts). Por eso va 14:30 y
  // no 20:30 — escribirlo como 20:30 fue justamente el bug que hacía que todas
  // las salidas automáticas se vieran como 8:30 p.m.
  const salidaFija = `${fecha}T${HORA_CIERRE}:00.000Z`;

  const pendientes = await supaGet<{ id: string }>(
    "registros_asistencia",
    qs([eqP("fecha", fecha), "hora_salida=is.null", "select=id", "limit=1000"])
  );

  for (const registro of pendientes) {
    await supaUpdate("registros_asistencia", eqP("id", registro.id), { hora_salida: salidaFija });
  }

  return { fecha, cerrados: pendientes.length };
}
