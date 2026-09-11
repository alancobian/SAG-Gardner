"use client";

// Ajustes → Grupos. Dos cosas que antes solo se podían hacer con SQL a mano:
// asignar el tutor de cada grupo y borrar grupos que quedaron vacíos.

import { useCallback, useEffect, useState, useTransition } from "react";
import type { GrupoAdmin } from "@/lib/grupos";
import type { Docente } from "@/lib/docentes";
import {
  listarGruposAdminAction,
  listarDocentesParaTitularAction,
  asignarDocenteTitularAction,
  eliminarGrupoAction,
} from "./actions";

export default function GruposAdminClient() {
  const [grupos, setGrupos] = useState<GrupoAdmin[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const recargar = useCallback(async () => {
    const [resGrupos, resDocentes] = await Promise.all([
      listarGruposAdminAction(),
      listarDocentesParaTitularAction(),
    ]);
    if (resGrupos.ok) setGrupos(resGrupos.data);
    else setError(resGrupos.error);
    if (resDocentes.ok) setDocentes(resDocentes.data);
    setCargando(false);
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  function onAsignarTutor(grupoId: string, docenteId: string) {
    setError(null);
    setAviso(null);
    startTransition(async () => {
      const res = await asignarDocenteTitularAction(grupoId, docenteId || null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await recargar();
    });
  }

  function onEliminar(g: GrupoAdmin) {
    setError(null);
    setAviso(null);
    startTransition(async () => {
      const res = await eliminarGrupoAction(g.id);
      if (!res.ok) {
        setError(res.error);
        setConfirmando(null);
        return;
      }
      setConfirmando(null);
      setAviso(`Grupo “${g.nombre}” eliminado.`);
      await recargar();
    });
  }

  if (cargando) return <p className="text-sm text-gardner-gris/65">Cargando grupos…</p>;

  const vacios = grupos.filter((g) => g.alumnos === 0).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-bold text-gardner-gris">Grupos</h2>
        <p className="mt-1 text-xs text-gardner-gris/70">
          Asigna el tutor de cada grupo y elimina los que hayan quedado vacíos. Un grupo con alumnos no se puede borrar.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {aviso && (
        <p className="rounded-lg bg-estado-puntual/10 px-3 py-2 text-sm font-medium text-estado-puntual">{aviso}</p>
      )}

      <div className="flex flex-wrap gap-3 text-xs font-medium text-gardner-gris/70">
        <span className="rounded-full bg-gardner-azul/10 px-3 py-1 text-gardner-azul-oscuro">
          {grupos.length} grupos
        </span>
        <span className="rounded-full bg-gardner-gris/10 px-3 py-1">
          {grupos.filter((g) => g.docenteTitular).length} con tutor asignado
        </span>
        {vacios > 0 && (
          <span className="rounded-full bg-estado-retardo/15 px-3 py-1 text-estado-retardo">
            {vacios} sin alumnos
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gardner-gris/15 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gardner-neutro text-left text-[11px] font-semibold uppercase tracking-wide text-gardner-gris/55">
            <tr>
              <th className="px-4 py-3">Grupo</th>
              <th className="px-4 py-3">Nivel</th>
              <th className="px-4 py-3">Alumnos</th>
              <th className="px-4 py-3">Tutor del grupo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => (
              <tr key={g.id} className="border-t border-gardner-gris/10">
                <td className="px-4 py-3 font-semibold text-gardner-gris">{g.nombre}</td>
                <td className="px-4 py-3 text-gardner-gris/70">{g.nivelAcademico}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      g.alumnos === 0
                        ? "bg-estado-retardo/15 text-estado-retardo"
                        : "bg-gardner-gris/10 text-gardner-gris/75"
                    }`}
                  >
                    {g.alumnos}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={g.docenteTitularId ?? ""}
                    onChange={(e) => onAsignarTutor(g.id, e.target.value)}
                    disabled={isPending}
                    className="w-full max-w-[240px] rounded-lg border border-gardner-gris/25 px-2.5 py-1.5 text-xs text-gardner-gris outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20 disabled:opacity-60"
                  >
                    <option value="">Sin asignar</option>
                    {docentes.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  {confirmando === g.id ? (
                    <span className="flex items-center justify-end gap-2">
                      <span className="text-xs text-gardner-gris/70">¿Seguro?</span>
                      <button
                        onClick={() => onEliminar(g)}
                        disabled={isPending}
                        className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                      >
                        Sí, borrar
                      </button>
                      <button
                        onClick={() => setConfirmando(null)}
                        className="text-xs text-gardner-gris/65 hover:underline"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmando(g.id)}
                      disabled={g.alumnos > 0}
                      title={
                        g.alumnos > 0
                          ? "Solo se pueden borrar grupos sin alumnos"
                          : "Eliminar este grupo vacío"
                      }
                      className="flex items-center gap-1 text-xs font-medium text-red-600 transition hover:underline disabled:cursor-not-allowed disabled:text-gardner-gris/30 disabled:no-underline"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-relaxed text-gardner-gris/55">
        El borrado es definitivo y no se puede deshacer desde el panel. Por eso solo se habilita en grupos sin alumnos, y
        tampoco procede si el grupo tiene comunicados enviados, para no perder ese historial.
      </p>
    </div>
  );
}
