"use client";

// Días en que los docentes entran a otra hora: CTE, juntas, capacitaciones.

import { useEffect, useState, useTransition } from "react";
import type { DiaEspecial } from "@/lib/diasEspeciales";
import {
  listarDiasEspecialesAction,
  guardarDiaEspecialAction,
  quitarDiaEspecialAction,
} from "./actions";

const MOTIVOS = ["CTE", "Junta", "Capacitación", "Consejo Técnico", "Evento"];

const fechaLarga = (f: string) =>
  new Date(`${f}T12:00:00`).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function DiasEspecialesClient() {
  const [dias, setDias] = useState<DiaEspecial[]>([]);
  const [fecha, setFecha] = useState("");
  const [tipoDia, setTipoDia] = useState(MOTIVOS[0]);
  const [horaEntrada, setHoraEntrada] = useState("08:00");
  const [tolerancia, setTolerancia] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const res = await listarDiasEspecialesAction();
      if (res.ok) setDias(res.data);
      else setError(res.error);
      setCargando(false);
    });
  }, []);

  function agregar() {
    if (!fecha) {
      setError("Elige la fecha");
      return;
    }
    setGuardando(true);
    setError(null);
    startTransition(async () => {
      const res = await guardarDiaEspecialAction({
        fecha,
        tipoDia,
        horaEntrada,
        minutosTolerancia: tolerancia,
      });
      if (res.ok) {
        setDias(res.data);
        setFecha("");
      } else setError(res.error);
      setGuardando(false);
    });
  }

  function quitar(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await quitarDiaEspecialAction(id);
      if (res.ok) setDias(res.data);
      else setError(res.error);
    });
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gardner-gris">Días con horario especial de docentes</h3>
      <p className="mt-1 text-xs text-gardner-gris/70">
        Para los días de CTE y similares, en que los alumnos no tienen clase pero los docentes sí
        asisten a otra hora.
      </p>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-gardner-gris/12 p-3">
        <label className="flex flex-col text-xs font-semibold text-gardner-gris/70">
          Fecha
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 rounded-xl border border-gardner-gris/20 bg-white px-3 py-2 text-sm font-medium text-gardner-gris"
          />
        </label>
        <label className="flex flex-col text-xs font-semibold text-gardner-gris/70">
          Motivo
          <select
            value={tipoDia}
            onChange={(e) => setTipoDia(e.target.value)}
            className="mt-1 rounded-xl border border-gardner-gris/20 bg-white px-3 py-2 text-sm font-medium text-gardner-gris"
          >
            {MOTIVOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs font-semibold text-gardner-gris/70">
          Entrada docentes
          <input
            type="time"
            value={horaEntrada}
            onChange={(e) => setHoraEntrada(e.target.value)}
            className="mt-1 rounded-xl border border-gardner-gris/20 bg-white px-3 py-2 text-sm font-medium text-gardner-gris"
          />
        </label>
        <label className="flex flex-col text-xs font-semibold text-gardner-gris/70">
          Tolerancia (min)
          <input
            type="number"
            min={0}
            max={120}
            value={tolerancia}
            onChange={(e) => setTolerancia(Number(e.target.value.replace(/\D/g, "")) || 0)}
            className="mt-1 w-28 rounded-xl border border-gardner-gris/20 bg-white px-3 py-2 text-sm font-medium text-gardner-gris"
          />
        </label>
        <button
          onClick={agregar}
          disabled={guardando}
          className="rounded-xl bg-gardner-azul px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gardner-azul-oscuro disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Agregar día"}
        </button>
      </div>

      {cargando ? (
        <p className="mt-4 text-sm text-gardner-gris/65">Cargando…</p>
      ) : dias.length === 0 ? (
        <p className="mt-4 rounded-xl bg-gardner-neutro px-4 py-6 text-center text-sm font-medium text-gardner-gris/55">
          Todavía no hay días con horario especial.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {dias.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gardner-gris/12 px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-semibold text-gardner-gris">
                  {d.tipoDia} · {fechaLarga(d.fecha)}
                </p>
                <p className="text-xs text-gardner-gris/60">
                  Entrada de docentes {d.horaEntrada}
                  {d.minutosTolerancia > 0 && ` con ${d.minutosTolerancia} min de tolerancia`} · los
                  alumnos no tienen clase
                </p>
              </div>
              <button
                onClick={() => quitar(d.id)}
                className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                Quitar horario
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-gardner-gris/55">
        Al poner horario especial, el día queda marcado como no lectivo para alumnos y sí laborable
        para docentes, que es lo que corresponde a un CTE. &ldquo;Quitar horario&rdquo; lo devuelve a
        día no laborable normal, sin borrarlo del calendario.
      </p>
    </div>
  );
}
