"use client";

// Alta de una persona suelta. Reutiliza la misma importación que la carga
// masiva con una sola fila, para que quede idéntica a las que entran por CSV.

import { useState, useTransition } from "react";
import type { ResultadoImportacion } from "@/lib/importar";
import { AREAS_ADMINISTRATIVAS } from "@/lib/personal";
import { importarAdministrativosAction } from "./actions";

export default function AltaAdministrativoIndividual({ onAlta }: { onAlta?: () => void }) {
  const [nombre, setNombre] = useState("");
  const [area, setArea] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<ResultadoImportacion | null>(null);
  const [isPending, startTransition] = useTransition();

  function onGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreado(null);
    startTransition(async () => {
      const res = await importarAdministrativosAction([
        {
          nombre,
          area,
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
        setError(resultado.error ?? "No se pudo dar de alta");
        return;
      }
      setCreado(resultado);
      setNombre("");
      setArea("");
      setTelefono("");
      setCorreo("");
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
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gardner-azul-oscuro hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Descargar credencial
            </a>
          </div>
        </div>
      )}

      <form onSubmit={onGuardar} className="grid gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-semibold text-gardner-gris/70">Nombre completo</span>
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre y apellidos"
            className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gardner-gris/70">Área</span>
          <select
            required
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="rounded-lg border border-gardner-gris/25 bg-white px-3 py-2 text-sm"
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
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-semibold text-gardner-gris/70">Correo (opcional)</span>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 sm:col-span-2">{error}</p>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-gardner-azul px-5 py-2 text-sm font-semibold text-white transition hover:bg-gardner-azul-oscuro disabled:opacity-60"
          >
            {isPending ? "Guardando…" : "Dar de alta y generar QR"}
          </button>
        </div>
      </form>
    </div>
  );
}
