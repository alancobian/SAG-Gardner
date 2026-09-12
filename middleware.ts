import { NextRequest, NextResponse } from "next/server";
import { verificarTokenSesion, SESSION_COOKIE } from "@/lib/session";

// Rutas que no requieren sesion activa.
//
// /api/cron no lleva sesion de usuario porque lo invoca Vercel Cron, no una
// persona: se protege con CRON_SECRET dentro de la propia ruta. Si pasara por
// aqui, el middleware lo mandaria a /login y el trabajo nunca correria.
const RUTAS_PUBLICAS = ["/login", "/api/login", "/api/cron"];

// Archivos de icono/OG generados por la convencion de Next.js (app/icon.png,
// app/apple-icon.png, app/opengraph-image.png, app/favicon.ico). Deben ser
// publicos: los lee el navegador (favicon) y bots externos sin sesion
// (WhatsApp, etc.) para armar la vista previa del enlace.
const ARCHIVOS_ICONO_PUBLICOS = ["/favicon.ico", "/icon.png", "/apple-icon.png", "/opengraph-image.png"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/img") ||
    pathname.startsWith("/fonts") ||
    ARCHIVOS_ICONO_PUBLICOS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const esPublica = RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const esEscaneo = pathname === "/escaneo" || pathname.startsWith("/escaneo/");
  const esApi = pathname.startsWith("/api/");

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
