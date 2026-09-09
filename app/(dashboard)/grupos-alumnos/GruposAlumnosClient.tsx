"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Grupo } from "@/lib/grupos";
import type { AlumnoBusqueda, AlumnoRoster, FichaAlumno } from "@/lib/alumnos";
import { listarGruposAction, listarAlumnosPorGrupoAction, obtenerFichaAlumnoAction, buscarAlumnosAction } from "./actions";

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

const ORDEN_NIVEL = ["Preescolar", "Primaria", "Secundaria", "Preparatoria"];

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
      style={{ width: `${size * 4}px`, height: `${size * 4}px`, fontSize: size >= 14 ? "1.25rem" : size >= 10 ? "0.875rem" : "0.75rem" }}
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

function PanelDetalle({
  alumnoId,
  puedeEditar,
  onCerrar,
}: {
  alumnoId: string;
  puedeEditar: boolean;
  onCerrar: () => void;
}) {
  const [ficha, setFicha] = useState<FichaAlumno | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCargando(true);
    setFicha(null);
    setError(null);
    obtenerFichaAlumnoAction(alumnoId).then((res) => {
      if (res.ok) setFicha(res.data);
      else setError(res.error);
      setCargando(false);
    });
  }, [alumnoId]);

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30" onClick={onCerrar}>
      <div
        className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative flex min-h-24 shrink-0 items-start justify-between px-6 py-4"
          style={{ background: "linear-gradient(135deg, #007dc4 0%, #005386 100%)" }}
        >
          <h2 className="text-sm font-semibold text-white/90">Ficha del alumno</h2>
          <div className="flex items-center gap-2">
            {puedeEditar && ficha && (
              <Link
                href={`/grupos-alumnos/${ficha.id}/editar`}
                className="flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Editar
              </Link>
            )}
            <button onClick={onCerrar} className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white">
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </div>

        {cargando && <p className="p-6 text-sm text-gardner-gris/65">Cargando…</p>}
        {error && <p className="mx-6 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {ficha && !cargando && (
          <div className="flex flex-col gap-6 px-6 pb-6">
            <div className="-mt-8 flex flex-col items-start gap-2">
              <div className="rounded-full bg-white p-1 shadow-md">
                <Iniciales nombre={ficha.nombre} anillo={ESTADO_ANILLO[ficha.estatus]} size={18} />
              </div>
              <div>
                <p className="break-words text-lg font-semibold leading-snug text-gardner-gris">{ficha.nombre}</p>
                <p className="text-sm text-gardner-gris/65">
                  {ficha.grupo ? `${ficha.grupo.nombre} · ${ficha.grupo.nivelAcademico}` : "Sin grupo"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gardner-gris/75">Estatus:</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_ESTILOS[ficha.estatus] ?? "bg-black/5"}`}>
                {ficha.estatus}
              </span>
            </div>

            <div className="rounded-xl bg-gardner-neutro p-4 text-center text-sm text-gardner-gris/70">
              {ficha.stats.totalRegistros} registros de asistencia · {ficha.stats.totalRetardos} retardos
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-gardner-gris/15 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr?codigo=${encodeURIComponent(ficha.codigoQr)}`}
                alt={`Código QR de ${ficha.nombre}`}
                width={80}
                height={80}
                className="h-20 w-20 shrink-0 rounded-lg border border-gardner-gris/15"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gardner-gris">Credencial digital</p>
                <p className="truncate text-xs text-gardner-gris/55">{ficha.codigoQr}</p>
              </div>
              <a
                href={`/api/qr?codigo=${encodeURIComponent(ficha.codigoQr)}&nombre=${encodeURIComponent(ficha.nombre)}&download=1`}
                download
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gardner-azul px-4 py-2 text-sm font-semibold text-white hover:bg-gardner-azul-oscuro"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Descargar
              </a>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gardner-gris">Tutores</h3>
              {ficha.tutores.length === 0 && <p className="text-xs text-gardner-gris/65">Sin tutores registrados.</p>}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ficha.tutores.map((t) => (
                  <div key={t.id} className="rounded-lg border border-gardner-gris/15 p-3 text-sm">
                    <p className="font-medium text-gardner-gris">
                      {t.nombre} <span className="font-normal text-gardner-gris/65">· {t.relacion}</span>
                    </p>
                    <p className="text-xs text-gardner-gris/75">
                      {t.telefono || "Sin teléfono"} {t.correo ? `· ${t.correo}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gardner-gris">Historial reciente</h3>
              {ficha.historial.length === 0 && <p className="text-xs text-gardner-gris/65">Sin registros de asistencia.</p>}
              <ul className="flex max-h-64 flex-col divide-y divide-gardner-gris/15 overflow-y-auto">
                {ficha.historial.slice(0, 15).map((h, i) => (
                  <li key={i} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-gardner-gris/70">{formatoFecha(h.fecha)}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_ESTILOS[h.estatus] ?? "bg-black/5 text-gardner-gris"}`}>
                      {h.estatus}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GruposAlumnosClient({ puedeEditar }: { puedeEditar: boolean }) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [nivelFiltro, setNivelFiltro] = useState<string>("");
  const [gradoFiltro, setGradoFiltro] = useState<string>("");
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<Grupo | null>(null);
  const [alumnos, setAlumnos] = useState<AlumnoRoster[]>([]);
  const [cargandoGrupos, setCargandoGrupos] = useState(true);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [alumnoAbierto, setAlumnoAbierto] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<AlumnoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    }
  }, [grupoSeleccionado]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!busqueda.trim()) {
      setResultadosBusqueda([]);
      return;
    }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      const res = await buscarAlumnosAction(busqueda);
      setResultadosBusqueda(res.ok ? res.data : []);
      setBuscando(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [busqueda]);

  const niveles = useMemo(() => {
    const presentes = new Set(grupos.map((g) => g.nivelAcademico));
    return ORDEN_NIVEL.filter((n) => presentes.has(n)).concat(
      [...presentes].filter((n) => !ORDEN_NIVEL.includes(n))
    );
  }, [grupos]);

  const grados = useMemo(() => {
    const base = nivelFiltro ? grupos.filter((g) => g.nivelAcademico === nivelFiltro) : grupos;
    return [...new Set(base.map((g) => g.grado))];
  }, [grupos, nivelFiltro]);

  const gruposFiltrados = useMemo(() => {
    return grupos.filter(
      (g) => (!nivelFiltro || g.nivelAcademico === nivelFiltro) && (!gradoFiltro || g.grado === gradoFiltro)
    );
  }, [grupos, nivelFiltro, gradoFiltro]);

  function onCambiarNivel(nivel: string) {
    setNivelFiltro(nivel);
    setGradoFiltro("");
    const candidatos = grupos.filter((g) => !nivel || g.nivelAcademico === nivel);
    if (candidatos.length > 0) setGrupoSeleccionado(candidatos[0]);
  }

  function onCambiarGrado(grado: string) {
    setGradoFiltro(grado);
    const candidatos = grupos.filter(
      (g) => (!nivelFiltro || g.nivelAcademico === nivelFiltro) && (!grado || g.grado === grado)
    );
    if (candidatos.length > 0) setGrupoSeleccionado(candidatos[0]);
  }

  function abrirDesdeBusqueda(a: AlumnoBusqueda) {
    setAlumnoAbierto(a.id);
    setBusqueda("");
    setResultadosBusqueda([]);
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gardner-gris">Grupos y Alumnos</h1>
          <p className="text-sm text-gardner-gris/75">Consulta el roster de cada grupo y la ficha completa de cada alumno.</p>
        </div>
        <div className="relative w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-gardner-gris/55">
            search
          </span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar alumno por nombre…"
            className="w-full rounded-xl border border-gardner-gris/25 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
          />
          {(buscando || resultadosBusqueda.length > 0) && busqueda.trim() && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gardner-gris/15 bg-white shadow-lg">
              {buscando && <p className="px-4 py-3 text-sm text-gardner-gris/65">Buscando…</p>}
              {!buscando && resultadosBusqueda.length === 0 && (
                <p className="px-4 py-3 text-sm text-gardner-gris/65">Sin resultados</p>
              )}
              {!buscando &&
                resultadosBusqueda.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => abrirDesdeBusqueda(r)}
                    className="flex w-full flex-col items-start px-4 py-2.5 text-left text-sm hover:bg-gardner-azul/10"
                  >
                    <span className="font-medium text-gardner-gris">{r.nombre}</span>
                    <span className="text-xs text-gardner-gris/65">{r.grupo}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-5 overflow-hidden">
        <aside className="flex w-60 shrink-0 flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-2">
            <select
              value={nivelFiltro}
              onChange={(e) => onCambiarNivel(e.target.value)}
              className="w-full rounded-lg border border-gardner-gris/25 px-2.5 py-2 text-xs font-medium text-gardner-gris"
            >
              <option value="">Todos los niveles</option>
              {niveles.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select
              value={gradoFiltro}
              onChange={(e) => onCambiarGrado(e.target.value)}
              className="w-full rounded-lg border border-gardner-gris/25 px-2.5 py-2 text-xs font-medium text-gardner-gris"
            >
              <option value="">Todos los grados</option>
              {grados.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 border-t border-gardner-gris/15 pt-2">
            {cargandoGrupos && <p className="p-2 text-xs text-gardner-gris/65">Cargando…</p>}
            {!cargandoGrupos && gruposFiltrados.length === 0 && (
              <p className="p-2 text-xs text-gardner-gris/65">Sin grupos para este filtro.</p>
            )}
            {gruposFiltrados.map((g) => (
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
          </div>
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
      </div>

      {alumnoAbierto && (
        <PanelDetalle alumnoId={alumnoAbierto} puedeEditar={puedeEditar} onCerrar={() => setAlumnoAbierto(null)} />
      )}
    </div>
  );
}
