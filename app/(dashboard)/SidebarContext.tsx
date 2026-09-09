"use client";

// Estado compartido de "¿el menú lateral está abierto?" entre el botón de
// hamburguesa (en el header, dentro de layout.tsx) y el propio Sidebar --
// necesario porque en móvil el sidebar se vuelve un cajón (drawer) que se
// abre/cierra, y ambos viven en componentes distintos del mismo layout.
// En escritorio (md y arriba) el sidebar siempre está visible y este estado
// simplemente no se usa para ocultarlo.

import { createContext, useContext, useState } from "react";

type SidebarContextValue = {
  abierto: boolean;
  abrir: () => void;
  cerrar: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <SidebarContext.Provider value={{ abierto, abrir: () => setAbierto(true), cerrar: () => setAbierto(false) }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar debe usarse dentro de SidebarProvider");
  return ctx;
}
