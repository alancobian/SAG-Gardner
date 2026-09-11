import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import Sidebar from "./Sidebar";
import MenuButton from "./MenuButton";
import { SidebarProvider } from "./SidebarContext";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  return (
    <SidebarProvider>
    <div className="flex min-h-screen w-full bg-gardner-neutro">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gardner-gris/15 bg-white px-6 py-3">
          <div className="flex items-center gap-2">
            <MenuButton />
            <div className="hidden items-center sm:flex">
              <div className="relative w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-gardner-gris/60">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar (próximamente)…"
                  disabled
                  title="El buscador global todavía no está conectado"
                  className="w-full cursor-not-allowed rounded-lg border-none bg-gardner-neutro py-2 pl-10 pr-3 text-sm text-gardner-gris outline-none placeholder:text-gardner-gris/50"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
