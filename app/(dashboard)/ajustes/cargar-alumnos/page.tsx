import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import CargarAlumnosClient from "./CargarAlumnosClient";

export default async function CargarAlumnosPage() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "Administrador") redirect("/asistencia");

  return <CargarAlumnosClient />;
}
