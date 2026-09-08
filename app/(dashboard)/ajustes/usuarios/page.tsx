import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import UsuariosClient from "./UsuariosClient";

export default async function UsuariosPage() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "Administrador") redirect("/asistencia");

  return <UsuariosClient miPropioId={sesion.id} />;
}
