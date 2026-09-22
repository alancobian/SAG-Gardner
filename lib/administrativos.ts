// Personal administrativo: listado, ficha y alta.
//
// Comparte tabla con docentes (ver migración 5 y lib/personal.ts). Este archivo
// existe para que la sección tenga su propia capa de datos y nadie tenga que
// acordarse de filtrar por tipo cada vez: aquí el filtro va siempre.

import { supaGet, supaInsert, supaUpdate, supaDelete, eqP, qs } from "./supabaseAdmin";
import { filtroTipoPersonal } from "./personal";

export type Administrativo = {
  id: string;
  nombre: string;
  area: string | null;
  estatus: string;
  foto: string | null;
  codigoQr: string;
};

type AdministrativoRow = {
  id: string;
  nombre: string;
  departamento: string | null;
  estatus: string;
  foto_url: string | null;
  codigo_qr: string;
  telefono?: string | null;
  correo?: string | null;
};

const SELECT_LISTA = "select=id,nombre,departamento,estatus,foto_url,codigo_qr";

function aAdministrativo(row: AdministrativoRow): Administrativo {
  return {
    id: row.id,
    nombre: row.nombre,
    area: row.departamento || null,
    estatus: row.estatus,
    foto: row.foto_url || null,
    codigoQr: row.codigo_qr,
  };
}

/**
 * El personal administrativo no pertenece a un nivel académico, así que no se
 * le aplica el alcance por niveles: quien puede ver la sección los ve a todos.
 * Es deliberado — recepción y mantenimiento no son "de Primaria".
 */
export async function listarAdministrativos(): Promise<Administrativo[]> {
  const rows = await supaGet<AdministrativoRow>(
    "docentes",
    qs([SELECT_LISTA, filtroTipoPersonal("Administrativo"), "order=nombre.asc", "limit=300"])
  );
  return rows.map(aAdministrativo);
}

export type FichaAdministrativo = Administrativo & {
  telefono: string | null;
  correo: string | null;
  registros: { fecha: string; estatus: string; horaEntrada: string | null; horaSalida: string | null }[];
};

type RegistroRow = {
  fecha: string;
  estatus: string;
  hora_entrada: string | null;
  hora_salida: string | null;
};

export async function obtenerFichaAdministrativo(id: string): Promise<FichaAdministrativo | null> {
  const rows = await supaGet<AdministrativoRow>(
    "docentes",
    qs([eqP("id", id), filtroTipoPersonal("Administrativo"), `${SELECT_LISTA},telefono,correo`])
  );
  if (rows.length === 0) return null;

  // Misma tabla de asistencia que los docentes: el kiosco no distingue.
  const registros = await supaGet<RegistroRow>(
    "asistencia_docentes",
    qs([eqP("docente_id", id), "select=fecha,estatus,hora_entrada,hora_salida", "order=fecha.desc", "limit=30"])
  );

  return {
    ...aAdministrativo(rows[0]),
    telefono: rows[0].telefono || null,
    correo: rows[0].correo || null,
    registros: registros.map((r) => ({
      fecha: r.fecha,
      estatus: r.estatus,
      horaEntrada: r.hora_entrada,
      horaSalida: r.hora_salida,
    })),
  };
}

/** Mismo formato que los demás códigos, con su propio prefijo. */
export function generarCodigoQrAdministrativo(): string {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "ADM-";
  for (let i = 0; i < 8; i++) codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  return codigo;
}

export type DatosAltaAdministrativo = {
  nombre: string;
  area?: string;
  telefono?: string;
  correo?: string;
};

export async function crearAdministrativo(
  datos: DatosAltaAdministrativo
): Promise<{ id: string; codigoQr: string }> {
  const nombre = datos.nombre.trim();
  if (!nombre) throw new Error("Falta el nombre");

  const codigoQr = generarCodigoQrAdministrativo();
  const creado = await supaInsert<{ id: string }>("docentes", {
    nombre,
    tipo: "Administrativo",
    departamento: datos.area?.trim() || null,
    telefono: datos.telefono?.trim() || null,
    correo: datos.correo?.trim() || null,
    // Sin nivel académico a propósito: no pertenecen a uno, y dejarlo vacío
    // evita que aparezcan filtrados por nivel en otras pantallas.
    nivel_academico: null,
    codigo_qr: codigoQr,
    estatus: "Activo",
  });
  return { id: creado.id, codigoQr };
}

export async function actualizarAdministrativo(
  id: string,
  datos: Partial<DatosAltaAdministrativo> & { estatus?: string }
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (datos.nombre !== undefined) patch.nombre = datos.nombre.trim();
  if (datos.area !== undefined) patch.departamento = datos.area.trim() || null;
  if (datos.telefono !== undefined) patch.telefono = datos.telefono.trim() || null;
  if (datos.correo !== undefined) patch.correo = datos.correo.trim() || null;
  if (datos.estatus !== undefined) patch.estatus = datos.estatus;
  if (Object.keys(patch).length === 0) return;

  // El filtro por tipo también va en la escritura: así esta función no puede
  // modificar a un docente por accidente si le llega un id equivocado.
  await supaUpdate("docentes", qs([eqP("id", id), filtroTipoPersonal("Administrativo")]), patch);
}

export async function eliminarAdministrativo(id: string): Promise<void> {
  const registros = await supaGet<{ id: string }>(
    "asistencia_docentes",
    qs([eqP("docente_id", id), "select=id", "limit=1"])
  );
  if (registros.length > 0) {
    throw new Error(
      "No se puede borrar: esta persona ya tiene registros de asistencia. Cámbiala a Inactivo para conservar el historial."
    );
  }
  await supaDelete("docentes", qs([eqP("id", id), filtroTipoPersonal("Administrativo")]));
}
