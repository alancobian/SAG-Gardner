// Puerto directo de post_escaneo, post_escaneoManual, procesarEscaneoAlumno y
// procesarEscaneoDocente (http-functions-supabase.js, Bloque 1), más una
// funcion nueva -- obtenerHistorialReciente() -- que no existia en el Custom
// Embed de Wix: aprovecha la columna updated_at (presente en ambas tablas de
// asistencia) para mostrar los ultimos escaneos, sin importar si fueron
// entrada o salida.

import { supaGet, supaInsert, supaUpdate, eqP, qs } from "./supabaseAdmin";

const OFFSET_HORAS_MX = -6;

function horaLocalMx(): Date {
  const ahora = new Date();
  return new Date(ahora.getTime() + OFFSET_HORAS_MX * 60 * 60 * 1000);
}
function minutosDesdeMedianoche(fecha: Date): number {
  return fecha.getUTCHours() * 60 + fecha.getUTCMinutes();
}
function fechaComoTexto(fecha: Date): string {
  const anio = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}
// Las columnas "time" de Postgres llegan via PostgREST como texto plano
// "HH:MM:SS" (no como fecha completa), asi que se parsean directo en vez de
// pasar por `new Date(...)` (que produce Invalid Date con solo una hora).
function minutosDesdeTexto(horaTexto: string): number {
  const [horas, minutos] = horaTexto.split(":").map(Number);
  return horas * 60 + (minutos || 0);
}
// getUTCDay() sobre la fecha ya desplazada a hora de Mexico (ver horaLocalMx)
// da el dia de la semana correcto en horario local: 0=Domingo, 1=Lunes ...
// 6=Sabado -- coincide exactamente con dia_semana en bloques_horario_docentes
// (1=Lunes...6=Sabado); domingo (0) nunca hace match con ningun bloque.
function diaSemanaMx(fecha: Date): number {
  return fecha.getUTCDay();
}

export type ResultadoEscaneo =
  | "entrada"
  | "salida"
  | "ya_completo"
  | "inactivo"
  | "no_encontrado"
  | "sesion_invalida";

export type RespuestaEscaneo = {
  resultado: ResultadoEscaneo;
  estatus?: "Puntual" | "Retardo";
  tipoPersona?: "alumno" | "docente";
  persona?: { nombre: string; foto: string | null; grupo: string | null };
};

type GrupoRefRow = { id: string; nombre: string } | null;

type AlumnoEscaneoRow = {
  id: string;
  nombre: string;
  estatus: string;
  foto_url: string | null;
  grupo: GrupoRefRow;
};

type DocenteEscaneoRow = {
  id: string;
  nombre: string;
  estatus: string;
  foto_url: string | null;
  nivel_academico: string | null;
};

type RegistroAsistenciaRow = { id: string; hora_salida: string | null };
type HorarioRetardoRow = { hora_entrada: string; minutos_tolerancia: number | null };
type BloqueHorarioEscaneoRow = { id: string; hora_inicio: string; hora_fin: string; minutos_tolerancia: number | null };
type RegistroDocenteHoyRow = { id: string; hora_entrada: string; hora_salida: string | null };

async function procesarEscaneoAlumno(alumno: AlumnoEscaneoRow, usuarioId: string): Promise<RespuestaEscaneo> {
  const grupoTexto = alumno.grupo ? alumno.grupo.nombre : null;
  const persona = { nombre: alumno.nombre, foto: alumno.foto_url || null, grupo: grupoTexto };

  if (alumno.estatus !== "Activo") {
    return { resultado: "inactivo", tipoPersona: "alumno", persona };
  }

  const ahoraMx = horaLocalMx();
  const fechaHoy = fechaComoTexto(ahoraMx);
  const registrosHoy = await supaGet<RegistroAsistenciaRow>(
    "registros_asistencia",
    qs([eqP("alumno_id", alumno.id), eqP("fecha", fechaHoy)])
  );

  if (registrosHoy.length > 0 && registrosHoy[0].hora_salida) {
    return { resultado: "ya_completo", tipoPersona: "alumno", persona };
  }

  if (registrosHoy.length > 0) {
    const registro = registrosHoy[0];
    await supaUpdate("registros_asistencia", eqP("id", registro.id), {
      hora_salida: ahoraMx,
      registrado_por_salida_id: usuarioId,
    });
    return { resultado: "salida", tipoPersona: "alumno", persona };
  }

  let estatusEntrada: "Puntual" | "Retardo" = "Puntual";
  if (alumno.grupo) {
    const horarios = await supaGet<HorarioRetardoRow>("horarios_retardo", eqP("grupo_id", alumno.grupo.id));
    if (horarios.length > 0) {
      const horario = horarios[0];
      const minutosProgramados = minutosDesdeTexto(horario.hora_entrada);
      const minutosTolerancia = horario.minutos_tolerancia || 0;
      const minutosReales = minutosDesdeMedianoche(ahoraMx);
      if (minutosReales > minutosProgramados + minutosTolerancia) {
        estatusEntrada = "Retardo";
      }
    }
  }

  await supaInsert("registros_asistencia", {
    alumno_id: alumno.id,
    fecha: fechaHoy,
    hora_entrada: ahoraMx,
    estatus: estatusEntrada,
    origen: "QR",
    registrado_por_entrada_id: usuarioId,
  });

  return { resultado: "entrada", estatus: estatusEntrada, tipoPersona: "alumno", persona };
}

// Un docente sin bloques configurados para el dia de hoy se trata como
// "tiempo completo": una sola sesion entrada/salida al dia, evaluada contra
// el horario institucional (horario_retardo_docentes) -- exactamente el
// comportamiento de siempre, sin cambios. Un docente CON bloques hoy puede
// tener hasta tantas sesiones de entrada/salida como bloques tenga ese dia
// (por ejemplo: entra 7-9am, sale en un hueco libre, y regresa a las 11am
// para su siguiente bloque). Cada regreso se evalua contra la hora_inicio
// del bloque que le corresponde cronologicamente (el bloque N-esimo, donde N
// es el numero de sesiones ya completadas ese dia), para poder marcar
// "Retardo" si regresa tarde de un hueco -- no solo en la entrada de la
// mañana.
async function procesarEscaneoDocente(docente: DocenteEscaneoRow, usuarioId: string): Promise<RespuestaEscaneo> {
  const persona = { nombre: docente.nombre, foto: docente.foto_url || null, grupo: docente.nivel_academico || null };

  if (docente.estatus !== "Activo") {
    return { resultado: "inactivo", tipoPersona: "docente", persona };
  }

  const ahoraMx = horaLocalMx();
  const fechaHoy = fechaComoTexto(ahoraMx);

  const bloquesHoy = await supaGet<BloqueHorarioEscaneoRow>(
    "bloques_horario_docentes",
    qs([eqP("docente_id", docente.id), eqP("dia_semana", String(diaSemanaMx(ahoraMx))), "order=hora_inicio.asc"])
  );

  if (bloquesHoy.length === 0) {
    // Tiempo completo: comportamiento identico al de siempre.
    const registrosHoy = await supaGet<RegistroAsistenciaRow>(
      "asistencia_docentes",
      qs([eqP("docente_id", docente.id), eqP("fecha", fechaHoy)])
    );

    if (registrosHoy.length > 0 && registrosHoy[0].hora_salida) {
      return { resultado: "ya_completo", tipoPersona: "docente", persona };
    }

    if (registrosHoy.length > 0) {
      const registro = registrosHoy[0];
      await supaUpdate("asistencia_docentes", eqP("id", registro.id), {
        hora_salida: ahoraMx,
        registrado_por_salida_id: usuarioId,
      });
      return { resultado: "salida", tipoPersona: "docente", persona };
    }

    let estatusEntrada: "Puntual" | "Retardo" = "Puntual";
    const horarios = await supaGet<HorarioRetardoRow>("horario_retardo_docentes", "limit=1");
    if (horarios.length > 0) {
      const horario = horarios[0];
      const minutosProgramados = minutosDesdeTexto(horario.hora_entrada);
      const minutosTolerancia = horario.minutos_tolerancia || 0;
      const minutosReales = minutosDesdeMedianoche(ahoraMx);
      if (minutosReales > minutosProgramados + minutosTolerancia) {
        estatusEntrada = "Retardo";
      }
    }

    await supaInsert("asistencia_docentes", {
      docente_id: docente.id,
      fecha: fechaHoy,
      hora_entrada: ahoraMx,
      estatus: estatusEntrada,
      registrado_por_entrada_id: usuarioId,
    });

    return { resultado: "entrada", estatus: estatusEntrada, tipoPersona: "docente", persona };
  }

  // Docente con bloques hoy: soporte multi-sesion.
  const registrosHoy = await supaGet<RegistroDocenteHoyRow>(
    "asistencia_docentes",
    qs([eqP("docente_id", docente.id), eqP("fecha", fechaHoy), "order=hora_entrada.asc"])
  );

  const sesionAbierta = registrosHoy.find((r) => !r.hora_salida);
  if (sesionAbierta) {
    await supaUpdate("asistencia_docentes", eqP("id", sesionAbierta.id), {
      hora_salida: ahoraMx,
      registrado_por_salida_id: usuarioId,
    });
    return { resultado: "salida", tipoPersona: "docente", persona };
  }

  if (registrosHoy.length >= bloquesHoy.length) {
    return { resultado: "ya_completo", tipoPersona: "docente", persona };
  }

  const bloqueCorrespondiente = bloquesHoy[registrosHoy.length];
  let estatusEntrada: "Puntual" | "Retardo" = "Puntual";
  const minutosProgramados = minutosDesdeTexto(bloqueCorrespondiente.hora_inicio);
  const minutosTolerancia = bloqueCorrespondiente.minutos_tolerancia || 0;
  const minutosReales = minutosDesdeMedianoche(ahoraMx);
  if (minutosReales > minutosProgramados + minutosTolerancia) {
    estatusEntrada = "Retardo";
  }

  await supaInsert("asistencia_docentes", {
    docente_id: docente.id,
    fecha: fechaHoy,
    hora_entrada: ahoraMx,
    estatus: estatusEntrada,
    registrado_por_entrada_id: usuarioId,
  });

  return { resultado: "entrada", estatus: estatusEntrada, tipoPersona: "docente", persona };
}

/** Puerto de post_escaneo: busca por codigoQr entre alumnos y luego docentes. */
export async function registrarEscaneo(codigoQr: string, usuarioId: string): Promise<RespuestaEscaneo> {
  const alumnos = await supaGet<AlumnoEscaneoRow>(
    "alumnos",
    qs([eqP("codigo_qr", codigoQr), "select=*,grupo:grupos(*)"])
  );
  if (alumnos.length > 0) {
    return procesarEscaneoAlumno(alumnos[0], usuarioId);
  }
  const docentes = await supaGet<DocenteEscaneoRow>("docentes", eqP("codigo_qr", codigoQr));
  if (docentes.length > 0) {
    return procesarEscaneoDocente(docentes[0], usuarioId);
  }
  return { resultado: "no_encontrado" };
}

/** Puerto de post_escaneoManual: mismo procesamiento, localizando al alumno por id. */
export async function registrarEscaneoManual(alumnoId: string, usuarioId: string): Promise<RespuestaEscaneo> {
  const alumnos = await supaGet<AlumnoEscaneoRow>(
    "alumnos",
    qs([eqP("id", alumnoId), "select=*,grupo:grupos(*)"])
  );
  if (alumnos.length === 0) {
    return { resultado: "no_encontrado" };
  }
  return procesarEscaneoAlumno(alumnos[0], usuarioId);
}

// ============================================================
// HISTORICO RECIENTE (nuevo -- no existia en el Custom Embed de Wix).
// Ambas tablas de asistencia tienen updated_at (se actualiza tanto al
// insertar la entrada como al marcar la salida), asi que basta con pedir
// los ultimos N de cada una ordenados por updated_at y fusionarlos.
// Incluye alumnos y docentes juntos porque el mismo lector los escanea
// indistintamente -- se distinguen en la UI con una etiqueta de tipo.
// ============================================================

export type ItemHistorial = {
  id: string;
  tipoPersona: "alumno" | "docente";
  nombre: string;
  foto: string | null;
  grupo: string | null;
  estatus: string;
  movimiento: "entrada" | "salida";
  hora: string;
  actualizado: string;
};

type HistorialAlumnoRow = {
  id: string;
  estatus: string;
  hora_entrada: string;
  hora_salida: string | null;
  updated_at: string;
  alumno: { nombre: string; foto_url: string | null; grupo: { nombre: string } | null } | null;
};

type HistorialDocenteRow = {
  id: string;
  estatus: string;
  hora_entrada: string;
  hora_salida: string | null;
  updated_at: string;
  docente: { nombre: string; foto_url: string | null; nivel_academico: string | null } | null;
};

export async function obtenerHistorialReciente(limite = 10): Promise<ItemHistorial[]> {
  const [registrosAlumnos, registrosDocentes] = await Promise.all([
    supaGet<HistorialAlumnoRow>(
      "registros_asistencia",
      qs([
        "select=id,estatus,hora_entrada,hora_salida,updated_at,alumno:alumnos(nombre,foto_url,grupo:grupos(nombre))",
        "order=updated_at.desc",
        `limit=${limite}`,
      ])
    ),
    supaGet<HistorialDocenteRow>(
      "asistencia_docentes",
      qs([
        "select=id,estatus,hora_entrada,hora_salida,updated_at,docente:docentes(nombre,foto_url,nivel_academico)",
        "order=updated_at.desc",
        `limit=${limite}`,
      ])
    ),
  ]);

  const itemsAlumnos: ItemHistorial[] = registrosAlumnos
    .filter((r) => r.alumno)
    .map((r) => ({
      id: r.id,
      tipoPersona: "alumno" as const,
      nombre: r.alumno!.nombre,
      foto: r.alumno!.foto_url || null,
      grupo: r.alumno!.grupo ? r.alumno!.grupo.nombre : null,
      estatus: r.estatus,
      movimiento: r.hora_salida ? ("salida" as const) : ("entrada" as const),
      hora: r.hora_salida || r.hora_entrada,
      actualizado: r.updated_at,
    }));

  const itemsDocentes: ItemHistorial[] = registrosDocentes
    .filter((r) => r.docente)
    .map((r) => ({
      id: r.id,
      tipoPersona: "docente" as const,
      nombre: r.docente!.nombre,
      foto: r.docente!.foto_url || null,
      grupo: r.docente!.nivel_academico || null,
      estatus: r.estatus,
      movimiento: r.hora_salida ? ("salida" as const) : ("entrada" as const),
      hora: r.hora_salida || r.hora_entrada,
      actualizado: r.updated_at,
    }));

  return [...itemsAlumnos, ...itemsDocentes]
    .sort((a, b) => new Date(b.actualizado).getTime() - new Date(a.actualizado).getTime())
    .slice(0, limite);
}
