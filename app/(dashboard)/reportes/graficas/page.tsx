import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { fechaHoyMx } from "@/lib/reportes";
import GraficasClient from "./GraficasClient";

export default async function GraficasPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  // Por defecto, el mes en curso: es el corte con el que se arma el reporte a
  // Dirección.
  const hoy = fechaHoyMx();
  const inicioMes = `${hoy.slice(0, 7)}-01`;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/reportes"
        className="flex w-fit items-center gap-1 text-xs font-semibold text-gardner-azul-oscuro transition hover:underline"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Volver a Reportes
      </Link>

      <GraficasClient desdeInicial={inicioMes} hastaInicial={hoy} />
    </div>
  );
}
