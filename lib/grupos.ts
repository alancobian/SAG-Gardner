// Puerto directo de get_grupos (http-functions-supabase.js, Bloque 1).

import { supaGet, qs } from "./supabaseAdmin";

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

export async function listarGrupos(): Promise<Grupo[]> {
  const rows = await supaGet<GrupoRow>("grupos", qs(["order=nombre.asc", "limit=200"]));
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
