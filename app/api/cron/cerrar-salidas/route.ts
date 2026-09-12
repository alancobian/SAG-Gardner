// Cierre automático de salidas, invocado por Vercel Cron.
//
// Reemplaza al job de Wix (cerrarSalidas-supabase.jsw): ahora todo el SAG vive
// en un solo lugar y no depende de que el sitio de Wix siga en pie.
//
// La hora la fija el código, no el momento de la ejecución, así que si Vercel
// corre el cron con retraso el dato queda igual de correcto.

import { cerrarSalidasPendientes } from "@/lib/cierreSalidas";

// Sin caché: cada invocación tiene que consultar la base de verdad.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Vercel Cron manda "Authorization: Bearer <CRON_SECRET>". Sin esta
  // comprobación, cualquiera que adivine la URL podría cerrar las salidas del
  // día antes de tiempo.
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    return Response.json({ ok: false, error: "Falta CRON_SECRET en el entorno" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  try {
    const resultado = await cerrarSalidasPendientes();
    console.log(
      resultado.omitido
        ? `Cierre automático de salidas (${resultado.fecha}): omitido, no es día lectivo (${resultado.omitido}).`
        : `Cierre automático de salidas (${resultado.fecha}): ${resultado.cerrados} registros cerrados.`
    );
    return Response.json({ ok: true, ...resultado });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    console.error("Fallo el cierre automático de salidas:", mensaje);
    return Response.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
