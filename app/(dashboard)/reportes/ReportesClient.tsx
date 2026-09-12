"use client";

// Reportes: asistencia acumulada por alumno en un rango de fechas.
//
// La sección Asistencia responde "¿quién faltó hoy?" (la pregunta de
// prefectura). Ésta responde "¿quién lleva muchas faltas?", que es la que le
// importa a Dirección, porque la inasistencia acumulada suele anteceder a una
// baja. Por eso la tabla abre ordenada de peor a mejor asistencia: lo que hay
// que atender queda arriba sin que nadie toque un filtro.

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { AlumnoAcumulado, ReporteAcumulado } from "@/lib/acumulados";
import { obtenerReporteAcumuladoAction } from "./actions";

/** A partir de aquí un alumno se considera en riesgo. */
const UMBRAL_RIESGO = 85;

type Columna = "nombre" | "grupo" | "ausenciasSinJustificar" | "retardos" | "porcentajeAsistencia";

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatoFecha(fecha: string) {
  try {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return fecha;
  }
}

/** Verde / ámbar / rojo según qué tan lejos está del umbral. */
function colorAsistencia(pct: number | null) {
  if (pct === null) return "text-gardner-gris/40";
  if (pct >= UMBRAL_RIESGO) return "text-estado-puntual";
  if (pct >= 70) return "text-estado-retardo";
  return "text-red-600";
}

export default function ReportesClient({
  desdeInicial,
  hastaInicial,
  alcance,
}: {
  desdeInicial: string;
  hastaInicial: string;
  alcance: string;
}) {
  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);
  const [reporte, setReporte] = useState<ReporteAcumulado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [, startTransition] = useTransition();

  const [nivel, setNivel] = useState("");
  const [grupo, setGrupo] = useState("");
  const [termino, setTermino] = useState("");
  const [soloRiesgo, setSoloRiesgo] = useState(false);
  const [orden, setOrden] = useState<Columna>("porcentajeAsistencia");
  const [asc, setAsc] = useState(true);

  const cargar = useCallback((d: string, h: string) => {
    setCargando(true);
    setError(null);
    startTransition(async () => {
      const res = await obtenerReporteAcumuladoAction(d, h);
      if (res.ok) setReporte(res.data);
      else {
        setError(res.error);
        setReporte(null);
      }
      setCargando(false);
    });
  }, []);

  useEffect(() => {
    cargar(desdeInicial, hastaInicial);
  }, [cargar, desdeInicial, hastaInicial]);

  const niveles = useMemo(
    () => [...new Set((reporte?.alumnos ?? []).map((a) => a.nivelAcademico))].sort(),
    [reporte]
  );
  const grupos = useMemo(
    () =>
      [
        ...new Set(
          (reporte?.alumnos ?? [])
            .filter((a) => !nivel || a.nivelAcademico === nivel)
            .map((a) => a.grupo)
        ),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [reporte, nivel]
  );

  const filtrados = useMemo(() => {
    let lista = reporte?.alumnos ?? [];
    if (nivel) lista = lista.filter((a) => a.nivelAcademico === nivel);
    if (grupo) lista = lista.filter((a) => a.grupo === grupo);
    if (soloRiesgo)
      lista = lista.filter(
        (a) => a.porcentajeAsistencia !== null && a.porcentajeAsistencia < UMBRAL_RIESGO
      );
    if (termino.trim().length >= 2) {
      const t = termino.trim().toLowerCase();
      lista = lista.filter((a) => a.nombre.toLowerCase().includes(t));
    }
    const dir = asc ? 1 : -1;
    return [...lista].sort((a, b) => {
      if (orden === "nombre") return dir * a.nombre.localeCompare(b.nombre, "es");
      if (orden === "grupo") return dir * a.grupo.localeCompare(b.grupo, "es");
      // Los alumnos sin días evaluables van siempre al final, sin importar el
      // sentido del orden: no tienen dato que comparar.
      if (orden === "porcentajeAsistencia") {
        const va = a.porcentajeAsistencia;
        const vb = b.porcentajeAsistencia;
        if (va === null || vb === null) return (va === null ? 1 : 0) - (vb === null ? 1 : 0);
        return dir * (va - vb);
      }
      return dir * ((a[orden] as number) - (b[orden] as number));
    });
  }, [reporte, nivel, grupo, soloRiesgo, termino, orden, asc]);

  // Los totales se calculan sobre lo filtrado, no sobre todo: si alguien mira
  // solo Primaria, los números de arriba tienen que ser los de Primaria.
  const resumen = useMemo(() => {
    if (!filtrados.length) return null;
    // El denominador global suma los días evaluables de cada alumno, no
    // alumnos × días del rango: si un grupo entró tarde al sistema, sus días
    // previos no existen para nadie.
    const posibles = filtrados.reduce((s, a) => s + a.diasEvaluados, 0);
    const asistencias = filtrados.reduce((s, a) => s + a.asistencias, 0);
    return {
      alumnos: filtrados.length,
      dias: reporte?.diasLectivos ?? 0,
      asistencia: posibles ? Math.round((asistencias / posibles) * 100) : 0,
      retardos: filtrados.reduce((s, a) => s + a.retardos, 0),
      faltas: filtrados.reduce((s, a) => s + a.ausenciasSinJustificar, 0),
      enRiesgo: filtrados.filter(
        (a) => a.porcentajeAsistencia !== null && a.porcentajeAsistencia < UMBRAL_RIESGO
      ).length,
      sinDatos: filtrados.filter((a) => a.porcentajeAsistencia === null).length,
    };
  }, [filtrados, reporte]);

  function ordenarPor(col: Columna) {
    if (orden === col) setAsc(!asc);
    else {
      setOrden(col);
      // Al cambiar de columna, empezar por el extremo que interesa: los
      // nombres alfabéticamente, los números de mayor problema a menor.
      setAsc(col === "nombre" || col === "grupo" || col === "porcentajeAsistencia");
    }
  }

  const th = (col: Columna, etiqueta: string, alinear = "text-left") => (
    <th className={`px-4 py-3 ${alinear}`}>
      <button
        onClick={() => ordenarPor(col)}
        className="inline-flex items-center gap-1 font-semibold text-gardner-gris/70 transition hover:text-gardner-azul"
      >
        {etiqueta}
        <span className="material-symbols-outlined text-[16px]">
          {orden === col ? (asc ? "arrow_upward" : "arrow_downward") : "unfold_more"}
        </span>
      </button>
    </th>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gardner-gris">Reportes</h1>
          <p className="text-sm font-medium text-gardner-gris/75">
            Asistencia acumulada por alumno · {alcance}
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

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      {reporte && reporte.diasGrupoSinRegistro > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-estado-retardo/30 bg-estado-retardo/10 px-4 py-3">
          <span className="material-symbols-outlined mt-0.5 text-[20px] text-estado-retardo">info</span>
          <p className="text-sm font-medium text-gardner-gris/85">
            Hay días del rango en que algunos grupos no registraron a nadie. Esos días{" "}
            <strong>no cuentan como faltas</strong> para ese grupo — no se puede saber si el alumno
            faltó o si no se usó el sistema ese día en su salón. Los porcentajes se calculan solo
            sobre los días con actividad.
          </p>
        </div>
      )}

      {resumen && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { etiqueta: "Días lectivos", valor: resumen.dias, icono: "event_available", color: "text-gardner-azul" },
            { etiqueta: "Alumnos", valor: resumen.alumnos, icono: "groups", color: "text-gardner-azul" },
            { etiqueta: "Asistencia", valor: `${resumen.asistencia}%`, icono: "check_circle", color: colorAsistencia(resumen.asistencia) },
            { etiqueta: "Retardos", valor: resumen.retardos, icono: "schedule", color: "text-estado-retardo" },
            { etiqueta: "En riesgo", valor: resumen.enRiesgo, icono: "warning", color: resumen.enRiesgo ? "text-red-600" : "text-estado-puntual" },
          ].map((c) => (
            <div key={c.etiqueta} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-[18px] ${c.color}`}>{c.icono}</span>
                <span className="text-xs font-semibold text-gardner-gris/70">{c.etiqueta}</span>
              </div>
              <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.valor}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-gardner-gris/50">
            search
          </span>
          <input
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            placeholder="Buscar alumno…"
            className="w-full rounded-xl border border-gardner-gris/20 py-2 pl-10 pr-3 text-sm font-medium text-gardner-gris"
          />
        </div>

        <select
          value={nivel}
          onChange={(e) => {
            setNivel(e.target.value);
            setGrupo("");
          }}
          className="rounded-xl border border-gardner-gris/20 bg-white px-3 py-2 text-sm font-medium text-gardner-gris"
        >
          <option value="">Todos los niveles</option>
          {niveles.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        <select
          value={grupo}
          onChange={(e) => setGrupo(e.target.value)}
          className="rounded-xl border border-gardner-gris/20 bg-white px-3 py-2 text-sm font-medium text-gardner-gris"
        >
          <option value="">Todos los grupos</option>
          {grupos.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <button
          onClick={() => setSoloRiesgo(!soloRiesgo)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
            soloRiesgo
              ? "bg-red-600 text-white"
              : "bg-gardner-gris/10 text-gardner-gris/80 hover:bg-gardner-azul/10"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">warning</span>
          Solo en riesgo
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {cargando ? (
          <p className="px-4 py-10 text-center text-sm font-medium text-gardner-gris/60">
            Generando reporte…
          </p>
        ) : !reporte || reporte.diasLectivos === 0 ? (
          <p className="px-4 py-10 text-center text-sm font-medium text-gardner-gris/60">
            No hay días lectivos en el rango seleccionado.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm font-medium text-gardner-gris/60">
            Ningún alumno coincide con los filtros.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gardner-gris/10 bg-gardner-neutro text-xs">
                <tr>
                  {th("nombre", "Alumno")}
                  {th("grupo", "Grupo")}
                  {th("ausenciasSinJustificar", "Faltas", "text-center")}
                  {th("retardos", "Retardos", "text-center")}
                  {th("porcentajeAsistencia", "Asistencia", "text-center")}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a) => (
                  <Fila key={a.id} alumno={a} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reporte && reporte.diasLectivos > 0 && (
        <p className="text-xs font-medium text-gardner-gris/60">
          {reporte.diasLectivos} días lectivos entre el {formatoFecha(reporte.desde)} y el{" "}
          {formatoFecha(reporte.hasta)}. Se excluyen fines de semana y los días marcados como no
          lectivos en el calendario escolar. Un alumno se considera en riesgo por debajo de{" "}
          {UMBRAL_RIESGO}% de asistencia.
        </p>
      )}
    </div>
  );
}

function Fila({ alumno }: { alumno: AlumnoAcumulado }) {
  const riesgo =
    alumno.porcentajeAsistencia !== null && alumno.porcentajeAsistencia < UMBRAL_RIESGO;
  return (
    <tr className={`border-b border-gardner-gris/5 last:border-0 ${riesgo ? "bg-red-50/40" : ""}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gardner-azul/10 text-xs font-bold text-gardner-azul-oscuro">
            {iniciales(alumno.nombre)}
          </span>
          <span className="font-semibold text-gardner-gris">{alumno.nombre}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-medium text-gardner-gris/80">{alumno.grupo}</span>
        <span className="block text-xs text-gardner-gris/55">{alumno.nivelAcademico}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="font-bold text-gardner-gris">{alumno.ausenciasSinJustificar}</span>
        {alumno.ausenciasJustificadas > 0 && (
          <span className="block text-xs text-gardner-gris/55">
            +{alumno.ausenciasJustificadas} justif.
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-center font-bold text-estado-retardo">
        {alumno.retardos || <span className="text-gardner-gris/30">—</span>}
      </td>
      <td className="px-4 py-3 text-center">
        {alumno.porcentajeAsistencia === null ? (
          <>
            <span className="text-sm font-semibold text-gardner-gris/40">Sin datos</span>
            <span className="block text-xs text-gardner-gris/40">
              su grupo no registró ningún día
            </span>
          </>
        ) : (
          <>
            <span className={`text-base font-bold ${colorAsistencia(alumno.porcentajeAsistencia)}`}>
              {alumno.porcentajeAsistencia}%
            </span>
            <span className="block text-xs text-gardner-gris/55">
              {alumno.asistencias}/{alumno.diasEvaluados}
              {alumno.diasSinRegistro > 0 && ` · ${alumno.diasSinRegistro} sin datos`}
            </span>
          </>
        )}
      </td>
    </tr>
  );
}
