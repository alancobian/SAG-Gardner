// Puerto directo de get_reporteDocentesDiario (solo el listado, sin cruzar
// asistencia del dia -- eso lo cubre la seccion Asistencia), get_fichaDocente,
// post_actualizarDocente y post_eliminarDocente (http-functions-supabase.js).

import { supaGet, supaUpdate, supaDelete, eqP, qs } from "./supabaseAdmin";

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

export type FichaDocente = {
  id: string;
  nombre: string;
  nivelAcademico: string;
  telefono: string | null;
  correo: string | null;
  estatus: string;
  codigoQr: string;
  foto: string | null;
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

  const historial = await supaGet<RegistroDocenteRow>(
    "asistencia_docentes",
    qs([eqP("docente_id", docente.id), "order=fecha.desc", "limit=60"])
  );

  return {
    id: docente.id,
    nombre: docente.nombre,
    nivelAcademico: docente.nivel_academico || "Sin nivel asignado",
    telefono: docente.telefono,
    correo: docente.correo,
    estatus: docente.estatus,
    codigoQr: docente.codigo_qr,
    foto: docente.foto_url || null,
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
}

export async function eliminarDocente(docenteId: string): Promise<void> {
  const existentes = await supaGet("docentes", eqP("id", docenteId));
  if (existentes.length === 0) throw new Error("Docente no encontrado");
  await supaDelete("asistencia_docentes", eqP("docente_id", docenteId));
  await supaDelete("docentes", eqP("id", docenteId));
}
