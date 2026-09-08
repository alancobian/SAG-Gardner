"use server";

import { revalidatePath } from "next/cache";
import { requerirSesion } from "@/lib/auth";
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  type Usuario,
  type DatosNuevoUsuario,
  type DatosEdicionUsuario,
} from "@/lib/usuarios";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export async function listarUsuariosAction(): Promise<Resultado<Usuario[]>> {
  const sesion = await requerirSesion(["Administrador"]);
  if (!sesion) return { ok: false, error: "No autorizado" };
  return { ok: true, data: await listarUsuarios() };
}

export async function crearUsuarioAction(datos: DatosNuevoUsuario): Promise<Resultado<{ id: string }>> {
  const sesion = await requerirSesion(["Administrador"]);
  if (!sesion) return { ok: false, error: "No autorizado" };
  try {
    const resultado = await crearUsuario(datos);
    revalidatePath("/ajustes/usuarios");
    return { ok: true, data: resultado };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear usuario" };
  }
}

export async function actualizarUsuarioAction(
  objetivoId: string,
  datos: DatosEdicionUsuario
): Promise<Resultado<null>> {
  const sesion = await requerirSesion(["Administrador"]);
  if (!sesion) return { ok: false, error: "No autorizado" };
  if (!objetivoId) return { ok: false, error: "Falta objetivoId" };
  try {
    await actualizarUsuario(objetivoId, datos);
    revalidatePath("/ajustes/usuarios");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al actualizar usuario" };
  }
}
