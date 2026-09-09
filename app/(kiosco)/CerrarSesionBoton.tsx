"use client";

import { useRouter } from "next/navigation";

export default function CerrarSesionBoton() {
  const router = useRouter();

  async function cerrarSesion() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={cerrarSesion}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-gardner-gris/70 transition-colors hover:bg-gardner-gris/10 hover:text-gardner-gris"
    >
      <span className="material-symbols-outlined text-[18px]">logout</span>
      <span className="hidden sm:inline">Cerrar sesión</span>
    </button>
  );
}
