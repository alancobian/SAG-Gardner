"use client";

// Gráficas de asistencia por nivel, grado y grupo, con rango de fechas libre.
// Pensadas para armar el reporte mensual a Dirección: cada una se descarga como
// PNG lista para pegar en el deck.

import { useCallback, useEffect, useState, useTransition } from "react";
import { COBERTURA_MINIMA_DEL_DIA, type Analitica, type FilaAnalitica } from "@/lib/analitica";
import { obtenerAnaliticaAction } from "./actions";
import GraficaBarras, { SERIES } from "./GraficaBarras";

// En promedio por día no existe "sin registro": esos días quedaron fuera del
// divisor, no aportan una barra gris.
const SERIES_PROMEDIO = SERIES.filter((s) => s.clave !== "sinRegistro");

const MODOS = [
  { clave: "totales" as const, etiqueta: "Totales del periodo" },
  { clave: "promedio" as const, etiqueta: "Promedio por día" },
];

/**
 * Convierte una fila de totales acumulados en una fila de promedios diarios,
 * para poder reutilizar la misma gráfica y la misma tabla.
 */
function aPromedio(f: FilaAnalitica): FilaAnalitica {
  return {
    ...f,
    puntual: f.promedio?.puntual ?? 0,
    retardo: f.promedio?.retardo ?? 0,
    falta: f.promedio?.falta ?? 0,
    sinRegistro: 0,
  };
}

const num = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 1 });

const CORTES = [
  { clave: "porNivel" as const, etiqueta: "Por nivel", icono: "school" },
  { clave: "porGrado" as const, etiqueta: "Por grado", icono: "stairs" },
  { clave: "porGrupo" as const, etiqueta: "Por grupo", icono: "groups" },
];

export default function GraficasClient({
  desdeInicial,
  hastaInicial,
}: {
  desdeInicial: string;
  hastaInicial: string;
}) {
  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);
  const [datos, setDatos] = useState<Analitica | null>(null);
  const [corte, setCorte] = useState<(typeof CORTES)[number]["clave"]>("porNivel");
  const [modo, setModo] = useState<(typeof MODOS)[number]["clave"]>("totales");
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

  const esPromedio = modo === "promedio";
  const base = datos ? datos[corte] : [];
  const filas = esPromedio ? base.map(aPromedio) : base;
  const t = datos?.totales;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gardner-gris">Gráficas de asistencia</h2>
          <p className="mt-1 text-xs text-gardner-gris/70">
            Elige el periodo y descarga cada gráfica para tu reporte mensual.
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
            {cargando ? "Generando…" : "Generar"}
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {t && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { etiqueta: "Días de clase", valor: datos!.diasLectivos, color: "text-gardner-azul" },
            {
              etiqueta: esPromedio ? "Puntuales por día" : "Puntuales",
              valor: num(esPromedio ? t.promedio?.puntual ?? 0 : t.puntual),
              color: "text-estado-puntual",
            },
            {
              etiqueta: esPromedio ? "Retardos por día" : "Retardos",
              valor: num(esPromedio ? t.promedio?.retardo ?? 0 : t.retardo),
              color: "text-estado-retardo",
            },
            {
              etiqueta: esPromedio ? "Faltas por día" : "Faltas",
              valor: num(esPromedio ? t.promedio?.falta ?? 0 : t.falta),
              color: "text-red-600",
            },
            esPromedio
              ? {
                  etiqueta: "Días medidos",
                  valor: `${t.diasMedidos} de ${datos!.diasLectivos}`,
                  color: "text-gardner-gris/70",
                }
              : {
                  etiqueta: "Sin registro",
                  valor: num(t.sinRegistro),
                  color: "text-gardner-gris/60",
                },
          ].map((c) => (
            <div key={c.etiqueta} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className={`text-2xl font-bold ${c.color}`}>{c.valor}</p>
              <p className="mt-0.5 text-xs font-semibold text-gardner-gris/70">{c.etiqueta}</p>
            </div>
          ))}
        </div>
      )}

      {t && t.sinRegistro > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-estado-retardo/30 bg-estado-retardo/10 px-4 py-3">
          <span className="material-symbols-outlined mt-0.5 text-[20px] text-estado-retardo">info</span>
          <p className="text-sm font-medium text-gardner-gris/85">
            <strong>{t.sinRegistro.toLocaleString("es-MX")} de {t.posibles.toLocaleString("es-MX")}</strong>{" "}
            días-alumno del periodo quedaron sin medir — días en que menos de la mitad del grupo registró su
            entrada. Esos <strong>no cuentan como faltas</strong>: no se puede saber si el alumno vino o si
            simplemente no se escaneó. Los porcentajes se calculan solo sobre los días medidos.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-2xl bg-white p-1.5 shadow-sm">
          {MODOS.map((m) => (
            <button
              key={m.clave}
              onClick={() => setModo(m.clave)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                modo === m.clave
                  ? "bg-gardner-gris text-white shadow-sm"
                  : "text-gardner-gris/80 hover:bg-gardner-gris/10"
              }`}
            >
              {m.etiqueta}
            </button>
          ))}
        </div>
        <p className="text-xs text-gardner-gris/65">
          {esPromedio
            ? "Cuántos alumnos, en promedio, llegaron a tiempo, llegaron tarde o faltaron en un día de clase medido."
            : "Suma de días-alumno de todo el periodo."}
        </p>
      </div>

      <div className="flex gap-1 self-start rounded-2xl bg-white p-1.5 shadow-sm">
        {CORTES.map((c) => (
          <button
            key={c.clave}
            onClick={() => setCorte(c.clave)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              corte === c.clave
                ? "bg-gardner-azul text-white shadow-sm"
                : "text-gardner-gris/80 hover:bg-gardner-azul/10 hover:text-gardner-azul-oscuro"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{c.icono}</span>
            {c.etiqueta}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-sm text-gardner-gris/65">Generando gráficas…</p>
      ) : !datos || datos.diasLectivos === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm font-medium text-gardner-gris/60 shadow-sm">
          No hay días lectivos en el rango seleccionado.
        </p>
      ) : (
        <>
          <GraficaBarras
            titulo={`${esPromedio ? "Promedio diario de alumnos" : "Asistencia"} ${CORTES.find(
              (c) => c.clave === corte
            )!.etiqueta.toLowerCase()}`}
            filas={filas}
            desde={datos.desde}
            hasta={datos.hasta}
            diasLectivos={datos.diasLectivos}
            mostrarNivel={corte !== "porNivel"}
            series={esPromedio ? SERIES_PROMEDIO : SERIES}
            referencia={esPromedio ? (f) => f.alumnos : (f) => f.posibles}
            nota={
              esPromedio
                ? "Alumnos por día de clase medido. La barra completa equivale a la matrícula del corte."
                : undefined
            }
          />

          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-gardner-gris/10 bg-gardner-neutro text-xs font-semibold text-gardner-gris/70">
                <tr>
                  <th className="px-4 py-3 text-left">
                    {CORTES.find((c) => c.clave === corte)!.etiqueta.replace("Por ", "")}
                  </th>
                  <th className="px-4 py-3 text-center">Alumnos</th>
                  <th className="px-4 py-3 text-center">Días medidos</th>
                  {(esPromedio ? SERIES_PROMEDIO : SERIES).map((s) => (
                    <th key={s.clave} className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.etiqueta}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center">Asistencia</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.clave} className="border-b border-gardner-gris/5 last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gardner-gris">{f.etiqueta}</span>
                      {corte !== "porNivel" && (
                        <span className="block text-xs text-gardner-gris/55">{f.nivelAcademico}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gardner-gris/75">{f.alumnos}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-semibold ${
                          f.diasMedidos === datos!.diasLectivos
                            ? "text-gardner-gris"
                            : "text-estado-retardo"
                        }`}
                      >
                        {f.diasMedidos}
                      </span>
                      <span className="text-gardner-gris/55"> de {datos!.diasLectivos}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-estado-puntual">
                      {num(f.puntual)}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-estado-retardo">
                      {num(f.retardo)}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-red-600">{num(f.falta)}</td>
                    {!esPromedio && (
                      <td className="px-4 py-3 text-center font-medium text-gardner-gris/50">
                        {num(f.sinRegistro)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      {f.porcentajeAsistencia === null ? (
                        <span className="text-xs font-semibold text-gardner-gris/40">sin datos</span>
                      ) : (
                        <span className="text-base font-bold text-gardner-gris">
                          {f.porcentajeAsistencia}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] leading-relaxed text-gardner-gris/55">
            Un día cuenta como medido para un grupo cuando al menos el {COBERTURA_MINIMA_DEL_DIA}% de sus
            alumnos registró entrada. Por debajo de eso, la ausencia de registro se atribuye al escaneo y no al
            alumno, y el día entra en &ldquo;Sin registro&rdquo;. Se excluyen fines de semana y los días marcados
            como no lectivos en el calendario escolar.
          </p>
        </>
      )}
    </div>
  );
}
