"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Grupo } from "@/lib/grupos";
import type { AlumnoRoster, FichaAlumno } from "@/lib/alumnos";
import { listarGruposAction, listarAlumnosPorGrupoAction, obtenerFichaAlumnoAction } from "./actions";

const ESTADO_ESTILOS: Record<string, string> = {
  Activo: "bg-estado-puntual/10 text-estado-puntual",
  Inactivo: "bg-black/5 text-gardner-gris/65",
  Baja: "bg-estado-ausente/10 text-gardner-gris",
};

const ESTADO_ANILLO: Record<string, string> = {
  Activo: "ring-estado-puntual",
  Inactivo: "ring-estado-ausente",
  Baja: "ring-estado-retardo",
};

function Iniciales({ nombre, anillo, size = 10 }: { nombre: string; anillo?: string; size?: number }) {
  const iniciales = nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gardner-azul font-bold text-white ring-2 ring-offset-2 ${
        anillo ?? "ring-transparent"
      }`}
      style={{ width: `${size * 4}px`, height: `${size * 4}px`, fontSize: size >= 10 ? "0.875rem" : "0.75rem" }}
    >
      {iniciales}
    </div>
  );
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

function PanelDetalle({ alumnoId, puedeEditar }: { alumnoId: string; puedeEditar: boolean }) {
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
    <div className="flex h-full w-full max-w-sm flex-col overflow-y-auto rounded-2xl bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gardner-gris/15 px-5 py-4">
        <h2 className="text-lg font-bold text-gardner-gris">Ficha del alumno</h2>
        {puedeEditar && ficha && (
          <Link
            href={`/grupos-alumnos/${ficha.id}/editar`}
            className="flex items-center gap-1 rounded-lg bg-gardner-azul/10 px-3 py-1.5 text-xs font-semibold text-gardner-azul-oscuro hover:bg-gardner-azul/20"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Editar
          </Link>
        )}
      </div>

      {cargando && <p className="p-5 text-sm text-gardner-gris/65">Cargando…</p>}
      {error && <p className="mx-5 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {ficha && !cargando && (
        <div className="flex flex-col gap-5 p-5">
          <div className="flex items-center gap-3">
            <Iniciales nombre={ficha.nombre} anillo={ESTADO_ANILLO[ficha.estatus]} size={12} />
            <div>
              <p className="font-semibold text-gardner-gris">{ficha.nombre}</p>
              <p className="text-xs text-gardner-gris/65">
                {ficha.grupo ? `${ficha.grupo.nombre} · ${ficha.grupo.nivelAcademico}` : "Sin grupo"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gardner-gris/75">Estatus:</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_ESTILOS[ficha.estatus] ?? "bg-black/5"}`}>
              {ficha.estatus}
            </span>
            <span className="ml-auto text-xs text-gardner-gris/55">{ficha.codigoQr}</span>
          </div>

          <div className="rounded-xl bg-gardner-neutro p-3 text-center text-xs text-gardner-gris/70">
            {ficha.stats.totalRegistros} registros de asistencia · {ficha.stats.totalRetardos} retardos
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gardner-gris">Tutores</h3>
            {ficha.tutores.length === 0 && <p className="text-xs text-gardner-gris/65">Sin tutores registrados.</p>}
            <ul className="flex flex-col gap-2">
              {ficha.tutores.map((t) => (
                <li key={t.id} className="rounded-lg border border-gardner-gris/15 p-2.5 text-sm">
                  <p className="font-medium text-gardner-gris">
                    {t.nombre} <span className="font-normal text-gardner-gris/65">· {t.relacion}</span>
                  </p>
                  <p className="text-xs text-gardner-gris/75">
                    {t.telefono || "Sin teléfono"} {t.correo ? `· ${t.correo}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gardner-gris">Historial reciente</h3>
            {ficha.historial.length === 0 && <p className="text-xs text-gardner-gris/65">Sin registros de asistencia.</p>}
            <ul className="flex max-h-48 flex-col divide-y divide-gardner-gris/15 overflow-y-auto">
              {ficha.historial.slice(0, 15).map((h, i) => (
                <li key={i} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-gardner-gris/70">{formatoFecha(h.fecha)}</span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${ESTADO_ESTILOS[h.estatus] ?? "bg-black/5 text-gardner-gris"}`}>
                    {h.estatus}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GruposAlumnosClient({ puedeEditar }: { puedeEditar: boolean }) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<Grupo | null>(null);
  const [alumnos, setAlumnos] = useState<AlumnoRoster[]>([]);
  const [cargandoGrupos, setCargandoGrupos] = useState(true);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [alumnoAbierto, setAlumnoAbierto] = useState<string | null>(null);

  useEffect(() => {
    listarGruposAction().then((res) => {
      if (res.ok) {
        setGrupos(res.data);
        if (res.data.length > 0) setGrupoSeleccionado(res.data[0]);
      }
      setCargandoGrupos(false);
    });
  }, []);

  function cargarAlumnos(grupoId: string) {
    setCargandoAlumnos(true);
    listarAlumnosPorGrupoAction(grupoId).then((res) => {
      setAlumnos(res.ok ? res.data : []);
      setCargandoAlumnos(false);
    });
  }

  useEffect(() => {
    if (grupoSeleccionado) {
      cargarAlumnos(grupoSeleccionado.id);
      setAlumnoAbierto(null);
    }
  }, [grupoSeleccionado]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gardner-gris">Grupos y Alumnos</h1>
        <p className="text-sm text-gardner-gris/75">Consulta el roster de cada grupo y la ficha completa de cada alumno.</p>
      </div>

      <div className="flex flex-1 gap-5 overflow-hidden">
        <aside className="flex w-56 shrink-0 flex-col gap-1 overflow-y-auto rounded-2xl bg-white p-3 shadow-sm">
          {cargandoGrupos && <p className="p-2 text-xs text-gardner-gris/65">Cargando…</p>}
          {grupos.map((g) => (
            <button
              key={g.id}
              onClick={() => setGrupoSeleccionado(g)}
              className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                grupoSeleccionado?.id === g.id
                  ? "bg-gardner-azul text-white font-semibold"
                  : "font-medium text-gardner-gris hover:bg-gardner-azul/10"
              }`}
            >
              {g.nombre}
              <span className={`block text-xs ${grupoSeleccionado?.id === g.id ? "text-white/70" : "text-gardner-gris/55"}`}>
                {g.nivelAcademico}
              </span>
            </button>
          ))}
        </aside>

        <div className="flex-1 overflow-y-auto rounded-2xl bg-white p-5 shadow-sm">
          {grupoSeleccionado && (
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gardner-gris">{grupoSeleccionado.nombre}</p>
                <p className="text-xs text-gardner-gris/65">{grupoSeleccionado.nivelAcademico}</p>
              </div>
              <span className="text-xs text-gardner-gris/65">{alumnos.length} alumnos</span>
            </div>
          )}
          {cargandoAlumnos && <p className="text-sm text-gardner-gris/65">Cargando alumnos…</p>}
          {!cargandoAlumnos && alumnos.length === 0 && (
            <p className="text-sm text-gardner-gris/65">Este grupo no tiene alumnos activos.</p>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {alumnos.map((a) => (
              <button
                key={a.id}
                onClick={() => setAlumnoAbierto(a.id)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                  alumnoAbierto === a.id
                    ? "border-gardner-azul bg-gardner-azul/10"
                    : "border-gardner-gris/15 hover:border-gardner-azul/50 hover:bg-gardner-azul/10"
                }`}
              >
                <Iniciales nombre={a.nombre} anillo={ESTADO_ANILLO[a.estatus]} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gardner-gris">{a.nombre}</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTADO_ESTILOS[a.estatus] ?? "bg-black/5"}`}>
                    {a.estatus}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {alumnoAbierto && <PanelDetalle alumnoId={alumnoAbierto} puedeEditar={puedeEditar} />}
      </div>
    </div>
  );
}
