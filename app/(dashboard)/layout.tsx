import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { obtenerCicloEscolar } from "@/lib/calendario";
import { contarAusenciasSinJustificar } from "@/lib/reportes";
import Sidebar from "./Sidebar";
import MenuButton from "./MenuButton";
import BuscadorGlobal from "./BuscadorGlobal";
import { SidebarProvider } from "./SidebarContext";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  // Contexto que el diseño pone en el shell: el ciclo escolar activo en la
  // barra superior y el pendiente de justificantes sobre su item del menu.
  const [ciclo, pendientesJustificantes] = await Promise.all([
    obtenerCicloEscolar(),
    contarAusenciasSinJustificar(),
  ]);

  return (
    <SidebarProvider>
    {/* Shell de altura fija: el contenedor mide exactamente el alto de la
        ventana (dvh para que en móvil no lo rompa la barra del navegador) y el
        único que hace scroll es <main>. Así el sidebar siempre cubre todo el
        alto y el menú queda visible aunque la lista de grupos sea larga.
        Con min-h-screen el sidebar solo crecía lo que medía su contenido. */}
    <div className="flex h-dvh w-full overflow-hidden bg-gardner-neutro">
      <Sidebar pendientesJustificantes={pendientesJustificantes} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-gardner-gris/15 bg-white px-6 py-3">
          <div className="flex items-center gap-2">
            <MenuButton />
            <div className="hidden items-center sm:flex">
              <BuscadorGlobal />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ciclo && (
              <span
                className="hidden items-center gap-1.5 rounded-lg bg-gardner-azul/10 px-3 py-1.5 text-xs font-semibold text-gardner-azul-oscuro md:inline-flex"
                title="Ciclo escolar activo"
              >
                <span className="material-symbols-outlined text-[16px]">school</span>
                Ciclo {ciclo.anioEscolar}
              </span>
            )}
            <button className="rounded-full p-2 text-gardner-gris/70 transition-colors hover:bg-gardner-azul/10 hover:text-gardner-azul-oscuro">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
            <button className="rounded-full p-2 text-gardner-gris/70 transition-colors hover:bg-gardner-azul/10 hover:text-gardner-azul-oscuro">
              <span className="material-symbols-outlined text-[20px]">help</span>
            </button>
            <div className="flex items-center gap-3 border-l border-gardner-gris/15 pl-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gardner-azul text-sm font-bold text-white">
                {sesion.nombre
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-semibold text-gardner-gris">{sesion.nombre}</p>
                <p className="text-xs font-medium text-gardner-gris/70">{sesion.rol}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
    </SidebarProvider>
  );
}
