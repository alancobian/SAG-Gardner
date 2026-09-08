"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Docente, FichaDocente } from "@/lib/docentes";
import {
  listarDocentesAction,
  obtenerFichaDocenteAction,
  actualizarDocenteAction,
  eliminarDocenteAction,
} from "./actions";

const ESTADO_ESTILOS: Record<string, string> = {
  Activo: "bg-estado-puntual/10 text-estado-puntual",
  Inactivo: "bg-black/5 text-gardner-gris/65",
  Baja: "bg-estado-ausente/10 text-gardner-gris",
};

const ESTADO_PUNTO: Record<string, string> = {
  Puntual: "bg-estado-puntual",
  Retardo: "bg-estado-retardo",
  Ausente: "bg-estado-ausente",
};

const NIVELES = ["Preescolar", "Primaria", "Secundaria", "Preparatoria", "Sin nivel asignado"];

function Iniciales({ nombre, size = 10 }: { nombre: string; size?: number }) {
  const iniciales = nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gardner-azul font-bold text-white"
      style={{ width: `${size * 4}px`, height: `${size * 4}px`, fontSize: size >= 14 ? "1.25rem" : "0.875rem" }}
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

function FichaPanel({
  docenteId,
  puedeEditar,
  onCerrar,
  onCambio,
}: {
  docenteId: string;
  puedeEditar: boolean;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const [ficha, setFicha] = useState<FichaDocente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  const [nombre, setNombre] = useState("");
  const [nivelAcademico, setNivelAcademico] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [estatus, setEstatus] = useState("Activo");

  useEffect(() => {
    setCargando(true);
    setEditando(false);
    setError(null);
    obtenerFichaDocenteAction(docenteId).then((res) => {
      if (res.ok) {
        setFicha(res.data);
        setNombre(res.data.nombre);
        setNivelAcademico(res.data.nivelAcademico === "Sin nivel asignado" ? "" : res.data.nivelAcademico);
        setTelefono(res.data.telefono || "");
        setCorreo(res.data.correo || "");
        setEstatus(res.data.estatus);
      } else {
        setError(res.error);
      }
      setCargando(false);
    });
  }, [docenteId]);

  function guardar() {
    setError(null);
    startTransition(async () => {
      const res = await actualizarDocenteAction(docenteId, {
        nombre,
        nivelAcademico,
        telefono,
        correo,
        estatus,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditando(false);
      onCambio();
      const actualizada = await obtenerFichaDocenteAction(docenteId);
      if (actualizada.ok) setFicha(actualizada.data);
    });
  }

  function eliminar() {
    startTransition(async () => {
      const res = await eliminarDocenteAction(docenteId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onCambio();
      onCerrar();
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30" onClick={onCerrar}>
      <div
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative flex h-28 shrink-0 items-start justify-between px-5 py-4"
          style={{ background: "linear-gradient(135deg, #007dc4 0%, #005386 100%)" }}
        >
          <h2 className="text-sm font-semibold text-white/90">Ficha del docente</h2>
          <button onClick={onCerrar} className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {cargando && <p className="p-5 text-sm text-gardner-gris/65">Cargando…</p>}
        {error && <p className="mx-5 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {ficha && !cargando && (
          <div className="flex flex-col gap-5 px-5 pb-5">
            <div className="-mt-10 flex items-end gap-3">
              <div className="rounded-full bg-white p-1 shadow-md">
                <Iniciales nombre={ficha.nombre} size={16} />
              </div>
              <div className="pb-1">
                {editando ? (
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="rounded-lg border border-gardner-gris/25 px-2 py-1 text-sm font-semibold"
                  />
                ) : (
                  <p className="font-semibold text-gardner-gris">{ficha.nombre}</p>
                )}
                {editando ? (
                  <select
                    value={nivelAcademico}
                    onChange={(e) => setNivelAcademico(e.target.value)}
                    className="mt-1 rounded-lg border border-gardner-gris/25 px-2 py-1 text-xs"
                  >
                    <option value="">Sin nivel asignado</option>
                    <option value="Preescolar">Preescolar</option>
                    <option value="Primaria">Primaria</option>
                    <option value="Secundaria">Secundaria</option>
                    <option value="Preparatoria">Preparatoria</option>
                  </select>
                ) : (
                  <p className="text-xs text-gardner-gris/65">{ficha.nivelAcademico}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gardner-gris/75">Estatus:</span>
              {editando ? (
                <select
                  value={estatus}
                  onChange={(e) => setEstatus(e.target.value)}
                  className="rounded-lg border border-gardner-gris/25 px-2 py-1 text-xs"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Baja">Baja</option>
                </select>
              ) : (
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_ESTILOS[ficha.estatus] ?? "bg-black/5"}`}>
                  {ficha.estatus}
                </span>
              )}
              <span className="ml-auto text-xs text-gardner-gris/55">{ficha.codigoQr}</span>
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gardner-gris">
                <span className="material-symbols-outlined text-[16px] text-gardner-gris/55">call</span>
                Contacto
              </h3>
              {editando ? (
                <div className="flex flex-col gap-1.5">
                  <input
                    placeholder="Teléfono"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="rounded-lg border border-gardner-gris/25 px-2 py-1 text-xs"
                  />
                  <input
                    placeholder="Correo"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="rounded-lg border border-gardner-gris/25 px-2 py-1 text-xs"
                  />
                </div>
              ) : (
                <p className="text-xs text-gardner-gris/75">
                  {ficha.telefono || "Sin teléfono"} {ficha.correo ? `· ${ficha.correo}` : ""}
                </p>
              )}
            </div>

            <div className="rounded-xl bg-gardner-neutro p-3 text-center text-xs text-gardner-gris/70">
              {ficha.stats.totalRegistros} registros de asistencia · {ficha.stats.totalRetardos} retardos
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gardner-gris">Historial reciente</h3>
              {ficha.historial.length === 0 && (
                <p className="text-xs text-gardner-gris/65">Sin registros de asistencia.</p>
              )}
              <ul className="relative flex max-h-64 flex-col gap-3 overflow-y-auto border-l-2 border-gardner-gris/15 pl-4">
                {ficha.historial.slice(0, 15).map((h, i) => (
                  <li key={i} className="relative flex items-center justify-between text-xs">
                    <span
                      className={`absolute -left-[21px] h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                        ESTADO_PUNTO[h.estatus] ?? "bg-gardner-gris/30"
                      }`}
                    />
                    <span className="text-gardner-gris/70">{formatoFecha(h.fecha)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${ESTADO_ESTILOS[h.estatus] ?? "bg-black/5 text-gardner-gris"}`}
                    >
                      {h.estatus}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {puedeEditar && (
              <div className="mt-2 flex items-center gap-2 border-t border-gardner-gris/15 pt-4">
                {editando ? (
                  <>
                    <button
                      onClick={guardar}
                      disabled={isPending}
                      className="rounded-lg bg-gardner-azul px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Guardar cambios
                    </button>
                    <button
                      onClick={() => setEditando(false)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-gardner-gris/75 hover:bg-gardner-gris/10"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditando(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-gardner-azul px-4 py-2 text-sm font-semibold text-white hover:bg-gardner-azul-oscuro"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Editar
                  </button>
                )}
                <div className="ml-auto">
                  {confirmarEliminar ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gardner-gris/75">¿Eliminar definitivamente?</span>
                      <button
                        onClick={eliminar}
                        disabled={isPending}
                        className="text-xs font-semibold text-red-500 hover:underline"
                      >
                        Sí, eliminar
                      </button>
                      <button
                        onClick={() => setConfirmarEliminar(false)}
                        className="text-xs text-gardner-gris/65 hover:underline"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmarEliminar(true)}
                      className="text-xs font-medium text-red-500 hover:underline"
                    >
                      Eliminar docente
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocentesClient({ puedeEditar }: { puedeEditar: boolean }) {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [docenteAbierto, setDocenteAbierto] = useState<string | null>(null);

  function cargar() {
    setCargando(true);
    listarDocentesAction().then((res) => {
      setDocentes(res.ok ? res.data : []);
      setCargando(false);
    });
  }

  useEffect(() => {
    cargar();
  }, []);

  const grupos = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const filtrados = texto ? docentes.filter((d) => d.nombre.toLowerCase().includes(texto)) : docentes;
    return NIVELES.map((nivel) => ({
      nivel,
      docentes: filtrados.filter((d) => d.nivelAcademico === nivel),
    })).filter((g) => g.docentes.length > 0);
  }, [docentes, busqueda]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gardner-gris">Docentes</h1>
          <p className="text-sm text-gardner-gris/75">Personal docente agrupado por nivel académico.</p>
        </div>
        <div className="relative w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-gardner-gris/55">
            search
          </span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar docente por nombre…"
            className="w-full rounded-xl border border-gardner-gris/25 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
          />
        </div>
      </div>

      {cargando && <p className="text-sm text-gardner-gris/65">Cargando…</p>}
      {!cargando && grupos.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-gardner-gris/75">
          No se encontraron docentes.
        </p>
      )}

      <div className="flex flex-col gap-6 overflow-y-auto">
        {grupos.map((g) => (
          <div key={g.nivel}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-gardner-gris">{g.nivel}</p>
              <span className="text-xs text-gardner-gris/65">{g.docentes.length} docentes</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {g.docentes.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDocenteAbierto(d.id)}
                  className="flex items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm transition hover:shadow-md hover:ring-1 hover:ring-gardner-azul/30"
                >
                  <Iniciales nombre={d.nombre} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gardner-gris">{d.nombre}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTADO_ESTILOS[d.estatus] ?? "bg-black/5"}`}>
                      {d.estatus}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {docenteAbierto && (
        <FichaPanel
          docenteId={docenteAbierto}
          puedeEditar={puedeEditar}
          onCerrar={() => setDocenteAbierto(null)}
          onCambio={cargar}
        />
      )}
    </div>
  );
}
