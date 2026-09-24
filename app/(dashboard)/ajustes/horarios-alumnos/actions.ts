"use server";

import { obtenerSesion } from "@/lib/auth";
import { listarHorariosPorNivel, guardarHorarioNivel, type HorarioNivel } from "@/lib/horariosNivel";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

async function soloAdministrador(): Promise<string | null> {
  const sesion = await obtenerSesion();
  if (!sesion) return "Sesión no válida";
  if (sesion.rol !== "Administrador") return "Solo un administrador puede cambiar los horarios";
  return null;
}

export async function listarHorariosNivelAction(): Promise<Resultado<HorarioNivel[]>> {
  const error = await soloAdministrador();
  if (error) return { ok: false, error };
  try {
    return { ok: true, data: await listarHorariosPorNivel() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudieron leer los horarios" };
  }
}

export async function guardarHorarioNivelAction(
  nivel: string,
  horaEntrada: string,
  minutosTolerancia: number
): Promise<Resultado<{ grupos: number }>> {
  const error = await soloAdministrador();
  if (error) return { ok: false, error };
  try {
    const grupos = await guardarHorarioNivel(nivel, horaEntrada, minutosTolerancia);
    return { ok: true, data: { grupos } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar" };
  }
}
