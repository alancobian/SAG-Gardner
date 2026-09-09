import { NextRequest, NextResponse } from "next/server";
import { verificarTokenSesion, SESSION_COOKIE } from "@/lib/session";

// Rutas que no requieren sesion activa.
const RUTAS_PUBLICAS = ["/login", "/api/login"];

// Dominio dedicado a los puntos de acceso fisicos (tablets/kioscos en la
// entrada). Sirve unicamente la pantalla de escaneo -- nunca el resto del
// panel administrativo -- sin importar la ruta que alguien intente abrir a
// mano. El registro DNS y `vercel domains add` viven fuera del codigo.
const HOST_ACCESO = "acceso.institutogardner.edu.mx";

function esHostAcceso(host: string) {
  return host === HOST_ACCESO || host.startsWith(`${HOST_ACCESO}:`);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  if (pathname.startsWith("/_next") || pathname.startsWith("/img") || pathname.startsWith("/fonts")) {
    return NextResponse.next();
  }

  const esPublica = RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const esEscaneo = pathname === "/escaneo" || pathname.startsWith("/escaneo/");
  const esApi = pathname.startsWith("/api/");

  // El dominio de acceso solo conoce /escaneo (ademas de login/API): el
  // panel administrativo completo (Alumnos, Docentes, Ajustes...) nunca se
  // sirve ahi, ni siquiera si alguien teclea la URL directamente.
  if (esHostAcceso(host) && !esPublica && !esEscaneo && !esApi) {
    return NextResponse.redirect(new URL("/escaneo", request.url));
  }

  if (esPublica) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE.name)?.value;
  const sesion = token ? await verificarTokenSesion(token) : null;

  if (!sesion) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // El rol Porteria (personal de los puntos de acceso) solo puede usar la
  // pantalla de escaneo, sin importar desde que dominio entre.
  if (sesion.rol === "Portería" && !esEscaneo && !esApi) {
    return NextResponse.redirect(new URL("/escaneo", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
