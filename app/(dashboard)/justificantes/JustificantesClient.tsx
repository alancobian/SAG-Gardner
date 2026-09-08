"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { AlumnoBusqueda } from "@/lib/alumnos";
import type { Justificante } from "@/lib/justificantes";
import {
  buscarAlumnosAction,
  listarJustificantesAction,
  crearJustificanteAction,
  eliminarJustificanteAction,
} from "./actions";

function formatoFecha(fechaIso: string) {
  try {
    return new Date(fechaIso + "T12:00:00").toLocaleDateString("es-MX", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return fechaIso;
  }
}

export default function JustificantesClient({ puedeEliminar }: { puedeEliminar: boolean }) {
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState<AlumnoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [alumno, setAlumno] = useState<AlumnoBusqueda | null>(null);
  const [justificantes, setJustificantes] = useState<Justificante[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [fecha, setFecha] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!termino.trim()) {
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
  }, [termino]);

  async function seleccionarAlumno(a: AlumnoBusqueda) {
    setAlumno(a);
    setResultados([]);
    setTermino("");
    setMostrarForm(false);
    setError(null);
    setCargandoLista(true);
    const res = await listarJustificantesAction(a.id);
    setJustificantes(res.ok ? res.data : []);
    setCargandoLista(false);
  }

  async function recargarLista() {
    if (!alumno) return;
    const res = await listarJustificantesAction(alumno.id);
    setJustificantes(res.ok ? res.data : []);
  }

  function onAgregar(e: React.FormEvent) {
    e.preventDefault();
    if (!alumno || !fecha) return;
    setError(null);
    startTransition(async () => {
      const res = await crearJustificanteAction(alumno.id, fecha, motivo);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFecha("");
      setMotivo("");
      setMostrarForm(false);
      await recargarLista();
    });
  }

  function onEliminar(id: string) {
    startTransition(async () => {
      const res = await eliminarJustificanteAction(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await recargarLista();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gardner-gris">Justificantes</h1>
        <p className="text-sm text-gardner-gris/75">
          Busca un alumno para ver o registrar una inasistencia justificada.
        </p>
      </div>

      <div className="relative max-w-md">
        <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gardner-gris/55">
          search
        </span>
        <input
          type="text"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Buscar alumno por nombre…"
          className="w-full rounded-xl border border-gardner-gris/25 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
        />
        {(buscando || resultados.length > 0) && termino.trim() && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gardner-gris/15 bg-white shadow-lg">
            {buscando && <p className="px-4 py-3 text-sm text-gardner-gris/65">Buscando…</p>}
            {!buscando && resultados.length === 0 && (
              <p className="px-4 py-3 text-sm text-gardner-gris/65">Sin resultados</p>
            )}
            {!buscando &&
              resultados.map((r) => (
                <button
                  key={r.id}
                  onClick={() => seleccionarAlumno(r)}
                  className="flex w-full flex-col items-start px-4 py-2.5 text-left text-sm hover:bg-gardner-azul/10"
                >
                  <span className="font-medium text-gardner-gris">{r.nombre}</span>
                  <span className="text-xs text-gardner-gris/65">{r.grupo}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {alumno && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gardner-gris/15 pb-4">
            <div>
              <p className="font-semibold text-gardner-gris">{alumno.nombre}</p>
              <p className="text-xs text-gardner-gris/65">{alumno.grupo}</p>
            </div>
            <button
              onClick={() => setMostrarForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg bg-gardner-azul px-4 py-2 text-sm font-semibold text-white transition hover:bg-gardner-azul-oscuro"
            >
              <span className="material-symbols-outlined text-[18px]">{mostrarForm ? "close" : "add"}</span>
              {mostrarForm ? "Cancelar" : "Agregar justificante"}
            </button>
          </div>

          {mostrarForm && (
            <form onSubmit={onAgregar} className="flex flex-col gap-3 border-b border-gardner-gris/15 py-4 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gardner-gris/70">Fecha</label>
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-semibold text-gardner-gris/70">Motivo (opcional)</label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej. Cita médica, reportado por el papá"
                  className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-gardner-azul-oscuro px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Guardar
              </button>
            </form>
          )}

          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="pt-4">
            {cargandoLista && <p className="text-sm text-gardner-gris/65">Cargando…</p>}
            {!cargandoLista && justificantes.length === 0 && (
              <p className="text-sm text-gardner-gris/65">Sin justificantes registrados.</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {justificantes.map((j) => (
                <div
                  key={j.id}
                  className="flex items-start gap-3 rounded-xl border border-gardner-gris/15 p-3.5 transition hover:border-gardner-azul/20"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gardner-azul">
                    <span className="material-symbols-outlined text-[18px] text-white">event_note</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gardner-gris">{formatoFecha(j.fecha)}</p>
                    <p className="text-xs text-gardner-gris/75">
                      {j.motivo || "Sin motivo especificado"} · autorizó {j.autorizadoPor}
                    </p>
                  </div>
                  {puedeEliminar && (
                    <button
                      onClick={() => onEliminar(j.id)}
                      disabled={isPending}
                      className="shrink-0 rounded-full p-1 text-gardner-gris/45 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                      title="Eliminar justificante"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
