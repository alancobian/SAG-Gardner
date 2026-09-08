import { obtenerSesion } from "@/lib/auth";
import JustificantesClient from "./JustificantesClient";

export default async function JustificantesPage() {
  const sesion = await obtenerSesion();
  const puedeEliminar = sesion?.rol === "Administrador";

  return <JustificantesClient puedeEliminar={puedeEliminar} />;
}
