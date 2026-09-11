"use client";

import { useRouter } from "next/navigation";

// En el kiosco esto no es "salirse del sistema" sino "entra el siguiente turno
// de prefectura", por eso la etiqueta es "Cambiar usuario" (asi lo plantea el
// diseño de Stitch) aunque por dentro sea el mismo cierre de sesion.
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
      className="text-sm font-medium text-white/70 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
    >
      Cambiar usuario
    </button>
  );
}
