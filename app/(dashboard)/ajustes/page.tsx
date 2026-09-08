import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import AjustesClient from "./AjustesClient";

export default async function AjustesPage() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "Administrador") redirect("/asistencia");

  return <AjustesClient miPropioId={sesion.id} />;
}
