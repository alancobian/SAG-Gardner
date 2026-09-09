// Shell independiente para los puntos de acceso físicos (tablets/kioscos en
// la entrada). A diferencia de (dashboard), no incluye el Sidebar ni el
// resto de la navegación administrativa -- solo lo necesario para operar la
// pantalla de escaneo en pantalla completa. Se sirve en
// sag.institutogardner.edu.mx/escaneo; el aislamiento para el personal de
// los puntos de acceso se logra con el rol "Portería" (ver middleware.ts),
// que solo puede llegar a esta ruta sin importar qué otra URL intente abrir.

import Image from "next/image";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import CerrarSesionBoton from "./CerrarSesionBoton";

export default async function KioscoLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  return (
    <div className="flex min-h-screen w-full flex-col bg-gardner-neutro">
      <header className="flex items-center justify-between border-b border-black/5 bg-white px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Image
            src="/img/monograma-sag.png"
            alt="SAG"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
          <div className="leading-tight">
            <p className="text-sm font-bold text-gardner-azul-oscuro">SAG · Acceso</p>
            <p className="text-[11px] font-medium text-gardner-gris/60">Instituto Gardner</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-xs font-semibold text-gardner-gris">{sesion.nombre}</p>
            <p className="text-[11px] text-gardner-gris/60">{sesion.rol}</p>
          </div>
          <CerrarSesionBoton />
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
