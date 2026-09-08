import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import CalendarioClient from "./CalendarioClient";

export default async function CalendarioPage() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "Administrador") redirect("/asistencia");

  return <CalendarioClient />;
}
