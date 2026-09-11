// Justificantes de inasistencia.
//
// Originalmente esto era un puerto de post_crearJustificante / get_justificantes
// / post_eliminarJustificante (http-functions-supabase.js, Bloque 1), donde un
// justificante cubria UN dia y solo se consultaban los de un alumno buscado.
// Con el rediseño (migracion 1) pasan a cubrir un rango de fechas y a tener un
// tipo de ausencia, y la pantalla muestra los mas recientes de todo el plantel.

import { supaGet, supaInsert, supaDelete, eqP, qs } from "./supabaseAdmin";
import { filtroNivel, tieneAccesoTotal } from "./niveles";

// El catalogo vive aqui y esta replicado como CHECK en la base (ver
// justificantes_tipo_check en schema_sag_migracion1_rediseno.sql): si se agrega
// un tipo hay que tocar los dos lados.
export const TIPOS_JUSTIFICANTE = [
  "Enfermedad",
  "Asunto familiar",
  "Competencia",
  "Otro",
] as const;

export type TipoJustificante = (typeof TIPOS_JUSTIFICANTE)[number];

export type Justificante = {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  tipo: TipoJustificante;
  motivo: string;
  autorizadoPor: string;
};

// El listado general necesita ademas a quien pertenece cada justificante, para
// pintar el nombre y el grupo en la tarjeta.
export type JustificanteConAlumno = Justificante & {
  alumno: { id: string; nombre: string; grupo: string | null; foto: string | null };
};

type JustificanteRow = {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: TipoJustificante;
  motivo: string;
  autorizado_por: string;
};

type JustificanteConAlumnoRow = JustificanteRow & {
  alumno: {
    id: string;
    nombre: string;
    foto_url: string | null;
    grupo: { nombre: string } | null;
  } | null;
};

function aJustificante(j: JustificanteRow): Justificante {
  return {
    id: j.id,
    fechaInicio: j.fecha_inicio,
    fechaFin: j.fecha_fin,
    tipo: j.tipo,
    motivo: j.motivo,
    autorizadoPor: j.autorizado_por,
  };
}

export async function listarJustificantes(alumnoId: string): Promise<Justificante[]> {
  const rows = await supaGet<JustificanteRow>(
    "justificantes",
    qs([eqP("alumno_id", alumnoId), "order=fecha_inicio.desc", "limit=100"])
  );
  return rows.map(aJustificante);
}

// Vista principal de la seccion: los ultimos justificantes del plantel, sin
// tener que buscar alumno por alumno.
export async function listarJustificantesRecientes(
  limite = 60,
  niveles?: string[]
): Promise<JustificanteConAlumno[]> {
  const rows = await supaGet<JustificanteConAlumnoRow>(
    "justificantes",
    qs([
      tieneAccesoTotal(niveles)
        ? "select=*,alumno:alumnos(id,nombre,foto_url,grupo:grupos(nombre))"
        : "select=*,alumno:alumnos!inner(id,nombre,foto_url,grupo:grupos!inner(nombre))",
      filtroNivel(niveles, "alumno.grupo.nivel_academico"),
      "order=fecha_inicio.desc",
      `limit=${limite}`,
    ])
  );
  return rows
    .filter((j) => j.alumno !== null)
    .map((j) => ({
      ...aJustificante(j),
      alumno: {
        id: j.alumno!.id,
        nombre: j.alumno!.nombre,
        grupo: j.alumno!.grupo ? j.alumno!.grupo.nombre : null,
        foto: j.alumno!.foto_url || null,
      },
    }));
}

export type DatosJustificante = {
  alumnoId: string;
  fechaInicio: string;
  fechaFin: string;
  tipo: TipoJustificante;
  motivo: string;
  autorizadoPor: string;
};

export async function crearJustificante(datos: DatosJustificante): Promise<string> {
  if (!datos.alumnoId) throw new Error("Falta el alumno");
  if (!datos.fechaInicio) throw new Error("Falta la fecha de inicio");

  // Un justificante de un solo dia se captura dejando el fin vacio.
  const fechaFin = datos.fechaFin || datos.fechaInicio;
  if (fechaFin < datos.fechaInicio) {
    throw new Error("La fecha de fin no puede ser anterior a la de inicio");
  }
  if (!TIPOS_JUSTIFICANTE.includes(datos.tipo)) {
    throw new Error("Tipo de justificante no válido");
  }

  const nuevo = await supaInsert<{ id: string }>("justificantes", {
    alumno_id: datos.alumnoId,
    fecha_inicio: datos.fechaInicio,
    fecha_fin: fechaFin,
    tipo: datos.tipo,
    motivo: datos.motivo,
    autorizado_por: datos.autorizadoPor,
  });
  return nuevo.id;
}

export async function eliminarJustificante(justificanteId: string): Promise<void> {
  await supaDelete("justificantes", eqP("id", justificanteId));
}
