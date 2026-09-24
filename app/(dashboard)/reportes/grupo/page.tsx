import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { listarGrupos } from "@/lib/grupos";
import { fechaHoyMx } from "@/lib/reportes";
import BalanceClient from "./BalanceClient";

export default async function BalanceGrupoPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  const [grupos] = await Promise.all([listarGrupos(sesion.niveles)]);
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

      <BalanceClient grupos={grupos} desdeInicial={inicioMes} hastaInicial={hoy} />
    </div>
  );
}
