"use client";

// Balance de un grupo: el reporte que se le entrega al docente titular.
//
// Toda la pantalla gira alrededor de una sola cifra anunciada arriba —los días
// hábiles del rango— y de tres columnas que siempre suman esa cifra: llegó a
// tiempo, llegó tarde, faltó. Sin porcentajes escondidos y sin denominadores
// distintos por alumno.

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { Grupo } from "@/lib/grupos";
import type { BalanceGrupo, AlumnoBalance } from "@/lib/balanceGrupo";
import { obtenerBalanceGrupoAction } from "./actions";

/** A partir de cuántas faltas se marca al alumno para darle seguimiento. */
const FALTAS_PARA_ATENCION = 3;

const fechaCorta = (f: string) =>
  new Date(`${f}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

export default function BalanceClient({
  grupos,
  desdeInicial,
  hastaInicial,
}: {
  grupos: Grupo[];
  desdeInicial: string;
  hastaInicial: string;
}) {
  const [grupoId, setGrupoId] = useState(grupos[0]?.id ?? "");
  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);
  const [datos, setDatos] = useState<BalanceGrupo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const grupo = grupos.find((g) => g.id === grupoId);

  // Los grupos van agrupados por nivel en el desplegable: hay nombres que se
  // repiten entre niveles y sin el encabezado no se distinguen.
  const porNivel = useMemo(() => {
    const mapa = new Map<string, Grupo[]>();
    for (const g of grupos) {
      const lista = mapa.get(g.nivelAcademico);
      if (lista) lista.push(g);
      else mapa.set(g.nivelAcademico, [g]);
    }
    return [...mapa];
  }, [grupos]);

  const cargar = useCallback((id: string, d: string, h: string) => {
    if (!id) return;
    setCargando(true);
    setError(null);
    setAbierto(null);
    startTransition(async () => {
      const res = await obtenerBalanceGrupoAction(id, d, h);
      if (res.ok) setDatos(res.data);
      else {
        setError(res.error);
        setDatos(null);
      }
      setCargando(false);
    });
  }, []);

  useEffect(() => {
    cargar(grupos[0]?.id ?? "", desdeInicial, hastaInicial);
  }, [cargar, grupos, desdeInicial, hastaInicial]);

  function descargarCsv() {
    if (!datos || !grupo) return;
    const lineas = [
      `Balance de asistencia - ${grupo.nombre} (${grupo.nivelAcademico})`,
      `Del ${datos.desde} al ${datos.hasta};${datos.diasHabiles} dias habiles`,
      "",
      "Alumno;Llego a tiempo;Llego tarde;Falto;Faltas justificadas;% asistencia",
      ...datos.alumnos.map((a) =>
        [
          a.nombre.replace(/;/g, ","),
          a.puntuales,
          a.retardos,
          a.faltas,
          a.faltasJustificadas,
          `${a.porcentajeAsistencia}%`,
        ].join(";")
      ),
    ];
    const blob = new Blob([`﻿${lineas.join("\n")}`], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `SAG-balance-${grupo.nombre.replace(/[^a-zA-Z0-9]+/g, "-")}-${datos.desde}-a-${datos.hasta}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const t = datos?.totales;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-bold text-gardner-gris">Balance por grupo</h2>
        <p className="mt-1 text-xs text-gardner-gris/70">
          De los días hábiles del periodo: cuántos llegó a tiempo cada alumno, cuántos con retardo y
          cuántos faltó.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <label className="flex min-w-[220px] flex-1 flex-col text-xs font-semibold text-gardner-gris/70">
          Grupo
          <select
            value={grupoId}
            onChange={(e) => {
              setGrupoId(e.target.value);
              cargar(e.target.value, desde, hasta);
            }}
            className="mt-1 rounded-xl border border-gardner-gris/20 bg-white px-3 py-2 text-sm font-medium text-gardner-gris"
          >
            {porNivel.map(([nivel, lista]) => (
              <optgroup key={nivel} label={nivel}>
                {lista.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs font-semibold text-gardner-gris/70">
          Desde
          <input
            type="date"
            value={desde}
            max={hasta}
            onChange={(e) => setDesde(e.target.value)}
            className="mt-1 rounded-xl border border-gardner-gris/20 bg-white px-3 py-2 text-sm font-medium text-gardner-gris"
          />
        </label>
        <label className="flex flex-col text-xs font-semibold text-gardner-gris/70">
          Hasta
          <input
            type="date"
            value={hasta}
            min={desde}
            onChange={(e) => setHasta(e.target.value)}
            className="mt-1 rounded-xl border border-gardner-gris/20 bg-white px-3 py-2 text-sm font-medium text-gardner-gris"
          />
        </label>
        <button
          onClick={() => cargar(grupoId, desde, hasta)}
          disabled={cargando}
          className="rounded-xl bg-gardner-azul px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gardner-azul-oscuro disabled:opacity-50"
        >
          {cargando ? "Calculando…" : "Calcular"}
        </button>
        {datos && (
          <button
            onClick={descargarCsv}
            className="flex items-center gap-1.5 rounded-xl border border-gardner-azul/30 px-4 py-2 text-sm font-semibold text-gardner-azul-oscuro transition hover:bg-gardner-azul/10"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            CSV para el tutor
          </button>
        )}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {cargando ? (
        <p className="text-sm text-gardner-gris/65">Calculando…</p>
      ) : !datos || !t ? null : datos.diasHabiles === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm font-medium text-gardner-gris/60 shadow-sm">
          No hay días hábiles en el rango seleccionado.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              {
                etiqueta: "Días hábiles",
                valor: datos.diasHabiles,
                pie: `${datos.diasConRegistro} con registro`,
                color: "text-gardner-azul",
              },
              {
                etiqueta: "Llegadas a tiempo",
                valor: t.puntuales,
                pie: `${t.alumnos} alumnos en el grupo`,
                color: "text-estado-puntual",
              },
              { etiqueta: "Retardos", valor: t.retardos, pie: "en todo el periodo", color: "text-estado-retardo" },
              {
                etiqueta: "Faltas",
                valor: t.faltas,
                pie: `${t.faltasJustificadas} justificadas`,
                color: "text-red-600",
              },
              {
                etiqueta: "Asistencia del grupo",
                valor: `${t.porcentajeAsistencia}%`,
                pie: "sobre los días hábiles",
                color: "text-gardner-gris",
              },
            ].map((c) => (
              <div key={c.etiqueta} className="rounded-2xl bg-white p-4 shadow-sm">
                <p className={`text-2xl font-bold ${c.color}`}>
                  {typeof c.valor === "number" ? c.valor.toLocaleString("es-MX") : c.valor}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-gardner-gris/70">{c.etiqueta}</p>
                <p className="mt-0.5 text-[11px] text-gardner-gris/50">{c.pie}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="border-b border-gardner-gris/10 bg-gardner-neutro text-xs font-semibold text-gardner-gris/70">
                  <tr>
                    <th className="px-4 py-3 text-left">Alumno</th>
                    <th className="px-4 py-3 text-center">Llegó a tiempo</th>
                    <th className="px-4 py-3 text-center">Llegó tarde</th>
                    <th className="px-4 py-3 text-center">Faltó</th>
                    <th className="px-4 py-3 text-center">Asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.alumnos.map((a) => (
                    <FilaAlumno
                      key={a.id}
                      alumno={a}
                      diasHabiles={datos.diasHabiles}
                      abierto={abierto === a.id}
                      alAbrir={() => setAbierto(abierto === a.id ? null : a.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-gardner-gris/55">
            Para cada alumno, las tres columnas suman los {datos.diasHabiles} días hábiles del periodo.
            Se excluyen fines de semana y los días marcados como no lectivos en el calendario escolar.
            {datos.diasConRegistro < datos.diasHabiles && (
              <>
                {" "}
                Este grupo registró entrada en {datos.diasConRegistro} de esos {datos.diasHabiles} días;
                los {datos.diasHabiles - datos.diasConRegistro} restantes aparecen como falta para todo el
                grupo.
              </>
            )}{" "}
            Toca un alumno para ver las fechas exactas.
          </p>
        </>
      )}
    </div>
  );
}

function FilaAlumno({
  alumno,
  diasHabiles,
  abierto,
  alAbrir,
}: {
  alumno: AlumnoBalance;
  diasHabiles: number;
  abierto: boolean;
  alAbrir: () => void;
}) {
  const atencion = alumno.faltas >= FALTAS_PARA_ATENCION;
  return (
    <>
      <tr
        onClick={alAbrir}
        className="cursor-pointer border-b border-gardner-gris/5 transition last:border-0 hover:bg-gardner-azul/5"
      >
        <td className="px-4 py-3">
          <span className="flex items-center gap-2">
            {atencion && (
              <span
                className="material-symbols-outlined text-[18px] text-red-500"
                title={`${alumno.faltas} faltas en el periodo`}
              >
                flag
              </span>
            )}
            <span className="font-semibold text-gardner-gris">{alumno.nombre}</span>
          </span>
        </td>
        <td className="px-4 py-3 text-center font-semibold text-estado-puntual">{alumno.puntuales}</td>
        <td className="px-4 py-3 text-center font-semibold text-estado-retardo">{alumno.retardos}</td>
        <td className="px-4 py-3 text-center">
          <span className="font-semibold text-red-600">{alumno.faltas}</span>
          {alumno.faltasJustificadas > 0 && (
            <span className="block text-[11px] text-gardner-gris/55">
              {alumno.faltasJustificadas} justificadas
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-base font-bold text-gardner-gris">{alumno.porcentajeAsistencia}%</span>
          <span className="block text-[11px] text-gardner-gris/50">de {diasHabiles} días</span>
        </td>
      </tr>
      {abierto && (
        <tr className="border-b border-gardner-gris/5 bg-gardner-neutro/60">
          <td colSpan={5} className="px-4 py-3">
            <div className="flex flex-col gap-2 text-xs">
              <Fechas titulo="Retardos" fechas={alumno.fechasRetardo} color="bg-estado-retardo/15 text-estado-retardo" />
              <Fechas titulo="Faltas" fechas={alumno.fechasFalta} color="bg-red-100 text-red-700" />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Fechas({ titulo, fechas, color }: { titulo: string; fechas: string[]; color: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-16 shrink-0 font-semibold text-gardner-gris/70">{titulo}</span>
      {fechas.length === 0 ? (
        <span className="text-gardner-gris/45">ninguno</span>
      ) : (
        fechas.map((f) => (
          <span key={f} className={`rounded-lg px-2 py-0.5 font-medium ${color}`}>
            {fechaCorta(f)}
          </span>
        ))
      )}
    </div>
  );
}
