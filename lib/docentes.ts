// Puerto directo de get_reporteDocentesDiario (solo el listado, sin cruzar
// asistencia del dia -- eso lo cubre la seccion Asistencia), get_fichaDocente,
// post_actualizarDocente y post_eliminarDocente (http-functions-supabase.js).

import { supaGet, supaInsert, supaUpdate, supaDelete, eqP, qs } from "./supabaseAdmin";

export type Docente = {
  id: string;
  nombre: string;
  nivelAcademico: string;
  estatus: string;
  foto: string | null;
};

type DocenteRow = {
  id: string;
  nombre: string;
  nivel_academico: string | null;
  estatus: string;
  foto_url: string | null;
};

export async function listarDocentes(): Promise<Docente[]> {
  const rows = await supaGet<DocenteRow>(
    "docentes",
    qs(["select=id,nombre,nivel_academico,estatus,foto_url", "order=nombre.asc", "limit=500"])
  );
  return rows.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    nivelAcademico: d.nivel_academico || "Sin nivel asignado",
    estatus: d.estatus,
    foto: d.foto_url || null,
  }));
}

// Un docente sin bloques configurados se trata como "tiempo completo": usa
// el horario institucional (lib/horarios.ts) y solo puede tener una sesion
// de entrada/salida por dia (comportamiento igual al de siempre). Un docente
// CON bloques puede tener tantas sesiones al dia como bloques tenga -- por
// ejemplo, entra 7-9am, sale en un hueco libre, y regresa a las 11am para su
// siguiente bloque; el retardo de ese segundo regreso se evalua contra la
// hora_inicio del bloque correspondiente (ver lib/escaneo.ts).
export type BloqueHorario = {
  id?: string;
  diaSemana: number; // 1=Lunes ... 6=Sabado
  horaInicio: string; // "HH:MM"
  horaFin: string; // "HH:MM"
  minutosTolerancia: number;
};

type BloqueHorarioRow = {
  id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  minutos_tolerancia: number | null;
};

export type FichaDocente = {
  id: string;
  nombre: string;
  nivelAcademico: string;
  telefono: string | null;
  correo: string | null;
  estatus: string;
  codigoQr: string;
  foto: string | null;
  bloques: BloqueHorario[];
  historial: { fecha: string; estatus: string; horaEntrada: string | null; horaSalida: string | null }[];
  stats: { totalRegistros: number; totalRetardos: number };
};

type FichaDocenteRow = {
  id: string;
  nombre: string;
  nivel_academico: string | null;
  telefono: string | null;
  correo: string | null;
  estatus: string;
  codigo_qr: string;
  foto_url: string | null;
};

type RegistroDocenteRow = {
  fecha: string;
  estatus: string;
  hora_entrada: string | null;
  hora_salida: string | null;
};

export async function obtenerFichaDocente(docenteId: string): Promise<FichaDocente | null> {
  const rows = await supaGet<FichaDocenteRow>("docentes", eqP("id", docenteId));
  if (rows.length === 0) return null;
  const docente = rows[0];

  const [historial, bloquesRows] = await Promise.all([
    supaGet<RegistroDocenteRow>(
      "asistencia_docentes",
      qs([eqP("docente_id", docente.id), "order=fecha.desc", "limit=60"])
    ),
    supaGet<BloqueHorarioRow>(
      "bloques_horario_docentes",
      qs([eqP("docente_id", docente.id), "order=dia_semana.asc,hora_inicio.asc"])
    ),
  ]);

  return {
    id: docente.id,
    nombre: docente.nombre,
    nivelAcademico: docente.nivel_academico || "Sin nivel asignado",
    telefono: docente.telefono,
    correo: docente.correo,
    estatus: docente.estatus,
    codigoQr: docente.codigo_qr,
    foto: docente.foto_url || null,
    bloques: bloquesRows.map((b) => ({
      id: b.id,
      diaSemana: b.dia_semana,
      horaInicio: b.hora_inicio.slice(0, 5),
      horaFin: b.hora_fin.slice(0, 5),
      minutosTolerancia: b.minutos_tolerancia ?? 0,
    })),
    historial: historial.map((h) => ({
      fecha: h.fecha,
      estatus: h.estatus,
      horaEntrada: h.hora_entrada,
      horaSalida: h.hora_salida || null,
    })),
    stats: {
      totalRegistros: historial.length,
      totalRetardos: historial.filter((h) => h.estatus === "Retardo").length,
    },
  };
}

export type DatosEdicionDocente = {
  nombre?: string;
  nivelAcademico?: string;
  telefono?: string;
  correo?: string;
  estatus?: string;
  bloques?: BloqueHorario[];
};

export async function actualizarDocente(docenteId: string, datos: DatosEdicionDocente): Promise<void> {
  const existentes = await supaGet("docentes", eqP("id", docenteId));
  if (existentes.length === 0) throw new Error("Docente no encontrado");

  const patch: Record<string, unknown> = {};
  if (datos.nombre) patch.nombre = datos.nombre.trim();
  if (datos.nivelAcademico !== undefined) patch.nivel_academico = datos.nivelAcademico;
  if (datos.telefono !== undefined) patch.telefono = datos.telefono;
  if (datos.correo !== undefined) patch.correo = datos.correo;
  if (datos.estatus) patch.estatus = datos.estatus;
  if (Object.keys(patch).length > 0) {
    await supaUpdate("docentes", eqP("id", docenteId), patch);
  }

  // Reemplazo total de los bloques (igual que los tutores en lib/alumnos.ts):
  // se borran los existentes y se insertan los nuevos tal como vienen del
  // formulario. Un array vacio significa "volver a tiempo completo" (sin
  // bloques, usa el horario institucional).
  if (datos.bloques) {
    await supaDelete("bloques_horario_docentes", eqP("docente_id", docenteId));
    for (const b of datos.bloques) {
      await supaInsert("bloques_horario_docentes", {
        docente_id: docenteId,
        dia_semana: b.diaSemana,
        hora_inicio: b.horaInicio,
        hora_fin: b.horaFin,
        minutos_tolerancia: b.minutosTolerancia,
      });
    }
  }
}

export async function eliminarDocente(docenteId: string): Promise<void> {
  const existentes = await supaGet("docentes", eqP("id", docenteId));
  if (existentes.length === 0) throw new Error("Docente no encontrado");
  await supaDelete("asistencia_docentes", eqP("docente_id", docenteId));
  await supaDelete("bloques_horario_docentes", eqP("docente_id", docenteId));
  await supaDelete("docentes", eqP("id", docenteId));
}
