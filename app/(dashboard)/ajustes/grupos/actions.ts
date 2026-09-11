"use server";

// Acciones de Ajustes → Grupos. TODAS exigen rol Administrador aquí, en el
// servidor, aunque la pantalla de Ajustes ya sea de administradores: la
// comprobación del cliente es comodidad, esta es la que de verdad protege.

import { revalidatePath } from "next/cache";
import { requerirSesion } from "@/lib/auth";
import { listarGruposAdmin, asignarDocenteTitular, eliminarGrupo, type GrupoAdmin } from "@/lib/grupos";
import { listarDocentes, type Docente } from "@/lib/docentes";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

async function requerirAdmin() {
  return requerirSesion(["Administrador"]);
}

export async function listarGruposAdminAction(): Promise<Resultado<GrupoAdmin[]>> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  return { ok: true, data: await listarGruposAdmin() };
}

export async function listarDocentesParaTitularAction(): Promise<Resultado<Docente[]>> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  const docentes = await listarDocentes();
  return { ok: true, data: docentes.filter((d) => d.estatus === "Activo") };
}

export async function asignarDocenteTitularAction(
  grupoId: string,
  docenteId: string | null
): Promise<Resultado<null>> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  try {
    await asignarDocenteTitular(grupoId, docenteId);
    // El dashboard muestra el tutor en cada tarjeta de grupo.
    revalidatePath("/asistencia");
    revalidatePath("/ajustes");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo asignar el tutor" };
  }
}

export async function eliminarGrupoAction(grupoId: string): Promise<Resultado<null>> {
  if (!(await requerirAdmin())) return { ok: false, error: "No autorizado" };
  try {
    await eliminarGrupo(grupoId);
    revalidatePath("/asistencia");
    revalidatePath("/grupos-alumnos");
    revalidatePath("/ajustes");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo borrar el grupo" };
  }
}
