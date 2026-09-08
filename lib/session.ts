// Sesion del panel SAG.
//
// El sistema NO usa Supabase Auth: el login histórico (heredado de la version
// Wix/Velo) valida correo+PIN contra la tabla usuarios_sistema directamente.
// Aqui se conserva ese mismo contrato (misma tabla, mismas reglas), pero en
// vez de guardar la sesion en sessionStorage/localStorage del navegador (como
// hacia el Custom Embed de Wix, sin verificacion real de servidor), se emite
// un JWT firmado y se guarda en una cookie httpOnly -- el servidor puede
// verificar la sesion en cada request sin volver a golpear la base de datos.

import { SignJWT, jwtVerify } from "jose";

const SESSION_SECRET = process.env.SESSION_SECRET;
const COOKIE_NAME = "sag_session";
const DURACION_SEGUNDOS = 60 * 60 * 12; // 12 horas, coincide con un turno/dia de trabajo

export type SesionUsuario = {
  id: string;
  nombre: string;
  correo: string;
  rol: "Administrador" | "Staff" | "Portería" | string;
};

function getSecretKey() {
  if (!SESSION_SECRET) {
    throw new Error("Falta SESSION_SECRET en las variables de entorno.");
  }
  return new TextEncoder().encode(SESSION_SECRET);
}

export async function crearTokenSesion(usuario: SesionUsuario): Promise<string> {
  return await new SignJWT({ ...usuario })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SEGUNDOS}s`)
    .sign(getSecretKey());
}

export async function verificarTokenSesion(token: string): Promise<SesionUsuario | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SesionUsuario;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = {
  name: COOKIE_NAME,
  maxAge: DURACION_SEGUNDOS,
};
