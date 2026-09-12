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

import { supaGet, supaUpdateMany, eqP, qs } from "./supabaseAdmin";
import { fechaHoyMx } from "./reportes";

/** Hora a la que se da por terminada la jornada escolar. */
const HORA_CIERRE = "14:30";

export type ResultadoCierre = {
  fecha: string;
  cerrados: number;
  /** Motivo por el que no se cerró nada, si aplica (día no lectivo). */
  omitido?: string;
};

type DiaCalendario = { tipo_dia: string; aplica_a: string | null };

/**
 * Devuelve el tipo de día para los alumnos ("Lectivo" si no está en el
 * calendario). Mismo criterio de aplica_a que usa obtenerReporteDiario.
 *
 * Si la consulta falla se asume día lectivo: es preferible cerrar de más
 * (dato recuperable, el cierre es idempotente) que dejar cientos de registros
 * abiertos porque el calendario no respondió.
 */
async function tipoDiaAlumnos(fecha: string): Promise<string> {
  try {
    const filas = await supaGet<DiaCalendario>("calendario_escolar", eqP("fecha", fecha));
    const dia = filas.find(
      (f) => !f.aplica_a || f.aplica_a === "Alumnos" || f.aplica_a === "Ambos"
    );
    return dia ? dia.tipo_dia : "Lectivo";
  } catch {
    return "Lectivo";
  }
}

export async function cerrarSalidasPendientes(fechaParam?: string): Promise<ResultadoCierre> {
  const fecha = fechaParam || fechaHoyMx();

  // Fin de semana: el cron corre los 7 días porque Vercel no distingue, pero
  // aquí no hay jornada que cerrar. getUTCDay sobre la fecha "YYYY-MM-DD" da el
  // día correcto sin arrastrar zonas horarias.
  const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  if (diaSemana === 0 || diaSemana === 6) {
    return { fecha, cerrados: 0, omitido: "Fin de semana" };
  }

  // Festivo, CTE, suspensión o vacaciones: si alguien escaneó ese día fue algo
  // excepcional, y marcarle una salida ficticia a las 2:30 esconde el dato. Se
  // deja abierto para que salte a la vista en el reporte.
  const tipoDia = await tipoDiaAlumnos(fecha);
  if (tipoDia !== "Lectivo") {
    return { fecha, cerrados: 0, omitido: tipoDia };
  }

  // La "Z" no es una conversión de zona horaria: todo el sistema guarda la hora
  // de pared local etiquetada como UTC (ver lib/escaneo.ts). Por eso va 14:30 y
  // no 20:30 — escribirlo como 20:30 fue justamente el bug que hacía que todas
  // las salidas automáticas se vieran como 8:30 p.m.
  const salidaFija = `${fecha}T${HORA_CIERRE}:00.000Z`;

  // Un solo PATCH para todos los pendientes del dia. La version anterior
  // recorria los registros uno por uno y con 222 alumnos abiertos la funcion
  // se caia por timeout antes de terminar; asi se resuelve en una llamada.
  const cerrados = await supaUpdateMany(
    "registros_asistencia",
    qs([eqP("fecha", fecha), "hora_salida=is.null"]),
    { hora_salida: salidaFija }
  );

  return { fecha, cerrados };
}
