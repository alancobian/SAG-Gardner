"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "./SidebarContext";

type Item = { id: string; label: string; href: string; icono: string };

const ITEMS: Item[] = [
  { id: "escaneo", label: "Escaneo", href: "/escaneo", icono: "qr_code_scanner" },
  { id: "asistencia", label: "Asistencia", href: "/asistencia", icono: "calendar_today" },
  { id: "grupos-alumnos", label: "Grupos y Alumnos", href: "/grupos-alumnos", icono: "groups" },
  { id: "docentes", label: "Docentes", href: "/docentes", icono: "badge" },
  { id: "justificantes", label: "Justificantes", href: "/justificantes", icono: "assignment_turned_in" },
  { id: "ajustes", label: "Ajustes", href: "/ajustes", icono: "settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { abierto, cerrar } = useSidebar();

  async function cerrarSesion() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Fondo oscuro detrás del cajón en móvil -- clic afuera lo cierra. En
          escritorio (md+) nunca se renderiza visualmente porque el sidebar ya
          no es un cajón ahi (ver clases del <aside> abajo). */}
      {abierto && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={cerrar} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-[220px] shrink-0 flex-col justify-between border-r border-black/5 bg-white py-6 transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-2">
          <div className="mb-4 flex items-center justify-between gap-3 px-6">
            <div className="flex items-center gap-3">
              <Image
                src="/img/monograma-sag.png"
                alt="SAG"
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <div>
                <h1 className="text-xl font-bold leading-tight text-gardner-azul-oscuro">SAG</h1>
                <p className="text-xs font-medium text-gardner-gris/70">Administración</p>
              </div>
            </div>
            <button
              onClick={cerrar}
              className="rounded-full p-1 text-gardner-gris/60 hover:bg-gardner-gris/10 hover:text-gardner-gris md:hidden"
              aria-label="Cerrar menú"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-3">
            {ITEMS.map((item) => {
              const activo = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={cerrar}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    activo
                      ? "border-l-4 border-gardner-azul-oscuro bg-gardner-azul pl-2 font-semibold text-white shadow-sm"
                      : "border-l-4 border-transparent font-medium text-gardner-gris hover:bg-gardner-azul/10 hover:text-gardner-azul-oscuro"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={activo ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icono}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="px-3">
          <button
            onClick={cerrarSesion}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-gardner-gris/80 transition-colors hover:bg-gardner-gris/10 hover:text-gardner-gris"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
