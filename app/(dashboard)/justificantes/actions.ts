"use server";

import { revalidatePath } from "next/cache";
import { requerirSesion } from "@/lib/auth";
import { buscarAlumnos, type AlumnoBusqueda } from "@/lib/alumnos";
import {
  listarJustificantes,
  listarJustificantesRecientes,
  crearJustificante,
  eliminarJustificante,
  type Justificante,
  type JustificanteConAlumno,
  type TipoJustificante,
} from "@/lib/justificantes";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export async function buscarAlumnosAction(termino: string): Promise<Resultado<AlumnoBusqueda[]>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  const resultados = await buscarAlumnos(termino, sesion.niveles);
  return { ok: true, data: resultados };
}

export async function listarJustificantesAction(alumnoId: string): Promise<Resultado<Justificante[]>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  if (!alumnoId) return { ok: false, error: "Falta alumnoId" };
  const justificantes = await listarJustificantes(alumnoId);
  return { ok: true, data: justificantes };
}

// Vista principal de la seccion: los justificantes mas recientes de todo el
// plantel, sin tener que buscar alumno por alumno.
export async function listarJustificantesRecientesAction(): Promise<Resultado<JustificanteConAlumno[]>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  return { ok: true, data: await listarJustificantesRecientes(60, sesion.niveles) };
}

export async function crearJustificanteAction(datos: {
  alumnoId: string;
  fechaInicio: string;
  fechaFin: string;
  tipo: TipoJustificante;
  motivo: string;
}): Promise<Resultado<{ id: string }>> {
  const sesion = await requerirSesion(["Administrador", "Staff"]);
  if (!sesion) return { ok: false, error: "No autorizado" };

  try {
    const id = await crearJustificante({
      alumnoId: datos.alumnoId,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin,
      tipo: datos.tipo,
      motivo: datos.motivo.trim(),
      autorizadoPor: sesion.nombre,
    });
    revalidatePath("/justificantes");
    return { ok: true, data: { id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar el justificante" };
  }
}

export async function eliminarJustificanteAction(justificanteId: string): Promise<Resultado<null>> {
  const sesion = await requerirSesion(["Administrador"]);
  if (!sesion) return { ok: false, error: "No autorizado" };
  if (!justificanteId) return { ok: false, error: "Falta justificanteId" };

  await eliminarJustificante(justificanteId);
  revalidatePath("/justificantes");
  return { ok: true, data: null };
}
