"use server";

import { revalidatePath } from "next/cache";
import { requerirSesion } from "@/lib/auth";
import { listarGrupos, type Grupo } from "@/lib/grupos";
import {
  listarAlumnosPorGrupo,
  obtenerFichaAlumno,
  actualizarAlumno,
  eliminarAlumno,
  buscarAlumnos,
  type AlumnoRoster,
  type FichaAlumno,
  type DatosEdicionAlumno,
  type AlumnoBusqueda,
} from "@/lib/alumnos";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export async function listarGruposAction(): Promise<Resultado<Grupo[]>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  return { ok: true, data: await listarGrupos() };
}

export async function listarAlumnosPorGrupoAction(grupoId: string): Promise<Resultado<AlumnoRoster[]>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  if (!grupoId) return { ok: false, error: "Falta grupoId" };
  return { ok: true, data: await listarAlumnosPorGrupo(grupoId) };
}

export async function buscarAlumnosAction(termino: string): Promise<Resultado<AlumnoBusqueda[]>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  return { ok: true, data: await buscarAlumnos(termino) };
}

export async function obtenerFichaAlumnoAction(alumnoId: string): Promise<Resultado<FichaAlumno>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  if (!alumnoId) return { ok: false, error: "Falta alumnoId" };
  const ficha = await obtenerFichaAlumno(alumnoId);
  if (!ficha) return { ok: false, error: "Alumno no encontrado" };
  return { ok: true, data: ficha };
}

export async function actualizarAlumnoAction(
  alumnoId: string,
  datos: DatosEdicionAlumno
): Promise<Resultado<null>> {
  const sesion = await requerirSesion(["Administrador"]);
  if (!sesion) return { ok: false, error: "No autorizado" };
  if (!alumnoId) return { ok: false, error: "Falta alumnoId" };
  try {
    await actualizarAlumno(alumnoId, datos);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al actualizar" };
  }
  revalidatePath("/grupos-alumnos");
  return { ok: true, data: null };
}

export async function eliminarAlumnoAction(alumnoId: string): Promise<Resultado<null>> {
  const sesion = await requerirSesion(["Administrador"]);
  if (!sesion) return { ok: false, error: "No autorizado" };
  if (!alumnoId) return { ok: false, error: "Falta alumnoId" };
  try {
    await eliminarAlumno(alumnoId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al eliminar" };
  }
  revalidatePath("/grupos-alumnos");
  return { ok: true, data: null };
}
