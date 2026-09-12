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
  { id: "reportes", label: "Reportes", href: "/reportes", icono: "monitoring" },
  { id: "ajustes", label: "Ajustes", href: "/ajustes", icono: "settings" },
];

export default function Sidebar({ pendientesJustificantes = 0 }: { pendientesJustificantes?: number }) {
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
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-[220px] shrink-0 flex-col justify-between bg-gardner-azul-oscuro py-6 shadow-xl transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
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
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white/15"
              />
              <div>
                <h1 className="text-xl font-bold leading-tight text-white">SAG</h1>
                <p className="text-xs font-medium text-white/60">Instituto Gardner</p>
              </div>
            </div>
            <button
              onClick={cerrar}
              className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white md:hidden"
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
                  className={`flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm transition-colors ${
                    activo
                      ? "border-white bg-gardner-azul font-semibold text-white shadow-sm"
                      : "border-transparent font-medium text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={activo ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icono}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {/* Faltas de hoy que nadie ha justificado todavia. */}
                  {item.id === "justificantes" && pendientesJustificantes > 0 && (
                    <span
                      className="rounded-full bg-white/20 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white"
                      title={`${pendientesJustificantes} faltas de hoy sin justificante`}
                    >
                      {pendientesJustificantes}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex flex-col gap-3 px-3">
          <div className="flex items-center gap-2 px-3 text-[11px] font-medium text-white/45">
            <span className="h-1.5 w-1.5 rounded-full bg-estado-puntual" />
            Servicio en línea
          </div>
          <button
            onClick={cerrarSesion}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/55 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
