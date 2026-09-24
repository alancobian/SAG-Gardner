"use server";

import { obtenerSesion } from "@/lib/auth";
import { listarGrupos } from "@/lib/grupos";
import { obtenerBalanceGrupo, type BalanceGrupo } from "@/lib/balanceGrupo";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export async function obtenerBalanceGrupoAction(
  grupoId: string,
  desde: string,
  hasta: string
): Promise<Resultado<BalanceGrupo>> {
  const sesion = await obtenerSesion();
  if (!sesion) return { ok: false, error: "Sesión no válida" };

  const formato = /^\d{4}-\d{2}-\d{2}$/;
  if (!formato.test(desde) || !formato.test(hasta)) {
    return { ok: false, error: "Fechas no válidas" };
  }
  if (desde > hasta) {
    return { ok: false, error: "La fecha inicial no puede ser posterior a la final" };
  }

  // El grupo debe estar dentro del alcance del usuario; no basta con que exista.
  const permitidos = await listarGrupos(sesion.niveles);
  if (!permitidos.some((g) => g.id === grupoId)) {
    return { ok: false, error: "Ese grupo no está en tu alcance" };
  }

  try {
    return { ok: true, data: await obtenerBalanceGrupo(grupoId, desde, hasta) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo generar el balance" };
  }
}
