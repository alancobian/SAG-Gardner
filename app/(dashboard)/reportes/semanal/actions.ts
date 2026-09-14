"use server";

import { obtenerSesion } from "@/lib/auth";
import { obtenerReporteSemanal, type ReporteSemanalGrupo } from "@/lib/reporteSemanal";
import { correoReporteSemanal, asuntoReporteSemanal } from "@/lib/correoReporteSemanal";
import { puedeVerNivel } from "@/lib/niveles";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export type VistaPreviaSemanal = {
  reporte: ReporteSemanalGrupo;
  asunto: string;
  html: string;
};

export async function obtenerVistaPreviaSemanalAction(
  semana?: string
): Promise<Resultado<VistaPreviaSemanal[]>> {
  const sesion = await obtenerSesion();
  if (!sesion) return { ok: false, error: "Sesión no válida" };

  if (semana && !/^\d{4}-\d{2}-\d{2}$/.test(semana)) {
    return { ok: false, error: "Semana no válida" };
  }

  try {
    const reportes = await obtenerReporteSemanal(semana);
    // El alcance por nivel se aplica aquí, igual que en el resto del panel: un
    // director de Primaria no debe ver los correos de Prepa.
    const visibles = reportes.filter((r) => puedeVerNivel(sesion.niveles, r.nivelAcademico));
    return {
      ok: true,
      data: visibles.map((reporte) => ({
        reporte,
        asunto: asuntoReporteSemanal(reporte),
        html: correoReporteSemanal(reporte),
      })),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo generar la vista previa" };
  }
}
