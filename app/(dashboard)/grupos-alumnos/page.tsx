import { obtenerSesion } from "@/lib/auth";
import GruposAlumnosClient from "./GruposAlumnosClient";

export default async function GruposAlumnosPage() {
  const sesion = await obtenerSesion();
  const puedeEditar = sesion?.rol === "Administrador";

  return <GruposAlumnosClient puedeEditar={puedeEditar} />;
}
