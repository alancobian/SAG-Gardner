"use client";

// Ranking de grupos en un rango de fechas: quién falta más, quién llega tarde
// más y quién asiste mejor.
//
// A diferencia de la pantalla de Gráficas, aquí no se desglosa el dato: se
// ordena. La pregunta que contesta no es "cómo estuvo el periodo" sino
// "a quién le hablo primero".

import { useCallback, useEffect, useState, useTransition } from "react";
import type { Analitica, FilaAnalitica } from "@/lib/analitica";
import { obtenerAnaliticaAction } from "../graficas/actions";

const CORTES = [
  { clave: "porGrupo" as const, etiqueta: "Grupo" },
  { clave: "porGrado" as const, etiqueta: "Grado" },
  { clave: "porNivel" as const, etiqueta: "Nivel" },
];

type Metrica = {
  clave: "falta" | "retardo" | "asistencia";
  titulo: string;
  icono: string;
  color: string;
  fondo: string;
  /** Clase literal: Tailwind no compila clases armadas en tiempo de ejecución. */
  barra: string;
  /** Qué se ordena. */
  valor: (f: Fila) => number;
  /** Cómo se lee el número grande. */
  formato: (f: Fila) => string;
  /** Renglón chico debajo del número. */
  detalle: (f: Fila) => string;
};

/** Fila con las faltas ya ajustadas según el interruptor. */
type Fila = FilaAnalitica & { faltaAjustada: number; asistencias: number; porcentaje: number };

const pct = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0);

const METRICAS: Metrica[] = [
  {
    clave: "falta",
    titulo: "Más faltas",
    icono: "person_off",
    color: "text-red-600",
    fondo: "bg-red-50",
    barra: "bg-red-500",
    valor: (f) => f.faltaAjustada,
    formato: (f) => f.faltaAjustada.toLocaleString("es-MX"),
    detalle: (f) => `${pct(f.faltaAjustada, f.posibles)}% de sus días-alumno`,
  },
  {
    clave: "retardo",
    titulo: "Más retardos",
    icono: "schedule",
    color: "text-estado-retardo",
    fondo: "bg-amber-50",
    barra: "bg-estado-retardo",
    valor: (f) => f.retardo,
    formato: (f) => f.retardo.toLocaleString("es-MX"),
    detalle: (f) => `${pct(f.retardo, f.asistencias || 1)}% de sus llegadas`,
  },
  {
    clave: "asistencia",
    titulo: "Mejor asistencia",
    icono: "verified",
    color: "text-estado-puntual",
    fondo: "bg-emerald-50",
    barra: "bg-estado-puntual",
    valor: (f) => f.porcentaje,
    formato: (f) => `${f.porcentaje}%`,
    detalle: (f) => `${f.asistencias.toLocaleString("es-MX")} asistencias registradas`,
  },
];

export default function RankingClient({
  desdeInicial,
  hastaInicial,
}: {
  desdeInicial: string;
  hastaInicial: string;
}) {
  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);
  const [datos, setDatos] = useState<Analitica | null>(null);
  const [corte, setCorte] = useState<(typeof CORTES)[number]["clave"]>("porGrupo");
  const [contarSinRegistro, setContarSinRegistro] = useState(false);
  const [orden, setOrden] = useState<Metrica["clave"]>("falta");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [, startTransition] = useTransition();

  const cargar = useCallback((d: string, h: string) => {
    setCargando(true);
    setError(null);
    startTransition(async () => {
      const res = await obtenerAnaliticaAction(d, h);
      if (res.ok) setDatos(res.data);
      else {
        setError(res.error);
        setDatos(null);
      }
      setCargando(false);
    });
  }, []);

  useEffect(() => {
    cargar(desdeInicial, hastaInicial);
  }, [cargar, desdeInicial, hastaInicial]);

  const filas: Fila[] = (datos ? datos[corte] : []).map((f) => {
    // El interruptor decide si los días que el grupo no registró se suman a las
    // faltas. Cambia bastante el orden, por eso está a la vista y no escondido.
    const faltaAjustada = contarSinRegistro ? f.falta + f.sinRegistro : f.falta;
    const asistencias = f.puntual + f.retardo;
    return {
      ...f,
      faltaAjustada,
      asistencias,
      porcentaje: pct(asistencias, asistencias + faltaAjustada),
    };
  });

  const metricaOrden = METRICAS.find((m) => m.clave === orden)!;
  const tabla = [...filas].sort((a, b) => metricaOrden.valor(b) - metricaOrden.valor(a));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gardner-gris">Ranking de grupos</h2>
          <p className="mt-1 text-xs text-gardner-gris/70">
            Quién acumula más faltas, más retardos y mejor asistencia en el periodo que elijas.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
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
            onClick={() => cargar(desde, hasta)}
            disabled={cargando}
            className="rounded-xl bg-gardner-azul px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gardner-azul-oscuro disabled:opacity-50"
          >
            {cargando ? "Calculando…" : "Calcular"}
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-2xl bg-white p-1.5 shadow-sm">
          {CORTES.map((c) => (
            <button
              key={c.clave}
              onClick={() => setCorte(c.clave)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                corte === c.clave
                  ? "bg-gardner-azul text-white shadow-sm"
                  : "text-gardner-gris/80 hover:bg-gardner-azul/10 hover:text-gardner-azul-oscuro"
              }`}
            >
              Por {c.etiqueta.toLowerCase()}
            </button>
          ))}
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-gardner-gris/85 shadow-sm">
          <input
            type="checkbox"
            checked={contarSinRegistro}
            onChange={(e) => setContarSinRegistro(e.target.checked)}
            className="h-4 w-4 accent-gardner-azul"
          />
          Contar como falta los días sin registro
        </label>
      </div>

      {cargando ? (
        <p className="text-sm text-gardner-gris/65">Calculando…</p>
      ) : !datos || filas.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm font-medium text-gardner-gris/60 shadow-sm">
          No hay días lectivos en el rango seleccionado.
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {METRICAS.map((m) => {
              const top = [...filas].sort((a, b) => m.valor(b) - m.valor(a)).slice(0, 5);
              const tope = Math.max(1, m.valor(top[0]));
              return (
                <div key={m.clave} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl ${m.fondo} ${m.color}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{m.icono}</span>
                    </span>
                    <h3 className="text-sm font-bold text-gardner-gris">{m.titulo}</h3>
                  </div>

                  <ol className="flex flex-col gap-2.5">
                    {top.map((f, i) => (
                      <li key={f.clave}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-gardner-gris">
                            <span className="mr-1.5 text-xs font-bold text-gardner-gris/40">
                              {i + 1}.
                            </span>
                            {f.etiqueta}
                            {corte !== "porNivel" && (
                              <span className="ml-1.5 text-xs font-normal text-gardner-gris/50">
                                {f.nivelAcademico}
                              </span>
                            )}
                          </span>
                          <span className={`shrink-0 text-base font-bold ${m.color}`}>
                            {m.formato(f)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gardner-gris/10">
                          <div
                            className={`h-full rounded-full ${m.barra}`}
                            style={{ width: `${(m.valor(f) / tope) * 100}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-[11px] text-gardner-gris/55">{m.detalle(f)}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>

          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-gardner-gris/10 bg-gardner-neutro text-xs font-semibold text-gardner-gris/70">
                <tr>
                  <th className="px-4 py-3 text-left">
                    {CORTES.find((c) => c.clave === corte)!.etiqueta}
                  </th>
                  <th className="px-4 py-3 text-center">Alumnos</th>
                  {METRICAS.map((m) => (
                    <th key={m.clave} className="px-4 py-3 text-center">
                      <button
                        onClick={() => setOrden(m.clave)}
                        className={`inline-flex items-center gap-1 transition hover:text-gardner-azul-oscuro ${
                          orden === m.clave ? "text-gardner-azul-oscuro" : ""
                        }`}
                      >
                        {m.clave === "asistencia" ? "Asistencia" : m.titulo.replace("Más ", "")}
                        <span className="material-symbols-outlined text-[14px]">
                          {orden === m.clave ? "arrow_downward" : "unfold_more"}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabla.map((f) => (
                  <tr key={f.clave} className="border-b border-gardner-gris/5 last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gardner-gris">{f.etiqueta}</span>
                      {corte !== "porNivel" && (
                        <span className="block text-xs text-gardner-gris/55">{f.nivelAcademico}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gardner-gris/75">{f.alumnos}</td>
                    <td className="px-4 py-3 text-center font-semibold text-red-600">
                      {f.faltaAjustada.toLocaleString("es-MX")}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-estado-retardo">
                      {f.retardo.toLocaleString("es-MX")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-base font-bold text-gardner-gris">{f.porcentaje}%</span>
                      <span className="block text-xs text-gardner-gris/55">
                        {f.asistencias.toLocaleString("es-MX")} asistencias
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] leading-relaxed text-gardner-gris/55">
            Del {datos.desde} al {datos.hasta} · {datos.diasLectivos} días de clase. Se excluyen fines de
            semana y los días marcados como no lectivos en el calendario escolar.
            {contarSinRegistro
              ? " Los días sin registro se están contando como falta."
              : " Los días sin registro no se cuentan como falta; actívalo arriba si quieres incluirlos."}
          </p>
        </>
      )}
    </div>
  );
}
