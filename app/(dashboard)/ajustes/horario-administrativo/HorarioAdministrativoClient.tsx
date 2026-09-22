"use client";

// Horario del personal administrativo. Mismo patrón que el horario docente,
// pero con hora de salida: aquí sí es una jornada de oficina completa.

import { useEffect, useState, useTransition } from "react";
import { obtenerHorarioAdministrativoAction, guardarHorarioAdministrativoAction } from "./actions";

export default function HorarioAdministrativoClient() {
  const [cargando, setCargando] = useState(true);
  const [horaEntrada, setHoraEntrada] = useState("07:00");
  const [horaSalida, setHoraSalida] = useState("15:00");
  const [minutosTolerancia, setMinutosTolerancia] = useState(5);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const res = await obtenerHorarioAdministrativoAction();
      if (res.ok && res.data) {
        setHoraEntrada(res.data.horaEntrada);
        setHoraSalida(res.data.horaSalida ?? "");
        setMinutosTolerancia(res.data.minutosTolerancia);
      }
      setCargando(false);
    })();
  }, []);

  function tocado<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setGuardado(false);
    };
  }

  function onGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);
    startTransition(async () => {
      const res = await guardarHorarioAdministrativoAction(horaEntrada, horaSalida, minutosTolerancia);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setGuardado(true);
    });
  }

  // La hora límite es lo que de verdad le importa a quien configura esto.
  const limite = (() => {
    if (!horaEntrada) return null;
    const [h, m] = horaEntrada.split(":").map(Number);
    const total = h * 60 + m + minutosTolerancia;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  })();

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-xl rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-gardner-gris">Horario del personal administrativo</h2>
        <p className="mt-1 text-sm text-gardner-gris/70">
          Jornada de oficina y tolerancia de entrada. Aplica a todo el personal administrativo por igual — es
          independiente del horario de docentes.
        </p>

        {cargando ? (
          <p className="mt-6 text-sm text-gardner-gris/60">Cargando…</p>
        ) : (
          <form onSubmit={onGuardar} className="mt-6 flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gardner-gris/70">Hora de entrada</label>
              <input
                type="time"
                required
                value={horaEntrada}
                onChange={(e) => tocado(setHoraEntrada)(e.target.value)}
                className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gardner-gris/70">Hora de salida</label>
              <input
                type="time"
                value={horaSalida}
                onChange={(e) => tocado(setHoraSalida)(e.target.value)}
                className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gardner-gris/70">Minutos de tolerancia</label>
              <input
                type="number"
                min={0}
                max={120}
                value={minutosTolerancia}
                onChange={(e) => tocado(setMinutosTolerancia)(Number(e.target.value))}
                className="w-28 rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-gardner-azul-oscuro px-5 py-2 text-sm font-semibold text-white transition hover:bg-gardner-azul disabled:opacity-60"
            >
              {isPending ? "Guardando…" : "Guardar"}
            </button>
            {guardado && <span className="text-xs font-semibold text-estado-puntual">Guardado</span>}
          </form>
        )}

        {!cargando && limite && (
          <p className="mt-4 text-sm text-gardner-gris/75">
            Quien registre entrada después de las <strong>{limite}</strong> queda marcado como retardo.
          </p>
        )}

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="max-w-xl rounded-2xl border border-gardner-azul/15 bg-gardner-azul/5 p-5">
        <p className="flex items-start gap-2 text-sm text-gardner-gris/80">
          <span className="material-symbols-outlined text-[18px] text-gardner-azul-oscuro">info</span>
          La hora de salida es informativa: sirve de referencia en los reportes, pero el sistema no cierra
          automáticamente la jornada del personal. El cierre automático de las 2:30 solo aplica a alumnos.
        </p>
      </div>
    </div>
  );
}
