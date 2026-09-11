// Puerto de get_fichaAlumno, get_grupoAsistencia (solo el roster, sin el
// cruce de asistencia del dia -- eso ya lo cubre la seccion Asistencia),
// post_actualizarAlumno y post_eliminarAlumno (http-functions-supabase.js).

import { supaGet, supaUpdate, supaDelete, supaInsert, eqP, ilikeP, qs } from "./supabaseAdmin";
import { fechaHoyMx } from "./reportes";
import { filtroNivel, puedeVerNivel, tieneAccesoTotal } from "./niveles";

type GrupoRef = { id: string; nombre: string } | null;

type AlumnoRow = {
  id: string;
  nombre: string;
  grupo: GrupoRef;
};

export type AlumnoBusqueda = {
  id: string;
  nombre: string;
  grupo: string;
};

export async function buscarAlumnos(termino: string, niveles?: string[]): Promise<AlumnoBusqueda[]> {
  const texto = termino.trim();
  if (!texto) return [];

  const rows = await supaGet<AlumnoRow>(
    "alumnos",
    qs([
      ilikeP("nombre", texto),
      tieneAccesoTotal(niveles)
        ? "select=id,nombre,grupo:grupos(id,nombre)"
        : "select=id,nombre,grupo:grupos!inner(id,nombre)",
      filtroNivel(niveles, "grupo.nivel_academico"),
      "limit=20",
    ])
  );

  return rows.map((alumno) => ({
    id: alumno.id,
    nombre: alumno.nombre,
    grupo: alumno.grupo ? alumno.grupo.nombre : "Sin grupo",
  }));
}

export type AlumnoRoster = {
  id: string;
  nombre: string;
  // Estatus de inscripcion (Activo / Inactivo / Baja), no de asistencia.
  estatus: string;
  foto: string | null;
  codigoQr: string | null;
  // Asistencia de hoy. Null = todavia no ha pasado su credencial.
  asistenciaHoy: { estatus: string; horaEntrada: string | null } | null;
};

type AlumnoRosterRow = {
  id: string;
  nombre: string;
  estatus: string;
  foto_url: string | null;
  codigo_qr: string | null;
};

export async function listarAlumnosPorGrupo(grupoId: string, niveles?: string[]): Promise<AlumnoRoster[]> {
  // Se valida el grupo, no cada alumno: si el grupo no cae en el alcance del
  // usuario, no hay roster que devolver.
  if (!tieneAccesoTotal(niveles)) {
    const grupo = await supaGet<{ nivel_academico: string }>(
      "grupos",
      qs([eqP("id", grupoId), "select=nivel_academico"])
    );
    if (!grupo[0] || !puedeVerNivel(niveles, grupo[0].nivel_academico)) return [];
  }

  const rows = await supaGet<AlumnoRosterRow>(
    "alumnos",
    qs([eqP("grupo_id", grupoId), "select=id,nombre,estatus,foto_url,codigo_qr", "order=nombre.asc", "limit=200"])
  );

  // La tarjeta de cada alumno muestra si ya entro hoy y a que hora, asi que se
  // cruza el roster contra los registros del dia en una sola consulta extra.
  const registros = await supaGet<{ alumno_id: string; estatus: string; hora_entrada: string | null }>(
    "registros_asistencia",
    qs([eqP("fecha", fechaHoyMx()), "select=alumno_id,estatus,hora_entrada", "limit=1000"])
  );
  const porAlumno = new Map(registros.map((r) => [r.alumno_id, r]));

  return rows.map((a) => {
    const registro = porAlumno.get(a.id);
    return {
      id: a.id,
      nombre: a.nombre,
      estatus: a.estatus,
      foto: a.foto_url || null,
      codigoQr: a.codigo_qr || null,
      asistenciaHoy: registro ? { estatus: registro.estatus, horaEntrada: registro.hora_entrada } : null,
    };
  });
}

export type Tutor = {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  relacion: string | null;
};

export type FichaAlumno = {
  id: string;
  nombre: string;
  estatus: string;
  codigoQr: string;
  foto: string | null;
  grupo: { id: string; nombre: string; grado: string; nivelAcademico: string } | null;
  tutores: Tutor[];
  historial: { fecha: string; estatus: string; horaEntrada: string | null; horaSalida: string | null }[];
  stats: { totalRegistros: number; totalRetardos: number };
};

type FichaAlumnoRow = {
  id: string;
  nombre: string;
  estatus: string;
  codigo_qr: string;
  foto_url: string | null;
  grupo: { id: string; nombre: string; grado: string; nivel_academico: string } | null;
  alumno_tutor: { tutor: { id: string; nombre: string; telefono: string | null; correo: string | null; relacion: string | null } | null }[];
};

type RegistroAsistenciaRow = {
  fecha: string;
  estatus: string;
  hora_entrada: string | null;
  hora_salida: string | null;
};

export async function obtenerFichaAlumno(alumnoId: string, niveles?: string[]): Promise<FichaAlumno | null> {
  const rows = await supaGet<FichaAlumnoRow>(
    "alumnos",
    qs([eqP("id", alumnoId), "select=*,grupo:grupos(*),alumno_tutor(tutor:tutores(*))"])
  );
  if (rows.length === 0) return null;
  const alumno = rows[0];

  // Igual que con docentes: el alcance se respeta aunque se llegue por id
  // directo, no solo desde los listados ya filtrados.
  if (!puedeVerNivel(niveles, alumno.grupo?.nivel_academico ?? null)) return null;

  const historial = await supaGet<RegistroAsistenciaRow>(
    "registros_asistencia",
    qs([eqP("alumno_id", alumno.id), "order=fecha.desc", "limit=60"])
  );

  return {
    id: alumno.id,
    nombre: alumno.nombre,
    estatus: alumno.estatus,
    codigoQr: alumno.codigo_qr,
    foto: alumno.foto_url || null,
    grupo: alumno.grupo
      ? {
          id: alumno.grupo.id,
          nombre: alumno.grupo.nombre,
          grado: alumno.grupo.grado,
          nivelAcademico: alumno.grupo.nivel_academico,
        }
      : null,
    tutores: (alumno.alumno_tutor || [])
      .map((x) => x.tutor)
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .map((tutor) => ({
        id: tutor.id,
        nombre: tutor.nombre,
        telefono: tutor.telefono,
        correo: tutor.correo,
        relacion: tutor.relacion,
      })),
    historial: historial.map((registro) => ({
      fecha: registro.fecha,
      estatus: registro.estatus,
      horaEntrada: registro.hora_entrada || null,
      horaSalida: registro.hora_salida || null,
    })),
    stats: {
      totalRegistros: historial.length,
      totalRetardos: historial.filter((r) => r.estatus === "Retardo").length,
    },
  };
}

export type TutorEdicion = {
  id?: string;
  nombre: string;
  telefono?: string;
  correo?: string;
  relacion?: string;
};

export type DatosEdicionAlumno = {
  nombre?: string;
  estatus?: string;
  grupoId?: string;
  tutores?: TutorEdicion[];
};

export async function actualizarAlumno(alumnoId: string, datos: DatosEdicionAlumno): Promise<void> {
  const existentes = await supaGet("alumnos", eqP("id", alumnoId));
  if (existentes.length === 0) throw new Error("Alumno no encontrado");

  const patch: Record<string, unknown> = {};
  if (datos.nombre) patch.nombre = datos.nombre.trim();
  if (datos.estatus) patch.estatus = datos.estatus;
  if (datos.grupoId) patch.grupo_id = datos.grupoId;
  if (Object.keys(patch).length > 0) {
    await supaUpdate("alumnos", eqP("id", alumnoId), patch);
  }

  if (Array.isArray(datos.tutores)) {
    const idsTutores: string[] = [];
    for (const t of datos.tutores) {
      if (t.id) {
        const tutorRows = await supaGet<{ id: string }>("tutores", eqP("id", t.id));
        if (tutorRows.length === 0) continue;
        const tutorPatch: Record<string, unknown> = {};
        if (t.nombre) tutorPatch.nombre = t.nombre.trim();
        if (t.telefono !== undefined) tutorPatch.telefono = t.telefono;
        if (t.correo !== undefined) tutorPatch.correo = t.correo;
        if (t.relacion) tutorPatch.relacion = t.relacion;
        if (Object.keys(tutorPatch).length > 0) {
          await supaUpdate("tutores", eqP("id", t.id), tutorPatch);
        }
        idsTutores.push(t.id);
      } else if (t.nombre && t.nombre.trim()) {
        const nuevoTutor = await supaInsert<{ id: string }>("tutores", {
          nombre: t.nombre.trim(),
          telefono: t.telefono || "",
          correo: t.correo || "",
          relacion: t.relacion || "Tutor",
        });
        idsTutores.push(nuevoTutor.id);
      }
    }
    await supaDelete("alumno_tutor", eqP("alumno_id", alumnoId));
    for (const tutorId of idsTutores) {
      await supaInsert("alumno_tutor", { alumno_id: alumnoId, tutor_id: tutorId });
    }
  }
}

export async function eliminarAlumno(alumnoId: string): Promise<void> {
  const existentes = await supaGet("alumnos", eqP("id", alumnoId));
  if (existentes.length === 0) throw new Error("Alumno no encontrado");
  await supaDelete("registros_asistencia", eqP("alumno_id", alumnoId));
  await supaDelete("alumno_tutor", eqP("alumno_id", alumnoId));
  await supaDelete("alumnos", eqP("id", alumnoId));
}
