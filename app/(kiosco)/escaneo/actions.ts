"use server";

import { requerirSesion } from "@/lib/auth";
import { buscarAlumnos, type AlumnoBusqueda } from "@/lib/alumnos";
import {
  registrarEscaneo,
  registrarEscaneoManual,
  obtenerHistorialReciente,
  type RespuestaEscaneo,
  type ItemHistorial,
} from "@/lib/escaneo";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export async function registrarEscaneoAction(codigoQr: string): Promise<Resultado<RespuestaEscaneo>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  const codigo = codigoQr.trim();
  if (!codigo) return { ok: false, error: "Falta codigoQr" };
  const respuesta = await registrarEscaneo(codigo, sesion.id);
  return { ok: true, data: respuesta };
}

export async function registrarEscaneoManualAction(alumnoId: string): Promise<Resultado<RespuestaEscaneo>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  if (!alumnoId) return { ok: false, error: "Falta alumnoId" };
  const respuesta = await registrarEscaneoManual(alumnoId, sesion.id);
  return { ok: true, data: respuesta };
}

export async function buscarAlumnosParaEscaneoAction(termino: string): Promise<Resultado<AlumnoBusqueda[]>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  return { ok: true, data: await buscarAlumnos(termino) };
}

export async function obtenerHistorialRecienteAction(): Promise<Resultado<ItemHistorial[]>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  return { ok: true, data: await obtenerHistorialReciente(10) };
}
