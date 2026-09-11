"use server";

import { revalidatePath } from "next/cache";
import { requerirSesion } from "@/lib/auth";
import {
  listarDocentes,
  obtenerFichaDocente,
  actualizarDocente,
  eliminarDocente,
  type Docente,
  type FichaDocente,
  type DatosEdicionDocente,
} from "@/lib/docentes";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export async function listarDocentesAction(): Promise<Resultado<Docente[]>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  return { ok: true, data: await listarDocentes(sesion.niveles) };
}

export async function obtenerFichaDocenteAction(docenteId: string): Promise<Resultado<FichaDocente>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  if (!docenteId) return { ok: false, error: "Falta docenteId" };
  const ficha = await obtenerFichaDocente(docenteId, sesion.niveles);
  if (!ficha) return { ok: false, error: "Docente no encontrado" };
  return { ok: true, data: ficha };
}

export async function actualizarDocenteAction(
  docenteId: string,
  datos: DatosEdicionDocente
): Promise<Resultado<null>> {
  const sesion = await requerirSesion(["Administrador"]);
  if (!sesion) return { ok: false, error: "No autorizado" };
  if (!docenteId) return { ok: false, error: "Falta docenteId" };
  try {
    await actualizarDocente(docenteId, datos);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al actualizar" };
  }
  revalidatePath("/docentes");
  return { ok: true, data: null };
}

export async function eliminarDocenteAction(docenteId: string): Promise<Resultado<null>> {
  const sesion = await requerirSesion(["Administrador"]);
  if (!sesion) return { ok: false, error: "No autorizado" };
  if (!docenteId) return { ok: false, error: "Falta docenteId" };
  try {
    await eliminarDocente(docenteId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al eliminar" };
  }
  revalidatePath("/docentes");
  return { ok: true, data: null };
}
