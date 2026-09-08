import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import EditarAlumnoClient from "./EditarAlumnoClient";

export default async function EditarAlumnoPage({
  params,
}: {
  params: Promise<{ alumnoId: string }>;
}) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (sesion.rol !== "Administrador") redirect("/grupos-alumnos");

  const { alumnoId } = await params;
  return <EditarAlumnoClient alumnoId={alumnoId} />;
}
