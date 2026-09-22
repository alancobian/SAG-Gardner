"use server";

import { revalidatePath } from "next/cache";
import { requerirSesion } from "@/lib/auth";
import {
  obtenerHorarioAdministrativo,
  guardarHorarioAdministrativo,
  type HorarioAdministrativo,
} from "@/lib/horarios";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

async function requerirAdmin() {
  return requerirSesion(["Administrador"]);
}

export async function obtenerHorarioAdministrativoAction(): Promise<
  Resultado<HorarioAdministrativo | null>
> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  return { ok: true, data: await obtenerHorarioAdministrativo() };
}

export async function guardarHorarioAdministrativoAction(
  horaEntrada: string,
  horaSalida: string,
  minutosTolerancia: number
): Promise<Resultado<null>> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  if (!horaEntrada) return { ok: false, error: "Falta la hora de entrada" };
  if (horaSalida && horaSalida <= horaEntrada) {
    return { ok: false, error: "La hora de salida tiene que ser posterior a la de entrada" };
  }
  if (minutosTolerancia < 0 || minutosTolerancia > 120) {
    return { ok: false, error: "La tolerancia debe estar entre 0 y 120 minutos" };
  }
  try {
    await guardarHorarioAdministrativo(horaEntrada, horaSalida || null, minutosTolerancia);
    revalidatePath("/ajustes");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al guardar" };
  }
}
