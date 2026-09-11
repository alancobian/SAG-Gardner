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

  // Pantalla inmersiva: el kiosco vive en una tablet fija en la entrada, no en
  // un escritorio, asi que va a pantalla completa sobre el azul institucional
  // (diseño "Kiosco de Acceso - SAG Gardner" de Stitch) en vez del shell claro
  // del panel administrativo.
  return (
    <div
      className="flex min-h-screen w-full flex-col text-white"
      style={{
        background:
          "radial-gradient(circle at 50% 30%, var(--color-gardner-azul) 0%, var(--color-gardner-azul-oscuro) 70%)",
      }}
    >
      <header className="flex items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <Image
            src="/img/monograma-sag.png"
            alt="SAG"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/20"
          />
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <span className="text-sm font-semibold text-white/90">Sesión: {sesion.nombre}</span>
            <span className="hidden text-white/30 sm:inline">·</span>
            <CerrarSesionBoton />
          </div>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">{sesion.rol}</span>
      </header>
      <main className="flex flex-1 flex-col px-4 pb-6 sm:px-6">{children}</main>
    </div>
  );
}
