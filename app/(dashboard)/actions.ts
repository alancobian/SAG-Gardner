"use server";

import { requerirSesion } from "@/lib/auth";
import { buscarEnTodoElSistema, type ResultadoBusqueda } from "@/lib/busqueda";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export async function buscarGlobalAction(termino: string): Promise<Resultado<ResultadoBusqueda[]>> {
  const sesion = await requerirSesion();
  if (!sesion) return { ok: false, error: "Sesión inválida" };
  return { ok: true, data: await buscarEnTodoElSistema(termino) };
}
