"use client";

import { useEffect, useState, useTransition } from "react";
import { obtenerHorarioInstitucionalDocentesAction, guardarHorarioInstitucionalDocentesAction } from "./actions";

export default function HorarioDocentesClient() {
  const [cargando, setCargando] = useState(true);
  const [horaEntrada, setHoraEntrada] = useState("07:00");
  const [minutosTolerancia, setMinutosTolerancia] = useState(0);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const res = await obtenerHorarioInstitucionalDocentesAction();
      if (res.ok && res.data) {
        setHoraEntrada(res.data.horaEntrada);
        setMinutosTolerancia(res.data.minutosTolerancia);
      }
      setCargando(false);
    })();
  }, []);

  function onGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);
    startTransition(async () => {
      const res = await guardarHorarioInstitucionalDocentesAction(horaEntrada, minutosTolerancia);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setGuardado(true);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-xl rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-gardner-gris">Horario institucional (tiempo completo)</h2>
        <p className="mt-1 text-sm text-gardner-gris/70">
          Hora de entrada esperada y minutos de tolerancia para cualquier docente que no tenga un horario propio
          configurado en su ficha. Aplica a la mayoría del personal (tiempo completo).
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
                onChange={(e) => {
                  setHoraEntrada(e.target.value);
                  setGuardado(false);
                }}
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
                onChange={(e) => {
                  setMinutosTolerancia(Number(e.target.value));
                  setGuardado(false);
                }}
                className="w-28 rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-gardner-azul-oscuro px-5 py-2 text-sm font-semibold text-white transition hover:bg-gardner-azul disabled:opacity-60"
            >
              Guardar
            </button>
            {guardado && <span className="text-xs font-semibold text-[var(--color-estado-puntual)]">Guardado</span>}
          </form>
        )}

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="max-w-xl rounded-2xl border border-gardner-azul/15 bg-gardner-azul/5 p-5">
        <p className="flex items-start gap-2 text-sm text-gardner-gris/80">
          <span className="material-symbols-outlined text-[18px] text-gardner-azul-oscuro">info</span>
          Para maestros que trabajan por horas o tienen huecos entre clases, configura su propio horario por bloques
          directamente en su ficha (sección Docentes) — ese horario tiene prioridad sobre este.
        </p>
      </div>
    </div>
  );
}
