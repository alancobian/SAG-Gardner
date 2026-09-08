import { cookies } from "next/headers";
import { SESSION_COOKIE, verificarTokenSesion, type SesionUsuario } from "./session";

/** Lee y valida la sesion actual desde la cookie httpOnly. Server-side only. */
export async function obtenerSesion(): Promise<SesionUsuario | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE.name)?.value;
  if (!token) return null;
  return verificarTokenSesion(token);
}

/** Igual que validarUsuario(usuarioId, rolesPermitidos) en http-functions-supabase.js,
 * pero a partir de la sesion de cookie en vez de un usuarioId recibido por parametro. */
export async function requerirSesion(rolesPermitidos?: string[]): Promise<SesionUsuario | null> {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  if (rolesPermitidos && !rolesPermitidos.includes(sesion.rol)) return null;
  return sesion;
}
