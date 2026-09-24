"use server";

import { obtenerSesion } from "@/lib/auth";
import {
  listarDiasEspeciales,
  guardarDiaEspecial,
  quitarDiaEspecial,
  type DiaEspecial,
} from "@/lib/diasEspeciales";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

async function soloAdministrador(): Promise<string | null> {
  const sesion = await obtenerSesion();
  if (!sesion) return "Sesión no válida";
  if (sesion.rol !== "Administrador") return "Solo un administrador puede cambiar el calendario";
  return null;
}

export async function listarDiasEspecialesAction(): Promise<Resultado<DiaEspecial[]>> {
  const error = await soloAdministrador();
  if (error) return { ok: false, error };
  try {
    return { ok: true, data: await listarDiasEspeciales() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudieron leer los días" };
  }
}

export async function guardarDiaEspecialAction(datos: {
  fecha: string;
  tipoDia: string;
  horaEntrada: string;
  minutosTolerancia: number;
}): Promise<Resultado<DiaEspecial[]>> {
  const error = await soloAdministrador();
  if (error) return { ok: false, error };
  try {
    await guardarDiaEspecial(datos);
    return { ok: true, data: await listarDiasEspeciales() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar" };
  }
}

export async function quitarDiaEspecialAction(id: string): Promise<Resultado<DiaEspecial[]>> {
  const error = await soloAdministrador();
  if (error) return { ok: false, error };
  try {
    await quitarDiaEspecial(id);
    return { ok: true, data: await listarDiasEspeciales() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo quitar" };
  }
}
