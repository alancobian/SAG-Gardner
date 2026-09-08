// Puerto directo de get_cicloEscolar/post_guardarCicloEscolar,
// get_fechasNoLaborales/post_guardarFechaNoLaboral/post_eliminarFechaNoLaboral
// y get_periodosVacacionales/post_guardarPeriodoVacacional
// (http-functions-supabase.js, Bloque 1).
//
// Nota: el backend tambien tiene get_calendario/post_guardarDiaCalendario,
// una version mas antigua sin audiencia (aplicaA) que quedo superada por
// fechasNoLaborales/periodosVacacionales -- no se porta aqui porque
// get_reporteDiario/get_grupoAsistencia/get_reporteDocentesDiario ya
// filtran por aplica_a, no por esas funciones viejas.

import { supaGet, supaInsert, supaUpdate, supaDelete, eqP, qs } from "./supabaseAdmin";

function fechaComoTexto(fecha: Date): string {
  const anio = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function generarRangoFechas(fechaInicioStr: string, fechaFinStr: string): string[] {
  const fechas: string[] = [];
  let actual = new Date(fechaInicioStr + "T00:00:00Z");
  const fin = new Date(fechaFinStr + "T00:00:00Z");
  while (actual <= fin) {
    fechas.push(fechaComoTexto(actual));
    actual = new Date(actual.getTime() + 24 * 60 * 60 * 1000);
  }
  return fechas;
}

// ---- Ciclo escolar ----

export type CicloEscolar = {
  id: string;
  anioEscolar: string;
  fechaInicio: string | null;
  fechaCierre: string | null;
};

type CicloRow = {
  id: string;
  anio_escolar: string | null;
  fecha_inicio: string | null;
  fecha_cierre: string | null;
  archivado: boolean | null;
};

export async function obtenerCicloEscolar(): Promise<CicloEscolar | null> {
  const rows = await supaGet<CicloRow>("ciclos_escolares", "limit=50");
  const activo = rows.find((c) => c.archivado !== true);
  if (!activo) return null;
  return {
    id: activo.id,
    anioEscolar: activo.anio_escolar || "",
    fechaInicio: activo.fecha_inicio ? fechaComoTexto(new Date(activo.fecha_inicio)) : null,
    fechaCierre: activo.fecha_cierre ? fechaComoTexto(new Date(activo.fecha_cierre)) : null,
  };
}

export async function guardarCicloEscolar(datos: {
  anioEscolar: string;
  fechaInicio: string;
  fechaCierre: string;
}): Promise<void> {
  const anioEscolar = datos.anioEscolar.trim();
  const fechaInicio = datos.fechaInicio.trim();
  const fechaCierre = datos.fechaCierre.trim();
  if (!anioEscolar || !fechaInicio || !fechaCierre) {
    throw new Error("Falta anioEscolar, fechaInicio o fechaCierre");
  }
  const rows = await supaGet<CicloRow>("ciclos_escolares", "limit=50");
  const activo = rows.find((c) => c.archivado !== true);
  if (activo) {
    await supaUpdate("ciclos_escolares", eqP("id", activo.id), {
      anio_escolar: anioEscolar,
      fecha_inicio: fechaInicio,
      fecha_cierre: fechaCierre,
    });
  } else {
    await supaInsert("ciclos_escolares", {
      anio_escolar: anioEscolar,
      fecha_inicio: fechaInicio,
      fecha_cierre: fechaCierre,
      archivado: false,
    });
  }
}

// ---- Fechas no laborales (dia individual) ----

export type FechaNoLaboral = {
  id: string;
  fecha: string;
  tipoDia: string;
  aplicaA: string;
};

type CalendarioRow = {
  id: string;
  fecha: string;
  tipo_dia: string;
  aplica_a: string | null;
};

const TIPOS_VACACION = ["Vacaciones Diciembre", "Vacaciones Pascua"];

export async function listarFechasNoLaborales(): Promise<FechaNoLaboral[]> {
  const rows = await supaGet<CalendarioRow>("calendario_escolar", "limit=1000");
  return rows
    .filter((item) => !TIPOS_VACACION.includes(item.tipo_dia))
    .map((item) => ({
      id: item.id,
      fecha: fechaComoTexto(new Date(item.fecha)),
      tipoDia: item.tipo_dia,
      aplicaA: item.aplica_a || "Ambos",
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function guardarFechaNoLaboral(datos: {
  fecha: string;
  tipoDia: string;
  aplicaA: string;
}): Promise<void> {
  const fecha = datos.fecha.trim();
  const tipoDia = datos.tipoDia.trim();
  const aplicaA = datos.aplicaA.trim();
  if (!fecha || !tipoDia || !aplicaA) {
    throw new Error("Falta fecha, tipoDia o aplicaA");
  }
  if (!["Alumnos", "Docentes", "Ambos"].includes(aplicaA)) {
    throw new Error("aplicaA inválido");
  }
  const existentes = await supaGet<CalendarioRow>(
    "calendario_escolar",
    qs([eqP("fecha", fecha), eqP("aplica_a", aplicaA)])
  );
  if (existentes.length > 0) {
    await supaUpdate("calendario_escolar", eqP("id", existentes[0].id), { tipo_dia: tipoDia });
  } else {
    await supaInsert("calendario_escolar", { fecha, tipo_dia: tipoDia, aplica_a: aplicaA });
  }
}

export async function eliminarFechaNoLaboral(id: string): Promise<void> {
  if (!id) throw new Error("Falta id");
  await supaDelete("calendario_escolar", eqP("id", id));
}

// ---- Periodos vacacionales (rangos) ----

export type PeriodoVacacional = {
  tipoDia: string;
  aplicaA: string;
  fechaInicio: string;
  fechaFin: string;
};

export async function listarPeriodosVacacionales(): Promise<PeriodoVacacional[]> {
  const rows = await supaGet<CalendarioRow>("calendario_escolar", "limit=1000");
  const grupos: Record<string, PeriodoVacacional> = {};
  rows.forEach((item) => {
    if (!TIPOS_VACACION.includes(item.tipo_dia)) return;
    const aplicaA = item.aplica_a || "Ambos";
    const clave = `${item.tipo_dia}|${aplicaA}`;
    const fechaTexto = fechaComoTexto(new Date(item.fecha));
    if (!grupos[clave]) {
      grupos[clave] = { tipoDia: item.tipo_dia, aplicaA, fechaInicio: fechaTexto, fechaFin: fechaTexto };
    } else {
      if (fechaTexto < grupos[clave].fechaInicio) grupos[clave].fechaInicio = fechaTexto;
      if (fechaTexto > grupos[clave].fechaFin) grupos[clave].fechaFin = fechaTexto;
    }
  });
  return Object.values(grupos);
}

export async function guardarPeriodoVacacional(datos: {
  tipoDia: string;
  aplicaA: string;
  fechaInicio: string;
  fechaFin: string;
}): Promise<{ diasGuardados: number }> {
  const tipoDia = datos.tipoDia.trim();
  const aplicaA = datos.aplicaA.trim();
  const fechaInicio = datos.fechaInicio.trim();
  const fechaFin = datos.fechaFin.trim();

  if (!TIPOS_VACACION.includes(tipoDia)) {
    throw new Error("tipoDia inválido");
  }
  if (!["Alumnos", "Docentes"].includes(aplicaA)) {
    throw new Error("aplicaA inválido");
  }
  if (!fechaInicio || !fechaFin || fechaInicio > fechaFin) {
    throw new Error("Rango de fechas inválido");
  }

  const existentes = await supaGet<CalendarioRow>(
    "calendario_escolar",
    qs([eqP("tipo_dia", tipoDia), eqP("aplica_a", aplicaA), "limit=400"])
  );
  for (const item of existentes) {
    await supaDelete("calendario_escolar", eqP("id", item.id));
  }
  const rango = generarRangoFechas(fechaInicio, fechaFin);
  for (const fecha of rango) {
    await supaInsert("calendario_escolar", { fecha, tipo_dia: tipoDia, aplica_a: aplicaA });
  }
  return { diasGuardados: rango.length };
}
