"use client";

// Alta de un docente suelto, para las contrataciones a media de año. Reutiliza
// la misma importación que la carga masiva con una sola fila, para que el
// docente nuevo quede idéntico a los que entran por CSV.

import { useState, useTransition } from "react";
import type { ResultadoImportacion } from "@/lib/importar";
import { NIVELES } from "@/lib/niveles";
import { importarDocentesAction } from "./actions";

export default function AltaDocenteIndividual({ onAlta }: { onAlta?: () => void }) {
  const [nombre, setNombre] = useState("");
  const [nivelAcademico, setNivelAcademico] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<ResultadoImportacion | null>(null);
  const [isPending, startTransition] = useTransition();

  function limpiar() {
    setNombre("");
    setNivelAcademico("");
    setTelefono("");
    setCorreo("");
  }

  function onGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreado(null);
    startTransition(async () => {
      const res = await importarDocentesAction([
        {
          nombre,
          nivelAcademico: nivelAcademico || undefined,
          telefono: telefono.trim() || undefined,
          correo: correo.trim() || undefined,
        },
      ]);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const resultado = res.data[0];
      if (!resultado.ok) {
        setError(resultado.error ?? "No se pudo dar de alta al docente");
        return;
      }
      setCreado(resultado);
      limpiar();
      onAlta?.();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {creado && creado.codigoQr && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-estado-puntual/30 bg-estado-puntual/5 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/qr?codigo=${encodeURIComponent(creado.codigoQr)}`}
            alt={`Código QR de ${creado.nombre}`}
            className="h-24 w-24 rounded-lg bg-white p-1.5 shadow-sm"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-estado-puntual">{creado.nombre} quedó registrado</p>
            <p className="mt-0.5 font-mono text-xs text-gardner-gris/70">{creado.codigoQr}</p>
            <p className="mt-1 text-xs text-gardner-gris/65">
              Descarga su credencial e imprímela; sin ella no puede checar su entrada.
            </p>
            <a
              href={`/api/qr?codigo=${encodeURIComponent(creado.codigoQr)}&nombre=${encodeURIComponent(creado.nombre)}&download=1`}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gardner-azul px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gardner-azul-oscuro"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Descargar credencial
            </a>
          </div>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={onGuardar} className="flex flex-col gap-5 rounded-xl bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gardner-gris/75">Nombre completo</label>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellidos"
              className="rounded-lg border border-gardner-gris/25 px-3 py-2.5 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gardner-gris/75">Nivel académico</label>
            <select
              value={nivelAcademico}
              onChange={(e) => setNivelAcademico(e.target.value)}
              className="rounded-lg border border-gardner-gris/25 px-3 py-2.5 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
            >
              <option value="">Sin nivel asignado</option>
              {NIVELES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gardner-gris/55">
              Determina quién puede verlo cuando hay direcciones por nivel.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gardner-gris/75">Teléfono (opcional)</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+52 938 000 0000"
              className="rounded-lg border border-gardner-gris/25 px-3 py-2.5 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gardner-gris/75">Correo (opcional)</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="nombre@institutogardner.edu.mx"
              className="rounded-lg border border-gardner-gris/25 px-3 py-2.5 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-gardner-gris/15 pt-4">
          <button
            type="submit"
            disabled={isPending || !nombre.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-gardner-azul px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gardner-azul-oscuro disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">badge</span>
            {isPending ? "Registrando…" : "Registrar docente"}
          </button>
          <button
            type="button"
            onClick={() => {
              limpiar();
              setError(null);
              setCreado(null);
            }}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gardner-gris/75 transition hover:bg-gardner-gris/10"
          >
            Limpiar
          </button>
        </div>
      </form>
    </div>
  );
}
