// Genera el codigo QR de un alumno o docente a partir de su codigoQr
// (formato GARD-XXXX / DOC-XXXX). Requiere sesion activa (igual que el
// resto del panel, protegido por middleware.ts salvo /login).

import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { requerirSesion } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const sesion = await requerirSesion();
  if (!sesion) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const codigo = (searchParams.get("codigo") || "").trim();
  const nombre = (searchParams.get("nombre") || "").trim();
  const descargar = searchParams.get("download") === "1";

  if (!codigo) {
    return NextResponse.json({ error: "Falta el código" }, { status: 400 });
  }

  const buffer = await QRCode.toBuffer(codigo, {
    type: "png",
    width: 640,
    margin: 2,
    color: { dark: "#005386", light: "#FFFFFF" },
  });

  const nombreArchivo = `QR-${(nombre || codigo).replace(/[^a-zA-Z0-9-_]+/g, "_")}.png`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
      ...(descargar ? { "Content-Disposition": `attachment; filename="${nombreArchivo}"` } : {}),
    },
  });
}
