import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { fechaHoyMx } from "@/lib/reportes";
import SemanalClient from "./SemanalClient";

export default async function ReporteSemanalPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/reportes"
        className="flex w-fit items-center gap-1 text-xs font-semibold text-gardner-azul-oscuro transition hover:underline"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Volver a Reportes
      </Link>

      <SemanalClient semanaInicial={fechaHoyMx()} />
    </div>
  );
}
