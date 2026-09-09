"use client";

import { useSidebar } from "./SidebarContext";

// Botón de hamburguesa, solo visible en móvil (md:hidden) -- abre el cajón
// del Sidebar. Vive en el header (layout.tsx) mientras que el propio cajón
// vive en Sidebar.tsx; ambos comparten el estado vía SidebarContext.
export default function MenuButton() {
  const { abrir } = useSidebar();
  return (
    <button
      onClick={abrir}
      className="rounded-full p-2 text-gardner-gris/70 transition-colors hover:bg-gardner-azul/10 hover:text-gardner-azul-oscuro md:hidden"
      aria-label="Abrir menú"
    >
      <span className="material-symbols-outlined text-[22px]">menu</span>
    </button>
  );
}
