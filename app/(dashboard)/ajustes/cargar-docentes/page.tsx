import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import CargarDocentesClient from "./CargarDocentesClient";

export default async function CargarDocentesPage() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "Administrador") redirect("/asistencia");

  return <CargarDocentesClient />;
}
