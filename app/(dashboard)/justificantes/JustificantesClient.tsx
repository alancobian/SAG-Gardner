"use client";

// Seccion Justificantes, reconstruida contra el diseño de Stitch
// ("Gestión de Justificantes - SAG").
//
// Cambio de fondo respecto a la version anterior: antes habia que buscar un
// alumno para ver sus justificantes; ahora la pantalla abre mostrando los mas
// recientes de todo el plantel en tarjetas, y el buscador vive dentro del
// formulario de alta. Ademas un justificante cubre un rango de fechas y tiene
// un tipo de ausencia (ver migracion 1).

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { AlumnoBusqueda } from "@/lib/alumnos";
import type { JustificanteConAlumno, TipoJustificante } from "@/lib/justificantes";
import { TIPOS_JUSTIFICANTE } from "@/lib/justificantes";
import {
  buscarAlumnosAction,
  listarJustificantesRecientesAction,
  crearJustificanteAction,
  eliminarJustificanteAction,
} from "./actions";

// Cada tipo de ausencia tiene su color para que la tarjeta se lea de un
// vistazo, usando los mismos tonos de estado del resto del panel.
const ESTILO_TIPO: Record<TipoJustificante, string> = {
  Enfermedad: "bg-estado-retardo/15 text-estado-retardo",
  "Asunto familiar": "bg-gardner-azul/10 text-gardner-azul-oscuro",
  Competencia: "bg-estado-puntual/15 text-estado-puntual",
  Otro: "bg-gardner-gris/10 text-gardner-gris/70",
};

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Las fechas son columnas date ("2026-09-11"), sin hora: se les agrega mediodia
// para que el navegador no las corra un dia al interpretarlas.
function formatoFecha(fecha: string) {
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

function rangoFechas(inicio: string, fin: string) {
  return inicio === fin ? formatoFecha(inicio) : `${formatoFecha(inicio)} — ${formatoFecha(fin)}`;
}

export default function JustificantesClient({ puedeEliminar }: { puedeEliminar: boolean }) {
  const [justificantes, setJustificantes] = useState<JustificanteConAlumno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Formulario de alta
  const [mostrarForm, setMostrarForm] = useState(false);
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState<AlumnoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [alumno, setAlumno] = useState<AlumnoBusqueda | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [tipo, setTipo] = useState<TipoJustificante>("Enfermedad");
  const [motivo, setMotivo] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recargar = useCallback(async () => {
    const res = await listarJustificantesRecientesAction();
    if (res.ok) setJustificantes(res.data);
    else setError(res.error);
    setCargando(false);
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Busqueda de alumno con retraso, para no consultar en cada tecla.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!termino.trim() || alumno) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      const res = await buscarAlumnosAction(termino);
      setResultados(res.ok ? res.data : []);
      setBuscando(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [termino, alumno]);

  function limpiarFormulario() {
    setAlumno(null);
    setTermino("");
    setResultados([]);
    setFechaInicio("");
    setFechaFin("");
    setTipo("Enfermedad");
    setMotivo("");
  }

  function onGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (!alumno || !fechaInicio) return;
    setError(null);
    startTransition(async () => {
      const res = await crearJustificanteAction({
        alumnoId: alumno.id,
        fechaInicio,
        fechaFin: fechaFin || fechaInicio,
        tipo,
        motivo,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      limpiarFormulario();
      setMostrarForm(false);
      await recargar();
    });
  }

  function onEliminar(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await eliminarJustificanteAction(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await recargar();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gardner-gris">Justificantes</h1>
          <p className="text-sm text-gardner-gris/75">Gestiona las faltas justificadas de los alumnos.</p>
        </div>
        <button
          onClick={() => {
            setMostrarForm((v) => !v);
            if (mostrarForm) limpiarFormulario();
          }}
          className="flex items-center gap-1.5 rounded-lg bg-gardner-azul px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gardner-azul-oscuro"
        >
          <span className="material-symbols-outlined text-[18px]">{mostrarForm ? "close" : "add"}</span>
          {mostrarForm ? "Cancelar" : "Agregar justificante"}
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {mostrarForm && (
        <form onSubmit={onGuardar} className="flex flex-col gap-5 rounded-xl border border-gardner-gris/15 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gardner-gris">Nuevo justificante</h2>

          <div className="relative flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gardner-gris/75">Alumno</label>
            {alumno ? (
              <div className="flex items-center justify-between rounded-lg border border-gardner-azul/30 bg-gardner-azul/5 px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-gardner-gris">{alumno.nombre}</p>
                  <p className="text-xs text-gardner-gris/65">{alumno.grupo}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAlumno(null);
                    setTermino("");
                  }}
                  className="rounded-full p-1 text-gardner-gris/55 transition hover:bg-gardner-gris/10 hover:text-gardner-gris"
                  aria-label="Quitar alumno"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-gardner-gris/45">
                    search
                  </span>
                  <input
                    type="text"
                    value={termino}
                    onChange={(e) => setTermino(e.target.value)}
                    placeholder="Escribe el nombre del alumno…"
                    className="w-full rounded-lg border border-gardner-gris/25 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
                  />
                </div>
                {termino.trim() && (
                  <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-lg border border-gardner-gris/15 bg-white shadow-lg">
                    {buscando && <p className="px-4 py-3 text-sm text-gardner-gris/65">Buscando…</p>}
                    {!buscando && resultados.length === 0 && (
                      <p className="px-4 py-3 text-sm text-gardner-gris/65">Sin resultados</p>
                    )}
                    {!buscando &&
                      resultados.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setAlumno(r);
                            setResultados([]);
                          }}
                          className="flex w-full flex-col items-start px-4 py-2.5 text-left text-sm transition hover:bg-gardner-azul/10"
                        >
                          <span className="font-medium text-gardner-gris">{r.nombre}</span>
                          <span className="text-xs text-gardner-gris/65">{r.grupo}</span>
                        </button>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gardner-gris/75">Fecha de inicio</label>
              <input
                type="date"
                required
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="rounded-lg border border-gardner-gris/25 px-3 py-2.5 text-sm outline-none transition focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gardner-gris/75">Fecha de fin</label>
              <input
                type="date"
                value={fechaFin}
                min={fechaInicio || undefined}
                onChange={(e) => setFechaFin(e.target.value)}
                className="rounded-lg border border-gardner-gris/25 px-3 py-2.5 text-sm outline-none transition focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
              />
              <p className="text-[11px] text-gardner-gris/55">Déjala vacía si es un solo día.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gardner-gris/75">Tipo de ausencia</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoJustificante)}
                className="rounded-lg border border-gardner-gris/25 px-3 py-2.5 text-sm outline-none transition focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
              >
                {TIPOS_JUSTIFICANTE.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gardner-gris/75">Motivo</label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describe brevemente el motivo de la falta…"
              className="resize-y rounded-lg border border-gardner-gris/25 px-3 py-2.5 text-sm outline-none transition focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
            />
          </div>

          <div className="flex items-center gap-3 border-t border-gardner-gris/15 pt-4">
            <button
              type="submit"
              disabled={isPending || !alumno || !fechaInicio}
              className="flex items-center gap-1.5 rounded-lg bg-gardner-azul px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gardner-azul-oscuro disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                limpiarFormulario();
                setMostrarForm(false);
              }}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-gardner-gris/75 transition hover:bg-gardner-gris/10"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando && <p className="text-sm text-gardner-gris/65">Cargando justificantes…</p>}

      {!cargando && justificantes.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gardner-gris/25 bg-white px-6 py-12 text-center">
          <span className="material-symbols-outlined text-[36px] text-gardner-gris/35">assignment_turned_in</span>
          <p className="text-sm font-medium text-gardner-gris">Todavía no hay justificantes registrados</p>
          <p className="text-xs text-gardner-gris/65">
            Cuando un padre reporte una inasistencia, regístrala con el botón de arriba.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {justificantes.map((j) => (
          <div
            key={j.id}
            className="flex flex-col overflow-hidden rounded-xl border border-gardner-gris/15 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3 border-b border-gardner-gris/10 p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gardner-azul/10 text-sm font-bold text-gardner-azul-oscuro">
                  {j.alumno.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={j.alumno.foto} alt="" className="h-full w-full object-cover" />
                  ) : (
                    iniciales(j.alumno.nombre)
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold leading-tight text-gardner-gris">{j.alumno.nombre}</h3>
                  <span className="text-xs text-gardner-gris/65">{j.alumno.grupo ?? "Sin grupo"}</span>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTILO_TIPO[j.tipo] ?? ESTILO_TIPO.Otro}`}
              >
                {j.tipo}
              </span>
            </div>

            <div className="flex-grow p-5">
              <div className="mb-3 flex items-center gap-2 text-gardner-gris/70">
                <span className="material-symbols-outlined text-[20px]">event</span>
                <span className="text-sm font-medium">{rangoFechas(j.fechaInicio, j.fechaFin)}</span>
              </div>
              <p className="line-clamp-3 text-sm text-gardner-gris/70">
                {j.motivo || "Sin motivo especificado."}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-gardner-gris/10 bg-gardner-neutro px-5 py-3">
              <span className="truncate text-[11px] text-gardner-gris/55">Autorizó {j.autorizadoPor}</span>
              {puedeEliminar && (
                <button
                  onClick={() => onEliminar(j.id)}
                  disabled={isPending}
                  className="flex shrink-0 items-center gap-1 text-sm font-medium text-red-600 transition-colors hover:text-red-700 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
