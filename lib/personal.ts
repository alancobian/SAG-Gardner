// Tipos de personal del SAG.
//
// Docentes y personal administrativo viven en la MISMA tabla (`docentes`),
// distinguidos por la columna `tipo` que agrega la migración 5. La razón está
// explicada a detalle en esa migración; en corto: la mecánica de asistencia es
// idéntica, y GMessage consume funciones sobre esa tabla que se romperían si
// se renombrara o se partiera en dos.
//
// El precio de esa decisión es que TODA consulta sobre personal tiene que
// decir de qué tipo habla. Este archivo existe para que ese filtro sea una
// sola cosa con nombre, y no una cadena suelta repetida por todo el código:
// si alguien olvida filtrar, el personal administrativo aparece listado como
// maestro y los conteos de docentes salen inflados.

export const TIPOS_PERSONAL = ["Docente", "Administrativo"] as const;
export type TipoPersonal = (typeof TIPOS_PERSONAL)[number];

/** Filtro PostgREST para acotar una consulta a un tipo de personal. */
export function filtroTipoPersonal(tipo: TipoPersonal): string {
  return `tipo=eq.${tipo}`;
}

/**
 * Los registros anteriores a la migración 5 no tienen `tipo`, y mientras la
 * migración no se haya corrido la columna ni siquiera existe. En ese estado,
 * todo lo que hay en la tabla son docentes.
 */
export function esAdministrativo(tipo: string | null | undefined): boolean {
  return tipo === "Administrativo";
}

/** Áreas sugeridas. No es una lista cerrada: el campo acepta texto libre. */
export const AREAS_SUGERIDAS = [
  "Dirección",
  "Control escolar",
  "Administración",
  "Prefectura",
  "Recepción",
  "Mantenimiento",
  "Enfermería",
  "Biblioteca",
] as const;
