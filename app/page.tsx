import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";

export default async function Home() {
  const sesion = await obtenerSesion();
  redirect(sesion ? "/asistencia" : "/login");
}
