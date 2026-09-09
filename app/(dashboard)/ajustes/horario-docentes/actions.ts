"use server";

import { revalidatePath } from "next/cache";
import { requerirSesion } from "@/lib/auth";
import {
  obtenerHorarioInstitucionalDocentes,
  guardarHorarioInstitucionalDocentes,
  type HorarioInstitucionalDocentes,
} from "@/lib/horarios";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

async function requerirAdmin() {
  return requerirSesion(["Administrador"]);
}

export async function obtenerHorarioInstitucionalDocentesAction(): Promise<
  Resultado<HorarioInstitucionalDocentes | null>
> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  return { ok: true, data: await obtenerHorarioInstitucionalDocentes() };
}

export async function guardarHorarioInstitucionalDocentesAction(
  horaEntrada: string,
  minutosTolerancia: number
): Promise<Resultado<null>> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  if (!horaEntrada) return { ok: false, error: "Falta la hora de entrada" };
  try {
    await guardarHorarioInstitucionalDocentes(horaEntrada, minutosTolerancia);
    revalidatePath("/ajustes/horario-docentes");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al guardar" };
  }
}
