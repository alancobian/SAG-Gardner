import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verificarTokenSesion, type SesionUsuario } from "./session";
import { supaGet, eqP, qs } from "./supabaseAdmin";

type UsuarioRow = { rol: string; activo: boolean | null; niveles: string[] | null };

/**
 * Lee y valida la sesion actual desde la cookie httpOnly. Server-side only.
 *
 * Ademas de verificar la firma del token, vuelve a consultar el rol, el
 * alcance por nivel y si la cuenta sigue activa. Esto cuesta una consulta por
 * request, pero evita dos agujeros reales: que a alguien se le recorte el
 * acceso y siga viendo de mas hasta 12 horas (lo que dura el token), y que una
 * cuenta dada de baja siga entrando con su sesion abierta.
 *
 * Va envuelto en cache() de React para que las varias llamadas que ocurren al
 * renderizar una misma pagina compartan una sola consulta.
 */
export const obtenerSesion = cache(async function obtenerSesion(): Promise<SesionUsuario | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE.name)?.value;
  if (!token) return null;

  const sesion = await verificarTokenSesion(token);
  if (!sesion) return null;

  try {
    let filas: UsuarioRow[];
    try {
      filas = await supaGet<UsuarioRow>(
        "usuarios_sistema",
        qs([eqP("id", sesion.id), "select=rol,activo,niveles"])
      );
    } catch {
      // La columna "niveles" la agrega la migración 2. Si este código se
      // despliega antes de correr el SQL, pedirla haría fallar la consulta y
      // dejaría a TODO el personal fuera del sistema. Se reintenta sin ella y
      // el usuario queda con acceso total, que es el comportamiento previo.
      filas = await supaGet<UsuarioRow>(
        "usuarios_sistema",
        qs([eqP("id", sesion.id), "select=rol,activo"])
      );
    }
    const usuario = filas[0];
    // Cuenta borrada o desactivada: la sesion deja de valer aunque el token
    // siga siendo criptograficamente valido.
    if (!usuario || usuario.activo === false) return null;

    return { ...sesion, rol: usuario.rol, niveles: usuario.niveles ?? [] };
  } catch {
    // Si la base no responde no se puede confirmar el alcance, y conceder el
    // del token seria conceder de mas. Mejor tratar la sesion como invalida.
    return null;
  }
});

/** Igual que validarUsuario(usuarioId, rolesPermitidos) en http-functions-supabase.js,
 * pero a partir de la sesion de cookie en vez de un usuarioId recibido por parametro. */
export async function requerirSesion(rolesPermitidos?: string[]): Promise<SesionUsuario | null> {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  if (rolesPermitidos && !rolesPermitidos.includes(sesion.rol)) return null;
  return sesion;
}
