"use client";

// Personal administrativo: recepción, control escolar, mantenimiento, etc.
//
// Comparte tabla y tabla de asistencia con los docentes (migración 5), pero
// tiene su propia sección porque lo que se mira de ellos es distinto: no hay
// grupo ni nivel, hay área; y no hay bloques de clase, hay una jornada.

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import type { Administrativo, FichaAdministrativo } from "@/lib/administrativos";
import { AREAS_ADMINISTRATIVAS } from "@/lib/personal";
import {
  listarAdministrativosAction,
  obtenerFichaAdministrativoAction,
  crearAdministrativoAction,
} from "./actions";

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
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Las horas se guardan como hora local etiquetada UTC (ver lib/escaneo.ts),
// así que se formatean con timeZone UTC para no correrlas seis horas.
function formatoHora(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  } catch {
    return "—";
  }
}

export default function AdministrativosClient({ esAdmin }: { esAdmin: boolean }) {
  const params = useSearchParams();
  const [lista, setLista] = useState<Administrativo[]>([]);
  const [ficha, setFicha] = useState<FichaAdministrativo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [termino, setTermino] = useState("");
  const [area, setArea] = useState("");

  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaArea, setNuevaArea] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoCorreo, setNuevoCorreo] = useState("");
  const [recienCreado, setRecienCreado] = useState<{ nombre: string; codigoQr: string } | null>(null);

  const recargar = useCallback(async () => {
    const res = await listarAdministrativosAction();
    if (res.ok) setLista(res.data);
    else setError(res.error);
    setCargando(false);
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const abrirFicha = useCallback((id: string) => {
    startTransition(async () => {
      const res = await obtenerFichaAdministrativoAction(id);
      if (res.ok) setFicha(res.data);
      else setError(res.error);
    });
  }, []);

  // El buscador global enlaza aquí con ?persona=<id>.
  useEffect(() => {
    const id = params.get("persona");
    if (id) abrirFicha(id);
  }, [params, abrirFicha]);

  const areas = useMemo(
    () => [...new Set(lista.map((p) => p.area).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "es")),
    [lista]
  );

  const filtrados = useMemo(() => {
    let r = lista;
    if (area) r = r.filter((p) => p.area === area);
    if (termino.trim().length >= 2) {
      const t = termino.trim().toLowerCase();
      r = r.filter((p) => p.nombre.toLowerCase().includes(t));
    }
    return r;
  }, [lista, area, termino]);

  function onCrear() {
    setError(null);
    setAviso(null);
    if (!nuevoNombre.trim()) {
      setError("Falta el nombre");
      return;
    }
    // El área se exige al dar de alta: si se permite vacía, en un mes la mitad
    // del personal queda "Sin área" y el filtro deja de servir para algo.
    if (!nuevaArea) {
      setError("Selecciona el área a la que pertenece");
      return;
    }
    startTransition(async () => {
      const res = await crearAdministrativoAction({
        nombre: nuevoNombre,
        area: nuevaArea,
        telefono: nuevoTelefono,
        correo: nuevoCorreo,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRecienCreado({ nombre: nuevoNombre.trim(), codigoQr: res.data.codigoQr });
      setNuevoNombre("");
      setNuevaArea("");
      setNuevoTelefono("");
      setNuevoCorreo("");
      setMostrarAlta(false);
      await recargar();
    });
  }

  const activos = lista.filter((p) => p.estatus === "Activo").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gardner-gris">Personal administrativo</h1>
          <p className="text-sm font-medium text-gardner-gris/75">
            {activos} activos de {lista.length} registrados
          </p>
        </div>
        {esAdmin && (
          <button
            onClick={() => {
              setMostrarAlta(!mostrarAlta);
              setRecienCreado(null);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gardner-azul px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gardner-azul-oscuro"
          >
            <span className="material-symbols-outlined text-[18px]">{mostrarAlta ? "close" : "person_add"}</span>
            {mostrarAlta ? "Cancelar" : "Agregar"}
          </button>
        )}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      {aviso && (
        <p className="rounded-xl bg-estado-puntual/10 px-4 py-3 text-sm font-medium text-estado-puntual">{aviso}</p>
      )}

      {recienCreado && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-estado-puntual/30 bg-estado-puntual/5 p-4">
          {/* El QR se muestra de inmediato: es el motivo de dar de alta a alguien. */}
          <img
            src={`/api/qr?codigo=${encodeURIComponent(recienCreado.codigoQr)}`}
            alt={`QR de ${recienCreado.nombre}`}
            className="h-28 w-28 rounded-xl bg-white p-1"
          />
          <div className="min-w-[200px] flex-1">
            <p className="text-sm font-bold text-gardner-gris">{recienCreado.nombre}</p>
            <p className="font-mono text-xs text-gardner-gris/70">{recienCreado.codigoQr}</p>
            <a
              href={`/api/qr?codigo=${encodeURIComponent(recienCreado.codigoQr)}&nombre=${encodeURIComponent(recienCreado.nombre)}&download=1`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gardner-azul-oscuro hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Descargar credencial
            </a>
          </div>
          <button
            onClick={() => setRecienCreado(null)}
            className="text-xs font-medium text-gardner-gris/60 hover:underline"
          >
            Listo
          </button>
        </div>
      )}

      {mostrarAlta && (
        <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-semibold text-gardner-gris/70">Nombre completo</span>
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Nombre y apellidos"
              className="rounded-xl border border-gardner-gris/20 px-3 py-2 text-sm text-gardner-gris"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gardner-gris/70">Área</span>
            {/* Lista cerrada: con texto libre, "Prefectura" y "prefectura"
                acabarían siendo dos áreas distintas en el filtro. */}
            <select
              value={nuevaArea}
              onChange={(e) => setNuevaArea(e.target.value)}
              className="rounded-xl border border-gardner-gris/20 bg-white px-3 py-2 text-sm text-gardner-gris"
            >
              <option value="">Selecciona un área</option>
              {AREAS_ADMINISTRATIVAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gardner-gris/70">Teléfono (opcional)</span>
            <input
              value={nuevoTelefono}
              onChange={(e) => setNuevoTelefono(e.target.value)}
              className="rounded-xl border border-gardner-gris/20 px-3 py-2 text-sm text-gardner-gris"
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-semibold text-gardner-gris/70">Correo (opcional)</span>
            <input
              type="email"
              value={nuevoCorreo}
              onChange={(e) => setNuevoCorreo(e.target.value)}
              className="rounded-xl border border-gardner-gris/20 px-3 py-2 text-sm text-gardner-gris"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              onClick={onCrear}
              disabled={isPending}
              className="rounded-xl bg-gardner-azul px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gardner-azul-oscuro disabled:opacity-60"
            >
              {isPending ? "Guardando…" : "Dar de alta y generar QR"}
            </button>
          </div>
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
            placeholder="Buscar por nombre…"
            className="w-full rounded-xl border border-gardner-gris/20 py-2 pl-10 pr-3 text-sm font-medium text-gardner-gris"
          />
        </div>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="rounded-xl border border-gardner-gris/20 bg-white px-3 py-2 text-sm font-medium text-gardner-gris"
        >
          <option value="">Todas las áreas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {cargando ? (
        <p className="text-sm text-gardner-gris/65">Cargando personal…</p>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl bg-white px-4 py-12 text-center shadow-sm">
          <span className="material-symbols-outlined text-[36px] text-gardner-gris/25">badge</span>
          <p className="mt-2 text-sm font-medium text-gardner-gris/60">
            {lista.length === 0
              ? "Todavía no hay personal administrativo registrado."
              : "Nadie coincide con los filtros."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((p) => (
            <button
              key={p.id}
              onClick={() => abrirFicha(p.id)}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md"
            >
              {p.foto ? (
                <img src={p.foto} alt={p.nombre} className="h-12 w-12 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gardner-azul/10 text-sm font-bold text-gardner-azul-oscuro">
                  {iniciales(p.nombre)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gardner-gris">{p.nombre}</p>
                <p className="truncate text-xs text-gardner-gris/60">{p.area || "Sin área asignada"}</p>
              </div>
              {p.estatus !== "Activo" && (
                <span className="shrink-0 rounded-full bg-gardner-gris/10 px-2 py-0.5 text-[10px] font-semibold text-gardner-gris/60">
                  Inactivo
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {ficha && <Ficha ficha={ficha} onCerrar={() => setFicha(null)} />}
    </div>
  );
}

function Ficha({ ficha, onCerrar }: { ficha: FichaAdministrativo; onCerrar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onCerrar}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {ficha.foto ? (
              <img src={ficha.foto} alt={ficha.nombre} className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gardner-azul/10 text-base font-bold text-gardner-azul-oscuro">
                {iniciales(ficha.nombre)}
              </span>
            )}
            <div>
              <h2 className="text-lg font-bold text-gardner-gris">{ficha.nombre}</h2>
              <p className="text-xs text-gardner-gris/65">{ficha.area || "Sin área asignada"}</p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-gardner-gris/50 transition hover:text-gardner-gris">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {(ficha.telefono || ficha.correo) && (
          <div className="mt-4 space-y-1 text-sm text-gardner-gris/80">
            {ficha.telefono && <p>Tel. {ficha.telefono}</p>}
            {ficha.correo && <p className="break-all">{ficha.correo}</p>}
          </div>
        )}

        <div className="mt-5 flex flex-col items-center rounded-2xl bg-gardner-neutro p-4">
          <img
            src={`/api/qr?codigo=${encodeURIComponent(ficha.codigoQr)}`}
            alt={`QR de ${ficha.nombre}`}
            className="h-40 w-40 rounded-xl bg-white p-2"
          />
          <p className="mt-2 font-mono text-xs text-gardner-gris/70">{ficha.codigoQr}</p>
          <a
            href={`/api/qr?codigo=${encodeURIComponent(ficha.codigoQr)}&nombre=${encodeURIComponent(ficha.nombre)}&download=1`}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gardner-azul-oscuro hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Descargar credencial
          </a>
        </div>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-gardner-gris/55">
          Últimos registros
        </h3>
        {ficha.registros.length === 0 ? (
          <p className="mt-2 text-sm text-gardner-gris/55">Todavía no ha registrado entradas.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gardner-gris/10">
            {ficha.registros.map((r) => (
              <li key={r.fecha} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gardner-gris">{formatoFecha(r.fecha)}</p>
                  <p className="text-xs text-gardner-gris/60">
                    {formatoHora(r.horaEntrada)} → {formatoHora(r.horaSalida)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    r.estatus === "Retardo"
                      ? "bg-estado-retardo/15 text-estado-retardo"
                      : "bg-estado-puntual/15 text-estado-puntual"
                  }`}
                >
                  {r.estatus}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
