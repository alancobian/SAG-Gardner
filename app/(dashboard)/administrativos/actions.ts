"use server";

import { revalidatePath } from "next/cache";
import { obtenerSesion, requerirSesion } from "@/lib/auth";
import {
  listarAdministrativos,
  obtenerFichaAdministrativo,
  crearAdministrativo,
  actualizarAdministrativo,
  eliminarAdministrativo,
  type Administrativo,
  type FichaAdministrativo,
  type DatosAltaAdministrativo,
} from "@/lib/administrativos";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export async function listarAdministrativosAction(): Promise<Resultado<Administrativo[]>> {
  if (!(await obtenerSesion())) return { ok: false, error: "Sesión no válida" };
  try {
    return { ok: true, data: await listarAdministrativos() };
  } catch (e) {
    return { ok: false, error: mensaje(e, "No se pudo cargar el personal") };
  }
}

export async function obtenerFichaAdministrativoAction(
  id: string
): Promise<Resultado<FichaAdministrativo | null>> {
  if (!(await obtenerSesion())) return { ok: false, error: "Sesión no válida" };
  try {
    return { ok: true, data: await obtenerFichaAdministrativo(id) };
  } catch (e) {
    return { ok: false, error: mensaje(e, "No se pudo abrir la ficha") };
  }
}

// El alta, la edición y el borrado son de administradores: dar de alta a
// alguien equivale a emitirle una credencial de acceso al plantel.
export async function crearAdministrativoAction(
  datos: DatosAltaAdministrativo
): Promise<Resultado<{ id: string; codigoQr: string }>> {
  if (!(await requerirSesion(["Administrador"]))) return { ok: false, error: "No autorizado" };
  try {
    const creado = await crearAdministrativo(datos);
    revalidatePath("/administrativos");
    return { ok: true, data: creado };
  } catch (e) {
    return { ok: false, error: mensaje(e, "No se pudo dar de alta") };
  }
}

export async function actualizarAdministrativoAction(
  id: string,
  datos: Partial<DatosAltaAdministrativo> & { estatus?: string }
): Promise<Resultado<null>> {
  if (!(await requerirSesion(["Administrador"]))) return { ok: false, error: "No autorizado" };
  try {
    await actualizarAdministrativo(id, datos);
    revalidatePath("/administrativos");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: mensaje(e, "No se pudo guardar") };
  }
}

export async function eliminarAdministrativoAction(id: string): Promise<Resultado<null>> {
  if (!(await requerirSesion(["Administrador"]))) return { ok: false, error: "No autorizado" };
  try {
    await eliminarAdministrativo(id);
    revalidatePath("/administrativos");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: mensaje(e, "No se pudo eliminar") };
  }
}

function mensaje(e: unknown, porDefecto: string) {
  return e instanceof Error ? e.message : porDefecto;
}
