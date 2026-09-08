"use server";

import { requerirSesion } from "@/lib/auth";
import { importarDocentes, type FilaImportacionDocente, type ResultadoImportacion } from "@/lib/importar";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export async function importarDocentesAction(
  filas: FilaImportacionDocente[]
): Promise<Resultado<ResultadoImportacion[]>> {
  const sesion = await requerirSesion(["Administrador"]);
  if (!sesion) return { ok: false, error: "No autorizado" };
  if (!Array.isArray(filas) || filas.length === 0) return { ok: false, error: "No hay filas para importar" };
  if (filas.length > 500) return { ok: false, error: "Máximo 500 filas por archivo" };
  return { ok: true, data: await importarDocentes(filas) };
}
