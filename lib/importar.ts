// Puerto directo de post_importarAlumnos y post_importarDocentes
// (http-functions-supabase.js, Bloque 1). El CSV se parsea en el cliente
// (lib/csv.ts) -- estas funciones reciben las filas ya como objetos, igual
// que el backend original recibia datos.filas ya parseado desde el panel.

import { supaGet, supaInsert, eqP, qs } from "./supabaseAdmin";

async function buscarOCrearGrupo(nombreGrupo: string, grado?: string, nivelAcademico?: string): Promise<string> {
  const existentes = await supaGet<{ id: string }>("grupos", eqP("nombre", nombreGrupo));
  if (existentes.length > 0) return existentes[0].id;
  const nuevo = await supaInsert<{ id: string }>("grupos", {
    nombre: nombreGrupo,
    grado: grado || "",
    nivel_academico: nivelAcademico || "",
  });
  return nuevo.id;
}

async function buscarOCrearTutor(
  nombreTutor?: string,
  telefonoTutor?: string,
  correoTutor?: string
): Promise<string | null> {
  if (!nombreTutor) return null;
  const existentes = await supaGet<{ id: string }>(
    "tutores",
    qs([eqP("nombre", nombreTutor), eqP("telefono", telefonoTutor || "")])
  );
  if (existentes.length > 0) return existentes[0].id;
  const nuevo = await supaInsert<{ id: string }>("tutores", {
    nombre: nombreTutor,
    telefono: telefonoTutor || "",
    correo: correoTutor || "",
    relacion: "Tutor",
  });
  return nuevo.id;
}

function generarCodigoQr(): string {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "GARD-";
  for (let i = 0; i < 8; i++) codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  return codigo;
}

function generarCodigoQrDocente(): string {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "DOC-";
  for (let i = 0; i < 8; i++) codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  return codigo;
}

export type FilaImportacionAlumno = {
  nombre: string;
  grupo?: string;
  grado?: string;
  nivelAcademico?: string;
  tutorNombre?: string;
  tutorTelefono?: string;
  tutorCorreo?: string;
};

export type FilaImportacionDocente = {
  nombre: string;
  nivelAcademico?: string;
  telefono?: string;
  correo?: string;
};

export type ResultadoImportacion = {
  nombre: string;
  ok: boolean;
  error?: string;
  codigoQr?: string;
  id?: string;
};

export async function importarAlumnos(filas: FilaImportacionAlumno[]): Promise<ResultadoImportacion[]> {
  const resultados: ResultadoImportacion[] = [];
  for (const fila of filas) {
    try {
      if (!fila.nombre || !fila.nombre.trim()) {
        resultados.push({ nombre: fila.nombre || "(sin nombre)", ok: false, error: "Falta el nombre del alumno" });
        continue;
      }
      const grupoId = fila.grupo ? await buscarOCrearGrupo(fila.grupo, fila.grado, fila.nivelAcademico) : null;
      const tutorId = await buscarOCrearTutor(fila.tutorNombre, fila.tutorTelefono, fila.tutorCorreo);
      const codigoQr = generarCodigoQr();
      const alumnoInsertado = await supaInsert<{ id: string }>("alumnos", {
        nombre: fila.nombre.trim(),
        grupo_id: grupoId,
        codigo_qr: codigoQr,
        estatus: "Activo",
      });
      if (tutorId) {
        await supaInsert("alumno_tutor", { alumno_id: alumnoInsertado.id, tutor_id: tutorId });
      }
      resultados.push({ nombre: fila.nombre.trim(), ok: true, codigoQr, id: alumnoInsertado.id });
    } catch (errorFila) {
      resultados.push({
        nombre: fila.nombre || "(sin nombre)",
        ok: false,
        error: errorFila instanceof Error ? errorFila.message : String(errorFila),
      });
    }
  }
  return resultados;
}

export async function importarDocentes(filas: FilaImportacionDocente[]): Promise<ResultadoImportacion[]> {
  const resultados: ResultadoImportacion[] = [];
  for (const fila of filas) {
    try {
      if (!fila.nombre || !fila.nombre.trim()) {
        resultados.push({ nombre: fila.nombre || "(sin nombre)", ok: false, error: "Falta el nombre del docente" });
        continue;
      }
      const codigoQr = generarCodigoQrDocente();
      const docenteInsertado = await supaInsert<{ id: string }>("docentes", {
        nombre: fila.nombre.trim(),
        nivel_academico: fila.nivelAcademico || "",
        telefono: fila.telefono || "",
        correo: fila.correo || "",
        codigo_qr: codigoQr,
        estatus: "Activo",
      });
      resultados.push({ nombre: fila.nombre.trim(), ok: true, codigoQr, id: docenteInsertado.id });
    } catch (errorFila) {
      resultados.push({
        nombre: fila.nombre || "(sin nombre)",
        ok: false,
        error: errorFila instanceof Error ? errorFila.message : String(errorFila),
      });
    }
  }
  return resultados;
}
