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

/**
 * Roles de titular que admite un grupo.
 *
 * Primaria es bilingüe y tiene dos responsables por grupo (medio día en cada
 * idioma); el resto de los niveles tiene uno solo. Ver migración 4.
 */
export type RolTitular = "titular" | "ingles";

/** Solo Primaria lleva co-titular de Inglés. */
export function admiteTitularIngles(nivelAcademico: string): boolean {
  return nivelAcademico === "Primaria";
}

/** Etiqueta del rol principal, que cambia de nombre según el nivel. */
export function etiquetaTitular(nivelAcademico: string): string {
  return admiteTitularIngles(nivelAcademico) ? "Titular de Español" : "Titular";
}

export type GrupoAdmin = Grupo & {
  alumnos: number;
  docenteTitularId: string | null;
  docenteTitular: string | null;
  docenteTitularInglesId: string | null;
  docenteTitularIngles: string | null;
};

type GrupoAdminRow = GrupoRow & {
  docente_titular_id: string | null;
  docente_titular: { nombre: string } | null;
  docente_titular_ingles_id?: string | null;
  docente_titular_ingles?: { nombre: string } | null;
  alumnos: { count: number }[];
};

const SELECT_TITULARES =
  "select=*,docente_titular:docentes!grupos_docente_titular_id_fkey(nombre)," +
  "docente_titular_ingles:docentes!grupos_docente_titular_ingles_id_fkey(nombre),alumnos(count)";

const SELECT_TITULARES_SIN_INGLES =
  "select=*,docente_titular:docentes!grupos_docente_titular_id_fkey(nombre),alumnos(count)";

export async function listarGruposAdmin(): Promise<GrupoAdmin[]> {
  // La columna docente_titular_ingles_id la agrega la migración 4. Si el
  // código llega a producción antes que la migración, se reintenta sin ella en
  // vez de dejar la pantalla de Grupos completamente rota.
  let rows: GrupoAdminRow[];
  try {
    rows = await supaGet<GrupoAdminRow>(
      "grupos",
      qs([SELECT_TITULARES, "order=nombre.asc", "limit=200"])
    );
  } catch {
    rows = await supaGet<GrupoAdminRow>(
      "grupos",
      qs([SELECT_TITULARES_SIN_INGLES, "order=nombre.asc", "limit=200"])
    );
  }
  return rows
    .map((g) => ({
      id: g.id,
      nombre: g.nombre,
      grado: g.grado,
      nivelAcademico: g.nivel_academico,
      alumnos: g.alumnos?.[0]?.count ?? 0,
      docenteTitularId: g.docente_titular_id,
      docenteTitular: g.docente_titular?.nombre ?? null,
      docenteTitularInglesId: g.docente_titular_ingles_id ?? null,
      docenteTitularIngles: g.docente_titular_ingles?.nombre ?? null,
    }))
    .sort((a, b) => {
      const nivelA = ORDEN_NIVEL[a.nivelAcademico] ?? 99;
      const nivelB = ORDEN_NIVEL[b.nivelAcademico] ?? 99;
      if (nivelA !== nivelB) return nivelA - nivelB;
      return a.nombre.localeCompare(b.nombre, "es", { numeric: true });
    });
}

export async function asignarDocenteTitular(
  grupoId: string,
  docenteId: string | null,
  rol: RolTitular = "titular"
): Promise<void> {
  if (!grupoId) throw new Error("Falta el grupo");

  // Un mismo docente no puede ser los dos titulares del grupo: sería un error
  // de captura, no una configuración válida.
  if (docenteId) {
    const [grupo] = await supaGet<{
      docente_titular_id: string | null;
      docente_titular_ingles_id?: string | null;
    }>("grupos", qs([eqP("id", grupoId), "select=docente_titular_id,docente_titular_ingles_id"]));
    const otro = rol === "ingles" ? grupo?.docente_titular_id : grupo?.docente_titular_ingles_id;
    if (otro && otro === docenteId) {
      throw new Error("Ese docente ya es el otro titular del grupo. Elige a alguien distinto.");
    }
  }

  const campo = rol === "ingles" ? "docente_titular_ingles_id" : "docente_titular_id";
  await supaUpdate("grupos", eqP("id", grupoId), { [campo]: docenteId });
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
