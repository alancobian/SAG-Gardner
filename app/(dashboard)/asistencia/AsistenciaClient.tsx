"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { GrupoReporte, ReporteDiario } from "@/lib/reportes";
import type { FichaAlumno } from "@/lib/alumnos";
import { obtenerFichaAlumnoAction } from "../grupos-alumnos/actions";

const ESTADO_ESTILOS: Record<string, string> = {
  Puntual: "bg-estado-puntual/10 text-estado-puntual",
  Retardo: "bg-estado-retardo/10 text-estado-retardo",
  Ausente: "bg-estado-ausente/15 text-gardner-gris",
};

const ESTADO_TEXTO: Record<string, string> = {
  Puntual: "text-estado-puntual",
  Retardo: "text-estado-retardo",
  Ausente: "text-estado-ausente",
};

const ESTADO_ANILLO: Record<string, string> = {
  Puntual: "ring-estado-puntual",
  Retardo: "ring-estado-retardo",
  Ausente: "ring-estado-ausente",
};

const RESUMEN_TARJETAS = [
  { clave: "puntual" as const, titulo: "Puntuales", icono: "check_circle", color: "var(--color-estado-puntual)", nota: "Alumnos a tiempo" },
  { clave: "retardo" as const, titulo: "Retardos", icono: "directions_run", color: "var(--color-estado-retardo)", nota: "Llegaron tarde" },
  { clave: "ausente" as const, titulo: "Ausentes", icono: "person_off", color: "var(--color-estado-ausente)", nota: "Sin registro hoy" },
  { clave: "total" as const, titulo: "Total alumnos", icono: "groups", color: "var(--color-gardner-azul-oscuro)", nota: "Matrícula activa" },
];

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatoHora(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

function formatoFecha(fechaIso: string) {
  try {
    return new Date(fechaIso + "T12:00:00").toLocaleDateString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return fechaIso;
  }
}

function porcentajeEstilo(pct: number) {
  if (pct >= 85) return { badge: "bg-estado-puntual/15 text-estado-puntual", icono: "check_circle" };
  if (pct >= 60) return { badge: "bg-estado-retardo/15 text-estado-retardo", icono: "warning" };
  return { badge: "bg-red-100 text-red-600", icono: "error" };
}

function TarjetaResumen({
  titulo,
  valor,
  color,
  icono,
  nota,
}: {
  titulo: string;
  valor: number;
  color: string;
  icono: string;
  nota: string;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-gardner-gris/70">{titulo}</span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ color }}>
            {icono}
          </span>
        </span>
      </div>
      <span className="text-3xl font-bold text-gardner-gris">{valor}</span>
      <span className="text-xs font-medium text-gardner-gris/60">{nota}</span>
    </div>
  );
}

function FichaAlumnoDetalle({
  alumnoId,
  puedeEditar,
  onVolver,
}: {
  alumnoId: string;
  puedeEditar: boolean;
  onVolver: () => void;
}) {
  const [ficha, setFicha] = useState<FichaAlumno | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCargando(true);
    setError(null);
    obtenerFichaAlumnoAction(alumnoId).then((res) => {
      if (res.ok) setFicha(res.data);
      else setError(res.error);
      setCargando(false);
    });
  }, [alumnoId]);

  return (
    <>
      <div className="flex items-center gap-2 border-b border-gardner-gris/15 px-6 py-5">
        <button
          onClick={onVolver}
          className="rounded-full p-1.5 text-gardner-gris/70 transition hover:bg-gardner-azul/10 hover:text-gardner-azul-oscuro"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold text-gardner-gris">Ficha del alumno</h2>
        {puedeEditar && ficha && (
          <Link
            href={`/grupos-alumnos/${ficha.id}/editar`}
            className="ml-auto flex items-center gap-1 rounded-lg bg-gardner-azul/10 px-3 py-1.5 text-xs font-semibold text-gardner-azul-oscuro hover:bg-gardner-azul/20"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Editar
          </Link>
        )}
      </div>

      {cargando && <p className="p-6 text-sm text-gardner-gris/60">Cargando…</p>}
      {error && <p className="mx-6 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {ficha && !cargando && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              {ficha.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ficha.foto}
                  alt={ficha.nombre}
                  className={`h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-offset-2 ${
                    ESTADO_ANILLO[ficha.estatus] ?? "ring-transparent"
                  }`}
                />
              ) : (
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gardner-azul text-base font-bold text-white ring-2 ring-offset-2 ${
                    ESTADO_ANILLO[ficha.estatus] ?? "ring-transparent"
                  }`}
                >
                  {iniciales(ficha.nombre)}
                </div>
              )}
              <div>
                <p className="font-semibold text-gardner-gris">{ficha.nombre}</p>
                <p className="text-xs font-medium text-gardner-gris/60">
                  {ficha.grupo ? `${ficha.grupo.nombre} · ${ficha.grupo.nivelAcademico}` : "Sin grupo"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gardner-gris/70">Estatus:</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_ESTILOS[ficha.estatus] ?? "bg-gardner-gris/10"}`}>
                {ficha.estatus}
              </span>
              <span className="ml-auto text-xs text-gardner-gris/50">{ficha.codigoQr}</span>
            </div>

            <div className="rounded-xl bg-gardner-neutro p-3 text-center text-xs font-medium text-gardner-gris/80">
              {ficha.stats.totalRegistros} registros de asistencia · {ficha.stats.totalRetardos} retardos
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-gardner-gris">Tutores</h3>
              {ficha.tutores.length === 0 && <p className="text-xs text-gardner-gris/60">Sin tutores registrados.</p>}
              <ul className="flex flex-col gap-2">
                {ficha.tutores.map((t) => (
                  <li key={t.id} className="rounded-lg border border-gardner-gris/15 p-2.5 text-sm">
                    <p className="font-medium text-gardner-gris">
                      {t.nombre} <span className="font-normal text-gardner-gris/60">· {t.relacion}</span>
                    </p>
                    <p className="text-xs text-gardner-gris/70">
                      {t.telefono || "Sin teléfono"} {t.correo ? `· ${t.correo}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-gardner-gris">Historial reciente</h3>
              {ficha.historial.length === 0 && <p className="text-xs text-gardner-gris/60">Sin registros de asistencia.</p>}
              <ul className="flex max-h-56 flex-col divide-y divide-gardner-gris/10 overflow-y-auto">
                {ficha.historial.slice(0, 15).map((h, i) => (
                  <li key={i} className="flex items-center justify-between py-1.5 text-xs">
                    <span className="font-medium text-gardner-gris/80">{formatoFecha(h.fecha)}</span>
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${ESTADO_ESTILOS[h.estatus] ?? "bg-gardner-gris/10 text-gardner-gris"}`}>
                      {h.estatus}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PanelAlumnos({
  grupo,
  puedeEditar,
  onCerrar,
}: {
  grupo: GrupoReporte;
  puedeEditar: boolean;
  onCerrar: () => void;
}) {
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-gardner-gris/40 backdrop-blur-[1px]" onClick={onCerrar}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {alumnoSeleccionado ? (
          <FichaAlumnoDetalle
            alumnoId={alumnoSeleccionado}
            puedeEditar={puedeEditar}
            onVolver={() => setAlumnoSeleccionado(null)}
          />
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-gardner-gris/15 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-gardner-gris">{grupo.grupo}</h2>
                <p className="text-xs font-medium text-gardner-gris/60">
                  {grupo.nivelAcademico} · {grupo.alumnos.length} alumnos
                </p>
              </div>
              <button
                onClick={onCerrar}
                className="rounded-full p-2 text-gardner-gris/60 transition hover:bg-gardner-gris/10 hover:text-gardner-gris"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex items-center gap-4 border-b border-gardner-gris/15 px-6 py-3">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gardner-gris/70">
                <span className="h-2.5 w-2.5 rounded-full bg-estado-puntual" /> Puntual
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-gardner-gris/70">
                <span className="h-2.5 w-2.5 rounded-full bg-estado-retardo" /> Retardo
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-gardner-gris/70">
                <span className="h-2.5 w-2.5 rounded-full bg-estado-ausente" /> Ausente
              </span>
              <span className="ml-auto text-[11px] font-medium text-gardner-gris/40">Clic para ver ficha</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {grupo.alumnos.map((a) => {
                const hora = formatoHora(a.horaEntrada);
                return (
                  <button
                    key={a.id}
                    onClick={() => setAlumnoSeleccionado(a.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-gardner-azul/5"
                  >
                    <div className="flex items-center gap-3">
                      {a.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.foto}
                          alt={a.nombre}
                          className={`h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-offset-2 ${
                            ESTADO_ANILLO[a.estatus] ?? "ring-transparent"
                          }`}
                        />
                      ) : (
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gardner-azul text-sm font-bold text-white ring-2 ring-offset-2 ${
                            ESTADO_ANILLO[a.estatus] ?? "ring-transparent"
                          }`}
                        >
                          {iniciales(a.nombre)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-gardner-gris">{a.nombre}</p>
                        {hora && <p className="text-xs font-medium text-gardner-gris/50">Entrada: {hora}</p>}
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${ESTADO_TEXTO[a.estatus] ?? "text-gardner-gris/50"}`}>
                      {a.estatus}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export default function AsistenciaClient({ reporte, puedeEditar }: { reporte: ReporteDiario; puedeEditar: boolean }) {
  const [grupoAbierto, setGrupoAbierto] = useState<GrupoReporte | null>(null);

  const niveles = useMemo(() => {
    const mapa = new Map<string, GrupoReporte[]>();
    reporte.grupos.forEach((g) => {
      const clave = g.nivelAcademico || "Sin nivel";
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave)!.push(g);
    });
    return Array.from(mapa.entries()).map(([nivel, grupos]) => {
      const total = grupos.reduce((acc, g) => acc + g.alumnos.length, 0);
      const puntual = grupos.reduce((acc, g) => acc + g.alumnos.filter((a) => a.estatus === "Puntual").length, 0);
      const retardo = grupos.reduce((acc, g) => acc + g.alumnos.filter((a) => a.estatus === "Retardo").length, 0);
      const ausente = grupos.reduce((acc, g) => acc + g.alumnos.filter((a) => a.estatus === "Ausente").length, 0);
      return { nivel, grupos, total, puntual, retardo, ausente };
    });
  }, [reporte.grupos]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gardner-gris">Dashboard de Asistencia</h1>
          <p className="text-sm font-medium text-gardner-gris/70">
            Resumen general de entradas al plantel ·{" "}
            {new Date(reporte.fecha + "T12:00:00").toLocaleDateString("es-MX", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {reporte.tipoDia !== "Lectivo" && (
              <span className="ml-2 rounded-full bg-gardner-azul/15 px-2 py-0.5 text-xs font-semibold text-gardner-azul-oscuro">
                {reporte.tipoDia}
              </span>
            )}
          </p>
        </div>
        <form className="flex items-center gap-2 rounded-lg border border-gardner-gris/20 bg-white px-3 py-2 shadow-sm transition hover:border-gardner-azul">
          <span className="material-symbols-outlined text-[18px] text-gardner-azul">calendar_month</span>
          <input
            type="date"
            name="fecha"
            defaultValue={reporte.fecha}
            className="border-none bg-transparent text-sm font-medium text-gardner-gris outline-none"
          />
          <button className="ml-1 rounded-md bg-gardner-azul px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gardner-azul-oscuro">
            Ver
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {RESUMEN_TARJETAS.map((t) => (
          <TarjetaResumen
            key={t.clave}
            titulo={t.titulo}
            valor={reporte.totales[t.clave]}
            color={t.color}
            icono={t.icono}
            nota={t.nota}
          />
        ))}
      </div>

      {niveles.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-sm font-medium text-gardner-gris/70">
          No hay alumnos activos registrados todavía.
        </p>
      )}

      <div className="flex flex-col gap-8">
        {niveles.map(({ nivel, grupos, total, puntual, retardo, ausente }) => (
          <div key={nivel} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 border-b border-gardner-gris/15 pb-2">
              <h3 className="text-base font-bold text-gardner-azul-oscuro">{nivel}</h3>
              <span className="rounded-full bg-gardner-azul/10 px-3 py-1 text-xs font-semibold text-gardner-gris/80">
                {total} alumnos · {puntual} puntual · {retardo} retardo · {ausente} ausente
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {grupos.map((g) => {
                const presentes = g.alumnos.filter((a) => a.estatus === "Puntual" || a.estatus === "Retardo").length;
                const totalGrupo = g.alumnos.length;
                const pct = totalGrupo > 0 ? Math.round((g.alumnos.filter((a) => a.estatus === "Puntual").length / totalGrupo) * 100) : 0;
                const estilo = porcentajeEstilo(pct);
                const conteos = [
                  { clave: "Puntual", n: g.alumnos.filter((a) => a.estatus === "Puntual").length },
                  { clave: "Retardo", n: g.alumnos.filter((a) => a.estatus === "Retardo").length },
                  { clave: "Ausente", n: g.alumnos.filter((a) => a.estatus === "Ausente").length },
                ];
                return (
                  <div
                    key={g.id}
                    className="flex flex-col gap-4 rounded-xl border border-gardner-gris/15 bg-white p-5 shadow-sm transition hover:border-gardner-azul/30 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-bold text-gardner-gris">{g.grupo}</h4>
                        <p className="mt-0.5 text-xs font-medium text-gardner-gris/60">{g.nivelAcademico}</p>
                      </div>
                      <span className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${estilo.badge}`}>
                        {pct}%
                        <span className="material-symbols-outlined text-[14px]">{estilo.icono}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {conteos.map((c) => (
                        <span
                          key={c.clave}
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_ESTILOS[c.clave] ?? "bg-gardner-gris/10 text-gardner-gris"}`}
                        >
                          {c.n} {c.clave}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-gardner-gris/15 pt-3">
                      <span className="text-xs font-medium text-gardner-gris/60">
                        {presentes} de {totalGrupo} presentes
                      </span>
                      <button
                        onClick={() => setGrupoAbierto(g)}
                        className="rounded-lg bg-gardner-azul px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gardner-azul-oscuro"
                      >
                        Ver alumnos
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {grupoAbierto && (
        <PanelAlumnos grupo={grupoAbierto} puedeEditar={puedeEditar} onCerrar={() => setGrupoAbierto(null)} />
      )}
    </div>
  );
}
