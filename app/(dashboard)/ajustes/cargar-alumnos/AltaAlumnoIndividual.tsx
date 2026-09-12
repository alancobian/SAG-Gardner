"use client";

// Alta de un alumno suelto, para las inscripciones que caen a media de año y
// no justifican armar un CSV.
//
// Diferencia importante con la carga masiva: aquí el grupo se elige de una
// lista, no se escribe. La importación por CSV crea el grupo si no existe, y
// así fue como nació un grupo fantasma llamado "A" con grado "1". Eligiendo de
// la lista eso no puede volver a pasar.

import { useEffect, useState, useTransition } from "react";
import type { Grupo } from "@/lib/grupos";
import type { ResultadoImportacion } from "@/lib/importar";
import { listarGruposAction } from "../../grupos-alumnos/actions";
import { importarAlumnosAction } from "./actions";

export default function AltaAlumnoIndividual({ onAlta }: { onAlta?: () => void }) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [nombre, setNombre] = useState("");
  const [grupoId, setGrupoId] = useState("");
  const [tutorNombre, setTutorNombre] = useState("");
  const [tutorTelefono, setTutorTelefono] = useState("");
  const [tutorCorreo, setTutorCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<ResultadoImportacion | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    listarGruposAction().then((res) => {
      if (res.ok) setGrupos(res.data);
    });
  }, []);

  const niveles = Array.from(new Set(grupos.map((g) => g.nivelAcademico)));

  function limpiar() {
    setNombre("");
    setGrupoId("");
    setTutorNombre("");
    setTutorTelefono("");
    setTutorCorreo("");
  }

  function onGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreado(null);

    const grupo = grupos.find((g) => g.id === grupoId);
    if (!grupo) {
      setError("Elige el grupo del alumno.");
      return;
    }

    startTransition(async () => {
      // Se reutiliza la misma importación de la carga masiva, con una sola
      // fila: así el alumno nuevo queda idéntico a los que entran por CSV
      // (mismo formato de código QR, mismo manejo del tutor).
      const res = await importarAlumnosAction([
        {
          nombre,
          grupo: grupo.nombre,
          grado: grupo.grado,
          nivelAcademico: grupo.nivelAcademico,
          tutorNombre: tutorNombre.trim() || undefined,
          tutorTelefono: tutorTelefono.trim() || undefined,
          tutorCorreo: tutorCorreo.trim() || undefined,
        },
      ]);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const resultado = res.data[0];
      if (!resultado.ok) {
        setError(resultado.error ?? "No se pudo dar de alta al alumno");
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
              Descarga su credencial e imprímela; sin ella no puede checar en la entrada.
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
              placeholder="Apellidos y nombres"
              className="rounded-lg border border-gardner-gris/25 px-3 py-2.5 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gardner-gris/75">Grupo</label>
            <select
              required
              value={grupoId}
              onChange={(e) => setGrupoId(e.target.value)}
              className="rounded-lg border border-gardner-gris/25 px-3 py-2.5 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
            >
              <option value="">Elige un grupo…</option>
              {niveles.map((nivel) => (
                <optgroup key={nivel} label={nivel}>
                  {grupos
                    .filter((g) => g.nivelAcademico === nivel)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nombre}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-gardner-gris/15 pt-4">
          <p className="text-xs font-semibold text-gardner-gris/75">Tutor (opcional)</p>
          <p className="mt-0.5 text-[11px] text-gardner-gris/55">
            Puedes dejarlo vacío y agregarlo después desde la ficha del alumno.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input
              value={tutorNombre}
              onChange={(e) => setTutorNombre(e.target.value)}
              placeholder="Nombre del tutor"
              className="rounded-lg border border-gardner-gris/25 px-3 py-2.5 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
            />
            <input
              value={tutorTelefono}
              onChange={(e) => setTutorTelefono(e.target.value)}
              placeholder="Teléfono"
              className="rounded-lg border border-gardner-gris/25 px-3 py-2.5 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
            />
            <input
              type="email"
              value={tutorCorreo}
              onChange={(e) => setTutorCorreo(e.target.value)}
              placeholder="Correo"
              className="rounded-lg border border-gardner-gris/25 px-3 py-2.5 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-gardner-gris/15 pt-4">
          <button
            type="submit"
            disabled={isPending || !nombre.trim() || !grupoId}
            className="flex items-center gap-1.5 rounded-lg bg-gardner-azul px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gardner-azul-oscuro disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            {isPending ? "Registrando…" : "Registrar alumno"}
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
