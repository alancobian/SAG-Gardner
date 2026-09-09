import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import HorarioDocentesClient from "./HorarioDocentesClient";

export default async function HorarioDocentesPage() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "Administrador") redirect("/asistencia");

  return <HorarioDocentesClient />;
}
