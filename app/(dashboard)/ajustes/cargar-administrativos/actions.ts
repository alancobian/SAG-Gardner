"use server";

import { requerirSesion } from "@/lib/auth";
import {
  importarAdministrativos,
  type FilaImportacionAdministrativo,
  type ResultadoImportacion,
} from "@/lib/importar";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export async function importarAdministrativosAction(
  filas: FilaImportacionAdministrativo[]
): Promise<Resultado<ResultadoImportacion[]>> {
  // Dar de alta personal equivale a emitir credenciales de acceso al plantel:
  // solo administradores.
  const sesion = await requerirSesion(["Administrador"]);
  if (!sesion) return { ok: false, error: "No autorizado" };
  if (!Array.isArray(filas) || filas.length === 0) return { ok: false, error: "No hay filas para importar" };
  if (filas.length > 200) return { ok: false, error: "Máximo 200 filas por archivo" };
  return { ok: true, data: await importarAdministrativos(filas) };
}
