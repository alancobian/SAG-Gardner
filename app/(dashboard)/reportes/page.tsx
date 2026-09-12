import { obtenerSesion } from "@/lib/auth";
import { describirAlcance } from "@/lib/niveles";
import { fechaHoyMx } from "@/lib/reportes";
import ReportesClient from "./ReportesClient";

export default async function ReportesPage() {
  const sesion = await obtenerSesion();

  // Rango por defecto: lo que va del mes en curso. Es el corte con el que
  // Dirección piensa ("¿cómo vamos este mes?") y evita que la pantalla abra
  // pidiendo que alguien escoja fechas antes de ver nada.
  const hoy = fechaHoyMx();
  const inicioMes = `${hoy.slice(0, 7)}-01`;

  return (
    <ReportesClient
      desdeInicial={inicioMes}
      hastaInicial={hoy}
      alcance={describirAlcance(sesion?.niveles)}
    />
  );
}
