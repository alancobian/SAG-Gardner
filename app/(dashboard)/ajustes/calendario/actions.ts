"use server";

import { revalidatePath } from "next/cache";
import { requerirSesion } from "@/lib/auth";
import {
  obtenerCicloEscolar,
  guardarCicloEscolar,
  listarFechasNoLaborales,
  guardarFechaNoLaboral,
  eliminarFechaNoLaboral,
  listarPeriodosVacacionales,
  guardarPeriodoVacacional,
  cerrarCicloEscolar,
  listarCiclosArchivados,
  type CicloEscolar,
  type CicloArchivado,
  type FechaNoLaboral,
  type PeriodoVacacional,
} from "@/lib/calendario";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

async function requerirAdmin() {
  return requerirSesion(["Administrador"]);
}

export async function obtenerCicloEscolarAction(): Promise<Resultado<CicloEscolar | null>> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  return { ok: true, data: await obtenerCicloEscolar() };
}

export async function guardarCicloEscolarAction(datos: {
  anioEscolar: string;
  fechaInicio: string;
  fechaCierre: string;
}): Promise<Resultado<null>> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  try {
    await guardarCicloEscolar(datos);
    revalidatePath("/ajustes/calendario");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al guardar" };
  }
}

// Cierra el ciclo activo y abre el siguiente. No borra informacion: el ciclo
// anterior queda archivado y consultable desde Ajustes → Archivo.
export async function cerrarCicloEscolarAction(nuevo: {
  anioEscolar: string;
  fechaInicio: string;
  fechaCierre: string;
}): Promise<Resultado<null>> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  try {
    await cerrarCicloEscolar(nuevo);
    revalidatePath("/ajustes");
    revalidatePath("/asistencia");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al cerrar el ciclo" };
  }
}

export async function listarCiclosArchivadosAction(): Promise<Resultado<CicloArchivado[]>> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  return { ok: true, data: await listarCiclosArchivados() };
}

export async function listarFechasNoLaboralesAction(): Promise<Resultado<FechaNoLaboral[]>> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  return { ok: true, data: await listarFechasNoLaborales() };
}

export async function guardarFechaNoLaboralAction(datos: {
  fecha: string;
  tipoDia: string;
  aplicaA: string;
}): Promise<Resultado<null>> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  try {
    await guardarFechaNoLaboral(datos);
    revalidatePath("/ajustes/calendario");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al guardar" };
  }
}

export async function eliminarFechaNoLaboralAction(id: string): Promise<Resultado<null>> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  try {
    await eliminarFechaNoLaboral(id);
    revalidatePath("/ajustes/calendario");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al eliminar" };
  }
}

export async function listarPeriodosVacacionalesAction(): Promise<Resultado<PeriodoVacacional[]>> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  return { ok: true, data: await listarPeriodosVacacionales() };
}

export async function guardarPeriodoVacacionalAction(datos: {
  tipoDia: string;
  aplicaA: string;
  fechaInicio: string;
  fechaFin: string;
}): Promise<Resultado<{ diasGuardados: number }>> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  try {
    const resultado = await guardarPeriodoVacacional(datos);
    revalidatePath("/ajustes/calendario");
    return { ok: true, data: resultado };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al guardar" };
  }
}
