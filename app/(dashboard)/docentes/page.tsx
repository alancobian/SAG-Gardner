import { obtenerSesion } from "@/lib/auth";
import DocentesClient from "./DocentesClient";

export default async function DocentesPage() {
  const sesion = await obtenerSesion();
  const puedeEditar = sesion?.rol === "Administrador";

  return <DocentesClient puedeEditar={puedeEditar} />;
}
