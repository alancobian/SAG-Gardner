"use client";

import { useEffect, useState, useTransition } from "react";
import type { CicloEscolar, FechaNoLaboral, PeriodoVacacional } from "@/lib/calendario";
import {
  obtenerCicloEscolarAction,
  guardarCicloEscolarAction,
  listarFechasNoLaboralesAction,
  guardarFechaNoLaboralAction,
  eliminarFechaNoLaboralAction,
  listarPeriodosVacacionalesAction,
  guardarPeriodoVacacionalAction,
} from "./actions";

type Tab = "ciclo" | "fechas" | "vacaciones";

function formatoFecha(fecha: string) {
  try {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return fecha;
  }
}

function TabCicloEscolar() {
  const [ciclo, setCiclo] = useState<CicloEscolar | null>(null);
  const [cargando, setCargando] = useState(true);
  const [anioEscolar, setAnioEscolar] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaCierre, setFechaCierre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    obtenerCicloEscolarAction().then((res) => {
      if (res.ok && res.data) {
        setCiclo(res.data);
        setAnioEscolar(res.data.anioEscolar);
        setFechaInicio(res.data.fechaInicio || "");
        setFechaCierre(res.data.fechaCierre || "");
      }
      setCargando(false);
    });
  }, []);

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setExito(false);
    startTransition(async () => {
      const res = await guardarCicloEscolarAction({ anioEscolar, fechaInicio, fechaCierre });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setExito(true);
    });
  }

  if (cargando) return <p className="text-sm text-gardner-gris/65">Cargando…</p>;

  return (
    <form onSubmit={guardar} className="flex max-w-md flex-col gap-3 rounded-xl bg-white p-5 shadow-sm">
      {!ciclo && (
        <p className="rounded-lg bg-gardner-azul/5 px-3 py-2 text-xs text-gardner-azul-oscuro">
          Todavía no hay un ciclo escolar registrado.
        </p>
      )}
      <div>
        <label className="mb-1 block text-xs font-semibold text-gardner-gris/70">Año escolar</label>
        <input
          required
          value={anioEscolar}
          onChange={(e) => setAnioEscolar(e.target.value)}
          placeholder="Ej. 2026-2027"
          className="w-full rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-gardner-gris/70">Fecha de inicio</label>
          <input
            required
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-gardner-gris/70">Fecha de cierre</label>
          <input
            required
            type="date"
            value={fechaCierre}
            onChange={(e) => setFechaCierre(e.target.value)}
            className="w-full rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
          />
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {exito && <p className="rounded-lg bg-estado-puntual/10 px-3 py-2 text-sm text-estado-puntual">Guardado.</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-gardner-azul px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        Guardar ciclo escolar
      </button>
    </form>
  );
}

function TabFechasNoLaborales() {
  const [fechas, setFechas] = useState<FechaNoLaboral[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fecha, setFecha] = useState("");
  const [tipoDia, setTipoDia] = useState("");
  const [aplicaA, setAplicaA] = useState("Ambos");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function cargar() {
    setCargando(true);
    listarFechasNoLaboralesAction().then((res) => {
      setFechas(res.ok ? res.data : []);
      setCargando(false);
    });
  }

  useEffect(() => {
    cargar();
  }, []);

  function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await guardarFechaNoLaboralAction({ fecha, tipoDia, aplicaA });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFecha("");
      setTipoDia("");
      setAplicaA("Ambos");
      cargar();
    });
  }

  function eliminar(id: string) {
    startTransition(async () => {
      const res = await eliminarFechaNoLaboralAction(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      cargar();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={agregar} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gardner-gris/70">Fecha</label>
          <input
            required
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gardner-gris/70">Tipo de día</label>
          <input
            required
            value={tipoDia}
            onChange={(e) => setTipoDia(e.target.value)}
            placeholder="Ej. Suspensión, Puente, Evento especial"
            className="w-56 rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gardner-gris/70">Aplica a</label>
          <select
            value={aplicaA}
            onChange={(e) => setAplicaA(e.target.value)}
            className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
          >
            <option value="Ambos">Ambos</option>
            <option value="Alumnos">Alumnos</option>
            <option value="Docentes">Docentes</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-gardner-azul px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Agregar / actualizar
        </button>
      </form>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {cargando && <p className="text-sm text-gardner-gris/65">Cargando…</p>}
      {!cargando && fechas.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-gardner-gris/75">
          No hay fechas no laborales registradas.
        </p>
      )}
      <div className="flex flex-col divide-y divide-gardner-gris/15 rounded-xl bg-white shadow-sm">
        {fechas.map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-gardner-gris">{formatoFecha(f.fecha)}</p>
              <p className="text-xs text-gardner-gris/65">
                {f.tipoDia} · {f.aplicaA}
              </p>
            </div>
            <button
              onClick={() => eliminar(f.id)}
              disabled={isPending}
              className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabPeriodosVacacionales() {
  const [periodos, setPeriodos] = useState<PeriodoVacacional[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tipoDia, setTipoDia] = useState("Vacaciones Diciembre");
  const [aplicaA, setAplicaA] = useState("Alumnos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function cargar() {
    setCargando(true);
    listarPeriodosVacacionalesAction().then((res) => {
      setPeriodos(res.ok ? res.data : []);
      setCargando(false);
    });
  }

  useEffect(() => {
    cargar();
  }, []);

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setExito(null);
    startTransition(async () => {
      const res = await guardarPeriodoVacacionalAction({ tipoDia, aplicaA, fechaInicio, fechaFin });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setExito(`Guardado: ${res.data.diasGuardados} días.`);
      setFechaInicio("");
      setFechaFin("");
      cargar();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={guardar} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gardner-gris/70">Periodo</label>
          <select
            value={tipoDia}
            onChange={(e) => setTipoDia(e.target.value)}
            className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
          >
            <option value="Vacaciones Diciembre">Vacaciones Diciembre</option>
            <option value="Vacaciones Pascua">Vacaciones Pascua</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gardner-gris/70">Aplica a</label>
          <select
            value={aplicaA}
            onChange={(e) => setAplicaA(e.target.value)}
            className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
          >
            <option value="Alumnos">Alumnos</option>
            <option value="Docentes">Docentes</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gardner-gris/70">Del</label>
          <input
            required
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gardner-gris/70">Al</label>
          <input
            required
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-gardner-azul px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Guardar periodo
        </button>
      </form>

      <p className="text-xs text-gardner-gris/65">
        Guardar un periodo reemplaza por completo el rango anterior para esa combinación de periodo + audiencia.
      </p>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {exito && <p className="rounded-lg bg-estado-puntual/10 px-3 py-2 text-sm text-estado-puntual">{exito}</p>}

      {cargando && <p className="text-sm text-gardner-gris/65">Cargando…</p>}
      {!cargando && periodos.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-gardner-gris/75">
          No hay periodos vacacionales registrados.
        </p>
      )}
      <div className="flex flex-col divide-y divide-gardner-gris/15 rounded-xl bg-white shadow-sm">
        {periodos.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-gardner-gris">
                {p.tipoDia} · {p.aplicaA}
              </p>
              <p className="text-xs text-gardner-gris/65">
                {formatoFecha(p.fechaInicio)} — {formatoFecha(p.fechaFin)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalendarioClient() {
  const [tab, setTab] = useState<Tab>("ciclo");

  const tabs: { id: Tab; label: string }[] = [
    { id: "ciclo", label: "Ciclo escolar" },
    { id: "fechas", label: "Fechas no laborales" },
    { id: "vacaciones", label: "Periodos vacacionales" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gardner-gris">Calendario</h1>
        <p className="text-sm text-gardner-gris/75">
          Define el ciclo escolar, días sin clase y vacaciones — afecta directamente el cálculo de asistencia.
        </p>
      </div>

      <div className="flex gap-1 border-b border-gardner-gris/15">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "border-b-2 border-gardner-azul text-gardner-azul-oscuro"
                : "text-gardner-gris/65 hover:text-gardner-azul-oscuro"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "ciclo" && <TabCicloEscolar />}
      {tab === "fechas" && <TabFechasNoLaborales />}
      {tab === "vacaciones" && <TabPeriodosVacacionales />}
    </div>
  );
}
