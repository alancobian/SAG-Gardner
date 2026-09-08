"use server";

import { revalidatePath } from "next/cache";
import { requerirSesion } from "@/lib/auth";
import { buscarAlumnos, type AlumnoBusqueda } from "@/lib/alumnos";
import { listarJustificantes, crearJustificante, eliminarJustificante, type Justificante } from "@/lib/justificantes";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export async function buscarAlumnosAction(termino: string): Promise<Resultado<AlumnoBusqueda[]>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  const resultados = await buscarAlumnos(termino);
  return { ok: true, data: resultados };
}

export async function listarJustificantesAction(alumnoId: string): Promise<Resultado<Justificante[]>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  if (!alumnoId) return { ok: false, error: "Falta alumnoId" };
  const justificantes = await listarJustificantes(alumnoId);
  return { ok: true, data: justificantes };
}

export async function crearJustificanteAction(
  alumnoId: string,
  fecha: string,
  motivo: string
): Promise<Resultado<{ id: string }>> {
  const sesion = await requerirSesion(["Administrador", "Staff"]);
  if (!sesion) return { ok: false, error: "No autorizado" };
  if (!alumnoId || !fecha) return { ok: false, error: "Falta alumnoId o fecha" };

  const id = await crearJustificante(alumnoId, fecha, motivo.trim(), sesion.nombre);
  revalidatePath("/justificantes");
  return { ok: true, data: { id } };
}

export async function eliminarJustificanteAction(justificanteId: string): Promise<Resultado<null>> {
  const sesion = await requerirSesion(["Administrador"]);
  if (!sesion) return { ok: false, error: "No autorizado" };
  if (!justificanteId) return { ok: false, error: "Falta justificanteId" };

  await eliminarJustificante(justificanteId);
  revalidatePath("/justificantes");
  return { ok: true, data: null };
}
