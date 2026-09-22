import { Suspense } from "react";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import AdministrativosClient from "./AdministrativosClient";

export default async function AdministrativosPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  return (
    // useSearchParams (para el enlace ?persona= del buscador global) obliga a
    // envolver el cliente en Suspense.
    <Suspense fallback={<p className="text-sm text-gardner-gris/65">Cargando…</p>}>
      <AdministrativosClient esAdmin={sesion.rol === "Administrador"} />
    </Suspense>
  );
}
