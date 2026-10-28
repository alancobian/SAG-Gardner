"use server";

import { revalidatePath } from "next/cache";
import { obtenerSesion } from "@/lib/auth";
import { corregirEstatusEntrada, type EstatusCorregible } from "@/lib/correccionEstatus";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export async function corregirEstatusAction(
  alumnoId: string,
  fecha: string,
  nuevoEstatus: EstatusCorregible
): Promise<Resultado<{ estatus: EstatusCorregible }>> {
  const sesion = await obtenerSesion();
  if (!sesion) return { ok: false, error: "Sesión no válida" };
  // Misma regla que el resto de la edición en esta pantalla (ver page.tsx).
  if (sesion.rol !== "Administrador") {
    return { ok: false, error: "Solo un administrador puede corregir el estatus" };
  }

  try {
    const data = await corregirEstatusEntrada(alumnoId, fecha, nuevoEstatus, sesion.id);
    revalidatePath("/asistencia");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo corregir" };
  }
}
