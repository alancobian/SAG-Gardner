import { obtenerReporteDiario } from "@/lib/reportes";
import { obtenerSesion } from "@/lib/auth";
import AsistenciaClient from "./AsistenciaClient";

export default async function AsistenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const params = await searchParams;
  const [reporte, sesion] = await Promise.all([obtenerReporteDiario(params.fecha), obtenerSesion()]);
  const puedeEditar = sesion?.rol === "Administrador";

  return <AsistenciaClient reporte={reporte} puedeEditar={puedeEditar} />;
}
