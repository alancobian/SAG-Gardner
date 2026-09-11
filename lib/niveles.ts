// Alcance por nivel académico.
//
// El rol dice QUÉ puede hacer una persona; los niveles dicen QUÉ puede ver.
// La dirección de Primaria, por ejemplo, es un usuario Staff cuyo alcance es
// ["Primaria"]: ve solo los grupos, alumnos y docentes de ese nivel. Un
// administrador general tiene el arreglo vacío, que significa "sin restricción".

export const NIVELES = ["Preescolar", "Primaria", "Secundaria", "Preparatoria"] as const;
export type Nivel = (typeof NIVELES)[number];

/** Un alcance vacío significa acceso a todo el plantel. */
export function tieneAccesoTotal(niveles: string[] | undefined | null): boolean {
  return !niveles || niveles.length === 0;
}

/** ¿Este usuario puede ver información de este nivel? */
export function puedeVerNivel(niveles: string[] | undefined | null, nivel: string | null): boolean {
  if (tieneAccesoTotal(niveles)) return true;
  if (!nivel) return false; // Sin nivel asignado no cae en ningún alcance restringido.
  return niveles!.includes(nivel);
}

/**
 * Filtro de PostgREST para acotar una consulta al alcance del usuario.
 * Devuelve undefined cuando no hay restricción, para no ensuciar la query.
 *
 * `campo` es la ruta a la columna del nivel, que cambia según la tabla:
 * "nivel_academico" en grupos y docentes, "grupo.nivel_academico" cuando se
 * llega al nivel a través de un embed.
 */
export function filtroNivel(niveles: string[] | undefined | null, campo = "nivel_academico"): string | undefined {
  if (tieneAccesoTotal(niveles)) return undefined;
  // in.(...) necesita las comas dentro del paréntesis; los nombres de nivel no
  // llevan comas ni espacios problemáticos, así que no hace falta escaparlos.
  return `${campo}=in.(${niveles!.join(",")})`;
}

/** Texto para la interfaz: "Todos los niveles" o la lista separada por comas. */
export function describirAlcance(niveles: string[] | undefined | null): string {
  return tieneAccesoTotal(niveles) ? "Todos los niveles" : niveles!.join(", ");
}
