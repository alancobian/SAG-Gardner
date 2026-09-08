// Equivalente a post_login en http-functions-supabase.js: valida correo+PIN
// contra usuarios_sistema. A diferencia de la version Wix, aqui SI se emite
// una cookie httpOnly con un JWT firmado (ver lib/session.ts) en vez de
// dejar que el cliente guarde la sesion el mismo.

import { NextRequest, NextResponse } from "next/server";
import { supaGet, eqP, qs } from "@/lib/supabaseAdmin";
import { crearTokenSesion, SESSION_COOKIE } from "@/lib/session";

type UsuarioSistema = {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const datos = await request.json();
    const correo = String(datos.correo || "").trim().toLowerCase();
    const pin = String(datos.pin || "").trim();

    if (!correo || !pin) {
      return NextResponse.json({ ok: false, error: "Falta correo o PIN" }, { status: 400 });
    }

    const rows = await supaGet<UsuarioSistema>(
      "usuarios_sistema",
      qs([eqP("correo", correo), eqP("pin", pin), eqP("activo", true)])
    );

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Correo o PIN incorrecto" }, { status: 200 });
    }

    const usuario = rows[0];
    const token = await crearTokenSesion({
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    });

    const res = NextResponse.json({
      ok: true,
      usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
    });

    res.cookies.set(SESSION_COOKIE.name, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE.maxAge,
    });

    return res;
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
