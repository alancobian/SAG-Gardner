// Puerto directo de get_grupos (http-functions-supabase.js, Bloque 1).

import { supaGet, supaUpdate, supaDelete, supaCount, eqP, qs } from "./supabaseAdmin";
import { filtroNivel } from "./niveles";

export type Grupo = {
  id: string;
  nombre: string;
  grado: string;
  nivelAcademico: string;
};

type GrupoRow = {
  id: string;
  nombre: string;
  grado: string;
  nivel_academico: string;
};

const ORDEN_NIVEL: Record<string, number> = {
  Preescolar: 0,
  Primaria: 1,
  Secundaria: 2,
  Preparatoria: 3,
};

// ---- Administración de grupos (Ajustes → Grupos, solo Administrador) ----

export type GrupoAdmin = Grupo & {
  alumnos: number;
  docenteTitularId: string | null;
  docenteTitular: string | null;
};

type GrupoAdminRow = GrupoRow & {
  docente_titular_id: string | null;
  docente_titular: { nombre: string } | null;
  alumnos: { count: number }[];
};

export async function listarGruposAdmin(): Promise<GrupoAdmin[]> {
  const rows = await supaGet<GrupoAdminRow>(
    "grupos",
    qs([
      "select=*,docente_titular:docentes!grupos_docente_titular_id_fkey(nombre),alumnos(count)",
      "order=nombre.asc",
      "limit=200",
    ])
  );
  return rows
    .map((g) => ({
      id: g.id,
      nombre: g.nombre,
      grado: g.grado,
      nivelAcademico: g.nivel_academico,
      alumnos: g.alumnos?.[0]?.count ?? 0,
      docenteTitularId: g.docente_titular_id,
      docenteTitular: g.docente_titular?.nombre ?? null,
    }))
    .sort((a, b) => {
      const nivelA = ORDEN_NIVEL[a.nivelAcademico] ?? 99;
      const nivelB = ORDEN_NIVEL[b.nivelAcademico] ?? 99;
      if (nivelA !== nivelB) return nivelA - nivelB;
      return a.nombre.localeCompare(b.nombre, "es", { numeric: true });
    });
}

export async function asignarDocenteTitular(grupoId: string, docenteId: string | null): Promise<void> {
  if (!grupoId) throw new Error("Falta el grupo");
  await supaUpdate("grupos", eqP("id", grupoId), { docente_titular_id: docenteId });
}

// Borrado seguro: solo procede si el grupo esta realmente vacio.
//
// Las validaciones van aqui, en el servidor, y no solo en el boton de la
// pantalla: si algun dia se llama esta funcion desde otro lado, un grupo con
// alumnos sigue sin poder borrarse. Es la unica accion del panel que no tiene
// vuelta atras.
export async function eliminarGrupo(grupoId: string): Promise<void> {
  if (!grupoId) throw new Error("Falta el grupo");

  const [alumnos, comunicados] = await Promise.all([
    supaCount("alumnos", eqP("grupo_id", grupoId)),
    supaCount("comunicado_grupos", eqP("grupo_id", grupoId)),
  ]);

  if (alumnos > 0) {
    throw new Error(
      `No se puede borrar: el grupo todavía tiene ${alumnos} ${alumnos === 1 ? "alumno" : "alumnos"}. Muévelos a otro grupo primero.`
    );
  }
  if (comunicados > 0) {
    throw new Error(
      "No se puede borrar: hay comunicados enviados a este grupo y se perdería ese historial."
    );
  }

  // Los vínculos de mensajería sí se limpian: solo tienen sentido junto con el
  // grupo y no son historial de nada.
  await supaDelete("docente_grupo", eqP("grupo_id", grupoId));
  await supaDelete("grupos", eqP("id", grupoId));
}

// `niveles` acota el resultado al alcance del usuario (vacío = todos). Ver
// lib/niveles.ts.
export async function listarGrupos(niveles?: string[]): Promise<Grupo[]> {
  const rows = await supaGet<GrupoRow>(
    "grupos",
    qs([filtroNivel(niveles), "order=nombre.asc", "limit=200"])
  );
  const grupos = rows.map((g) => ({
    id: g.id,
    nombre: g.nombre,
    grado: g.grado,
    nivelAcademico: g.nivel_academico,
  }));
  return grupos.sort((a, b) => {
    const nivelA = ORDEN_NIVEL[a.nivelAcademico] ?? 99;
    const nivelB = ORDEN_NIVEL[b.nivelAcademico] ?? 99;
    if (nivelA !== nivelB) return nivelA - nivelB;
    return a.nombre.localeCompare(b.nombre, "es", { numeric: true });
  });
}
