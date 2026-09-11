import { obtenerReporteDiario } from "@/lib/reportes";
import { obtenerSesion } from "@/lib/auth";
import AsistenciaClient from "./AsistenciaClient";

export default async function AsistenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const params = await searchParams;
  // La sesión va primero porque el reporte se acota a los niveles que ese
  // usuario tiene permitido ver.
  const sesion = await obtenerSesion();
  const reporte = await obtenerReporteDiario(params.fecha, sesion?.niveles);
  const puedeEditar = sesion?.rol === "Administrador";

  return <AsistenciaClient reporte={reporte} puedeEditar={puedeEditar} />;
}
