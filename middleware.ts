import { NextRequest, NextResponse } from "next/server";
import { verificarTokenSesion, SESSION_COOKIE } from "@/lib/session";

// Rutas que no requieren sesion activa.
const RUTAS_PUBLICAS = ["/login", "/api/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const esPublica = RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(r + "/"));
  if (esPublica || pathname.startsWith("/_next") || pathname.startsWith("/img") || pathname.startsWith("/fonts")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE.name)?.value;
  const sesion = token ? await verificarTokenSesion(token) : null;

  if (!sesion) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
