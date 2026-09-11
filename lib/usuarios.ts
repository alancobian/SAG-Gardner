// Puerto directo de get_usuarios / post_crearUsuario / post_actualizarUsuario
// (http-functions-supabase.js, Bloque 1).

import { supaGet, supaInsert, supaUpdate, eqP, qs } from "./supabaseAdmin";
import { NIVELES, type Nivel } from "./niveles";

export const ROLES_VALIDOS = ["Administrador", "Staff", "Portería"] as const;
export type Rol = (typeof ROLES_VALIDOS)[number];

export type Usuario = {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  /** Niveles que puede ver. Vacío = todo el plantel. Ver lib/niveles.ts. */
  niveles: string[];
};

type UsuarioRow = {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean | null;
  niveles: string[] | null;
};

export async function listarUsuarios(): Promise<Usuario[]> {
  const rows = await supaGet<UsuarioRow>("usuarios_sistema", qs(["order=nombre.asc", "limit=200"]));
  return rows.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    rol: u.rol,
    activo: u.activo !== false,
    niveles: u.niveles ?? [],
  }));
}

export type DatosNuevoUsuario = {
  nombre: string;
  correo: string;
  pin: string;
  rol: string;
};

export async function crearUsuario(datos: DatosNuevoUsuario): Promise<{ id: string }> {
  const nombre = datos.nombre.trim();
  const correo = datos.correo.trim().toLowerCase();
  const pin = datos.pin.trim();
  const rol = datos.rol.trim();

  if (!nombre || !correo || !pin || !rol) {
    throw new Error("Falta nombre, correo, pin o rol");
  }
  if (!ROLES_VALIDOS.includes(rol as Rol)) {
    throw new Error("Rol inválido");
  }

  const existentes = await supaGet("usuarios_sistema", eqP("correo", correo));
  if (existentes.length > 0) {
    throw new Error("Ya existe una cuenta con ese correo");
  }

  const nuevo = await supaInsert<{ id: string }>("usuarios_sistema", { nombre, correo, pin, rol, activo: true });
  return { id: nuevo.id };
}

export type DatosEdicionUsuario = {
  nombre?: string;
  correo?: string;
  pin?: string;
  rol?: string;
  activo?: boolean;
  /** Arreglo vacío = sin restricción de nivel. */
  niveles?: string[];
};

export async function actualizarUsuario(objetivoId: string, datos: DatosEdicionUsuario): Promise<void> {
  const rows = await supaGet("usuarios_sistema", eqP("id", objetivoId));
  if (rows.length === 0) throw new Error("Usuario no encontrado");

  const patch: Record<string, unknown> = {};
  if (datos.nombre) patch.nombre = datos.nombre.trim();
  if (datos.correo) patch.correo = datos.correo.trim().toLowerCase();
  if (datos.pin) patch.pin = datos.pin.trim();
  if (datos.rol) {
    if (!ROLES_VALIDOS.includes(datos.rol as Rol)) {
      throw new Error("Rol inválido");
    }
    patch.rol = datos.rol;
  }
  if (datos.activo !== undefined) patch.activo = !!datos.activo;
  if (datos.niveles !== undefined) {
    // Se valida contra el catálogo para que un valor mal escrito no deje a
    // alguien sin ver nada (la base tiene el mismo CHECK, esto es el aviso
    // temprano con un mensaje entendible).
    const invalidos = datos.niveles.filter((n) => !NIVELES.includes(n as Nivel));
    if (invalidos.length > 0) throw new Error(`Nivel inválido: ${invalidos.join(", ")}`);
    patch.niveles = datos.niveles;
  }

  if (Object.keys(patch).length > 0) {
    await supaUpdate("usuarios_sistema", eqP("id", objetivoId), patch);
  }
}
