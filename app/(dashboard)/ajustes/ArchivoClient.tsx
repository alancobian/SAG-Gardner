"use client";

// Ajustes → Archivo. Reconstruido contra el diseño de Stitch
// ("Configuración del Sistema - SAG"), que plantea dos cosas en esta pestaña:
// cerrar el ciclo escolar en curso y consultar los ciclos ya cerrados.

import { useCallback, useEffect, useState, useTransition } from "react";
import type { CicloEscolar, CicloArchivado } from "@/lib/calendario";
import {
  obtenerCicloEscolarAction,
  cerrarCicloEscolarAction,
  listarCiclosArchivadosAction,
} from "./calendario/actions";

function formatoFecha(fecha: string | null) {
  if (!fecha) return "—";
  try {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return fecha;
  }
}

export default function ArchivoClient() {
  const [ciclo, setCiclo] = useState<CicloEscolar | null>(null);
  const [archivados, setArchivados] = useState<CicloArchivado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // El cierre pide de una vez los datos del ciclo entrante, para no dejar al
  // sistema sin ciclo activo entre un paso y otro.
  const [confirmando, setConfirmando] = useState(false);
  const [anioEscolar, setAnioEscolar] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaCierre, setFechaCierre] = useState("");

  const recargar = useCallback(async () => {
    const [resCiclo, resArchivo] = await Promise.all([
      obtenerCicloEscolarAction(),
      listarCiclosArchivadosAction(),
    ]);
    if (resCiclo.ok) setCiclo(resCiclo.data);
    else setError(resCiclo.error);
    if (resArchivo.ok) setArchivados(resArchivo.data);
    setCargando(false);
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  function onCerrarCiclo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    startTransition(async () => {
      const res = await cerrarCicloEscolarAction({ anioEscolar, fechaInicio, fechaCierre });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConfirmando(false);
      setAnioEscolar("");
      setFechaInicio("");
      setFechaCierre("");
      setAviso("Ciclo cerrado. El anterior quedó archivado y el nuevo ya está activo.");
      await recargar();
    });
  }

  if (cargando) return <p className="text-sm text-gardner-gris/65">Cargando…</p>;

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {aviso && (
        <p className="rounded-lg bg-estado-puntual/10 px-3 py-2 text-sm font-medium text-estado-puntual">{aviso}</p>
      )}

      <div className="rounded-2xl border border-gardner-gris/15 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold text-gardner-gris">
          <span className="material-symbols-outlined text-[20px] text-gardner-azul">school</span>
          Ciclo activo
        </h2>

        {ciclo ? (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-2xl font-bold text-gardner-azul-oscuro">{ciclo.anioEscolar || "Sin nombre"}</p>
                <p className="mt-0.5 text-sm text-gardner-gris/70">
                  {formatoFecha(ciclo.fechaInicio)} — {formatoFecha(ciclo.fechaCierre)}
                </p>
              </div>
              {!confirmando && (
                <button
                  onClick={() => setConfirmando(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-gardner-azul/30 bg-gardner-azul/10 px-4 py-2.5 text-sm font-semibold text-gardner-azul-oscuro transition hover:bg-gardner-azul hover:text-white"
                >
                  <span className="material-symbols-outlined text-[18px]">archive</span>
                  Cerrar ciclo actual
                </button>
              )}
            </div>

            {confirmando && (
              <form onSubmit={onCerrarCiclo} className="mt-5 flex flex-col gap-4 rounded-xl border border-gardner-azul/25 bg-gardner-azul/5 p-5">
                <div>
                  <h3 className="text-sm font-bold text-gardner-gris">Cerrar {ciclo.anioEscolar} y abrir el siguiente</h3>
                  <p className="mt-1 text-xs leading-relaxed text-gardner-gris/70">
                    No se borra nada: la asistencia, los alumnos y los docentes se quedan tal cual, y el ciclo que cierras
                    queda consultable aquí abajo. Tampoco se promueve a los alumnos de grado — ese cambio se hace a mano
                    desde Grupos y Alumnos cuando corresponda.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gardner-gris/75">Nuevo ciclo</label>
                    <input
                      required
                      value={anioEscolar}
                      onChange={(e) => setAnioEscolar(e.target.value)}
                      placeholder="2027-2028"
                      className="rounded-lg border border-gardner-gris/25 bg-white px-3 py-2.5 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gardner-gris/75">Inicio</label>
                    <input
                      type="date"
                      required
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="rounded-lg border border-gardner-gris/25 bg-white px-3 py-2.5 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gardner-gris/75">Cierre</label>
                    <input
                      type="date"
                      required
                      value={fechaCierre}
                      min={fechaInicio || undefined}
                      onChange={(e) => setFechaCierre(e.target.value)}
                      className="rounded-lg border border-gardner-gris/25 bg-white px-3 py-2.5 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-gardner-azul-oscuro px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gardner-azul disabled:opacity-60"
                  >
                    {isPending ? "Cerrando…" : "Confirmar cierre"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmando(false)}
                    className="rounded-lg px-4 py-2.5 text-sm font-medium text-gardner-gris/75 transition hover:bg-gardner-gris/10"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-gardner-gris/70">
            Todavía no hay un ciclo escolar configurado. Créalo desde la pestaña Calendario escolar.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-gardner-gris/15 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold text-gardner-gris">
          <span className="material-symbols-outlined text-[20px] text-gardner-gris/55">inventory_2</span>
          Archivo histórico
        </h2>
        <p className="mt-1 text-xs text-gardner-gris/65">Ciclos escolares cerrados y la asistencia que quedó guardada en cada uno.</p>

        {archivados.length === 0 ? (
          <div className="mt-5 flex flex-col items-center gap-2 rounded-xl border border-dashed border-gardner-gris/25 px-6 py-10 text-center">
            <span className="material-symbols-outlined text-[32px] text-gardner-gris/35">inventory_2</span>
            <p className="text-sm font-medium text-gardner-gris">Aún no hay ciclos archivados</p>
            <p className="max-w-sm text-xs text-gardner-gris/65">
              Cuando cierres el ciclo actual aparecerá aquí, junto con su historial de asistencia.
            </p>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-2.5">
            {archivados.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gardner-gris/15 bg-gardner-neutro px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gardner-gris">{c.anioEscolar || "Ciclo sin nombre"}</p>
                  <p className="text-xs text-gardner-gris/65">
                    {formatoFecha(c.fechaInicio)} — {formatoFecha(c.fechaCierre)}
                  </p>
                </div>
                <span className="rounded-full bg-gardner-azul/10 px-3 py-1 text-xs font-semibold text-gardner-azul-oscuro">
                  {c.registrosAsistencia.toLocaleString("es-MX")} registros de asistencia
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
