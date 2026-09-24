"use client";

// Hora de entrada y tolerancia de los alumnos, por nivel académico.
//
// Cada renglón guarda por su cuenta y aplica a todos los grupos del nivel.

import { useEffect, useState, useTransition } from "react";
import type { HorarioNivel } from "@/lib/horariosNivel";
import { listarHorariosNivelAction, guardarHorarioNivelAction } from "./actions";

export default function HorariosAlumnosClient() {
  const [niveles, setNiveles] = useState<HorarioNivel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const res = await listarHorariosNivelAction();
      if (res.ok) setNiveles(res.data);
      else setError(res.error);
      setCargando(false);
    });
  }, []);

  function editar(nivel: string, campo: "horaEntrada" | "minutosTolerancia", valor: string) {
    setNiveles((prev) =>
      prev.map((n) =>
        n.nivelAcademico === nivel
          ? {
              ...n,
              [campo]: campo === "minutosTolerancia" ? Number(valor.replace(/\D/g, "")) || 0 : valor,
            }
          : n
      )
    );
  }

  function guardar(n: HorarioNivel) {
    setGuardando(n.nivelAcademico);
    setError(null);
    setAviso(null);
    startTransition(async () => {
      const res = await guardarHorarioNivelAction(
        n.nivelAcademico,
        n.horaEntrada,
        n.minutosTolerancia
      );
      if (res.ok) {
        setAviso(
          `${n.nivelAcademico}: entrada ${n.horaEntrada} con ${n.minutosTolerancia} min de tolerancia, aplicado a ${res.data.grupos} grupos.`
        );
        setNiveles((prev) =>
          prev.map((x) =>
            x.nivelAcademico === n.nivelAcademico ? { ...x, mixto: false, gruposSinHorario: 0 } : x
          )
        );
      } else setError(res.error);
      setGuardando(null);
    });
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gardner-gris">Horario de alumnos por nivel</h3>
      <p className="mt-1 text-xs text-gardner-gris/70">
        La hora de entrada y los minutos de tolerancia con los que el sistema decide si una llegada es
        puntual o retardo. Se aplican a todos los grupos del nivel.
      </p>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
      )}
      {aviso && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {aviso}
        </p>
      )}

      {cargando ? (
        <p className="mt-4 text-sm text-gardner-gris/65">Cargando…</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {niveles.map((n) => (
            <div
              key={n.nivelAcademico}
              className="flex flex-wrap items-end gap-3 rounded-xl border border-gardner-gris/12 p-3"
            >
              <div className="min-w-[150px] flex-1">
                <p className="text-sm font-semibold text-gardner-gris">{n.nivelAcademico}</p>
                <p className="text-xs text-gardner-gris/60">
                  {n.grupos} {n.grupos === 1 ? "grupo" : "grupos"}
                  {n.mixto && (
                    <span className="ml-1 font-semibold text-estado-retardo">
                      · horarios distintos entre grupos
                    </span>
                  )}
                  {n.gruposSinHorario > 0 && (
                    <span className="ml-1 font-semibold text-red-600">
                      · {n.gruposSinHorario} sin horario (nunca marcan retardo)
                    </span>
                  )}
                </p>
              </div>

              <label className="flex flex-col text-xs font-semibold text-gardner-gris/70">
                Entrada
                <input
                  type="time"
                  value={n.horaEntrada}
                  onChange={(e) => editar(n.nivelAcademico, "horaEntrada", e.target.value)}
                  className="mt-1 rounded-xl border border-gardner-gris/20 bg-white px-3 py-2 text-sm font-medium text-gardner-gris"
                />
              </label>

              <label className="flex flex-col text-xs font-semibold text-gardner-gris/70">
                Tolerancia (min)
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={n.minutosTolerancia}
                  onChange={(e) => editar(n.nivelAcademico, "minutosTolerancia", e.target.value)}
                  className="mt-1 w-28 rounded-xl border border-gardner-gris/20 bg-white px-3 py-2 text-sm font-medium text-gardner-gris"
                />
              </label>

              <button
                onClick={() => guardar(n)}
                disabled={guardando === n.nivelAcademico}
                className="rounded-xl bg-gardner-azul px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gardner-azul-oscuro disabled:opacity-50"
              >
                {guardando === n.nivelAcademico ? "Guardando…" : "Guardar"}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-gardner-gris/55">
        Con tolerancia en 0, un alumno que pasa su credencial un minuto después de la hora ya cuenta
        como retardo. Los cambios aplican a los escaneos siguientes; no modifican los registros ya
        guardados.
      </p>
    </div>
  );
}
