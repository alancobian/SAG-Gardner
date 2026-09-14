"use client";

// Vista previa del reporte semanal, tal cual le llegaría al maestro.
//
// Existe antes que el envío a propósito: 25 maestros van a recibir esto cada
// viernes y conviene mirarlo con calma antes de automatizarlo. El correo se
// muestra dentro de un iframe para que sus estilos en línea no se mezclen con
// los del panel y se vea igual que en Gmail.

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { obtenerVistaPreviaSemanalAction, type VistaPreviaSemanal } from "./actions";

function formatoFecha(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
  });
}

export default function SemanalClient({ semanaInicial }: { semanaInicial: string }) {
  const [semana, setSemana] = useState(semanaInicial);
  const [vistas, setVistas] = useState<VistaPreviaSemanal[]>([]);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [, startTransition] = useTransition();

  const cargar = useCallback((s: string) => {
    setCargando(true);
    setError(null);
    startTransition(async () => {
      const res = await obtenerVistaPreviaSemanalAction(s);
      if (res.ok) {
        setVistas(res.data);
        setSeleccionado((prev) =>
          prev && res.data.some((v) => v.reporte.grupoId === prev)
            ? prev
            : (res.data[0]?.reporte.grupoId ?? null)
        );
      } else {
        setError(res.error);
        setVistas([]);
      }
      setCargando(false);
    });
  }, []);

  useEffect(() => {
    cargar(semanaInicial);
  }, [cargar, semanaInicial]);

  const actual = useMemo(
    () => vistas.find((v) => v.reporte.grupoId === seleccionado) ?? null,
    [vistas, seleccionado]
  );

  // Cuántos grupos tendrían algo que contar y cuántos no: es lo que decide si
  // el envío automático vale la pena todavía.
  const resumen = useMemo(() => {
    const conDatos = vistas.filter((v) => v.reporte.diasConRegistro > 0).length;
    const conAlertas = vistas.filter((v) => v.reporte.alertas.length > 0).length;
    const sinCorreo = vistas.filter((v) =>
      v.reporte.titulares.some((t) => !t.correo)
    ).length;
    return { total: vistas.length, conDatos, conAlertas, sinCorreo };
  }, [vistas]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gardner-gris">Reporte semanal para docentes</h2>
          <p className="mt-1 text-xs text-gardner-gris/70">
            Así se vería el correo que recibe cada titular. Todavía no se envía nada.
          </p>
        </div>
        <label className="flex flex-col text-xs font-semibold text-gardner-gris/70">
          Semana (cualquier día de esa semana)
          <input
            type="date"
            value={semana}
            onChange={(e) => {
              setSemana(e.target.value);
              if (e.target.value) cargar(e.target.value);
            }}
            className="mt-1 rounded-lg border border-gardner-gris/20 bg-white px-3 py-1.5 text-xs font-medium text-gardner-gris"
          />
        </label>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {!cargando && vistas.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-gardner-azul/10 px-3 py-1 text-gardner-azul-oscuro">
            {resumen.total} grupos
          </span>
          <span className="rounded-full bg-estado-puntual/15 px-3 py-1 text-estado-puntual">
            {resumen.conDatos} con registros esta semana
          </span>
          {resumen.conAlertas > 0 && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">
              {resumen.conAlertas} con alumnos en alerta
            </span>
          )}
          {resumen.sinCorreo > 0 && (
            <span className="rounded-full bg-estado-retardo/15 px-3 py-1 text-estado-retardo">
              {resumen.sinCorreo} sin correo de titular
            </span>
          )}
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-gardner-gris/65">Generando vista previa…</p>
      ) : vistas.length === 0 ? (
        <p className="text-sm text-gardner-gris/65">No hay grupos en tu alcance para esta semana.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="max-h-[560px] space-y-1 overflow-y-auto rounded-xl border border-gardner-gris/15 bg-white p-2">
            {vistas.map((v) => {
              const r = v.reporte;
              const activo = r.grupoId === seleccionado;
              return (
                <button
                  key={r.grupoId}
                  onClick={() => setSeleccionado(r.grupoId)}
                  className={`w-full rounded-lg px-3 py-2 text-left transition ${
                    activo ? "bg-gardner-azul text-white" : "hover:bg-gardner-azul/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${activo ? "" : "text-gardner-gris"}`}>
                      {r.grupo}
                    </span>
                    {r.alertas.length > 0 && (
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          activo ? "bg-white/25 text-white" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {r.alertas.length}
                      </span>
                    )}
                  </div>
                  <div className={`text-[11px] ${activo ? "text-white/75" : "text-gardner-gris/55"}`}>
                    {r.nivelAcademico} ·{" "}
                    {r.diasConRegistro === 0
                      ? "sin registros"
                      : `${r.diasConRegistro}/${r.diasLectivos} días`}
                  </div>
                </button>
              );
            })}
          </div>

          {actual && (
            <div className="space-y-3">
              <div className="rounded-xl border border-gardner-gris/15 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gardner-gris/55">
                  Para
                </p>
                <p className="text-sm font-medium text-gardner-gris">
                  {actual.reporte.titulares.length === 0 ? (
                    <span className="italic text-gardner-gris/45">Sin titular asignado</span>
                  ) : (
                    actual.reporte.titulares.map((t) => (
                      <span key={t.nombre} className="mr-3 inline-block">
                        {t.nombre}{" "}
                        {t.correo ? (
                          <span className="text-gardner-gris/60">&lt;{t.correo}&gt;</span>
                        ) : (
                          <span className="font-semibold text-estado-retardo">sin correo</span>
                        )}
                      </span>
                    ))
                  )}
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-gardner-gris/55">
                  Asunto
                </p>
                <p className="text-sm font-medium text-gardner-gris">{actual.asunto}</p>
              </div>

              {/* srcDoc aísla el correo del CSS del panel: se ve tal cual llegaría. */}
              <iframe
                title={`Vista previa ${actual.reporte.grupo}`}
                srcDoc={actual.html}
                className="h-[620px] w-full rounded-xl border border-gardner-gris/15 bg-white"
              />
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-gardner-gris/55">
        Semana del {formatoFecha(vistas[0]?.reporte.semanaInicio ?? semana)} al{" "}
        {formatoFecha(vistas[0]?.reporte.semanaFin ?? semana)}. Los días marcados como no lectivos en
        el calendario escolar quedan fuera, y los días en que el grupo no registró a nadie no se
        cuentan como faltas.
      </p>
    </div>
  );
}
