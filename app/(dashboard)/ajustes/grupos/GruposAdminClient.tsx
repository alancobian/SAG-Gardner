"use client";

// Ajustes → Grupos. Dos cosas que antes solo se podían hacer con SQL a mano:
// asignar los titulares de cada grupo y borrar grupos que quedaron vacíos.
//
// Primaria es bilingüe y lleva dos titulares por grupo (Español e Inglés);
// Secundaria y Preparatoria, uno. Ver migración 4.

import { useCallback, useEffect, useState, useTransition } from "react";
import type { GrupoAdmin, RolTitular } from "@/lib/grupos";
import { admiteTitularIngles, etiquetaTitular } from "@/lib/grupos";
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

  // Los titulares no se cambian al vuelo: hay que entrar en modo edición en esa
  // fila y guardar. Así nadie reasigna un grupo por rozar el desplegable.
  const [editando, setEditando] = useState<string | null>(null);
  const [titularBorrador, setTitularBorrador] = useState("");
  const [inglesBorrador, setInglesBorrador] = useState("");

  function empezarEdicion(g: GrupoAdmin) {
    setEditando(g.id);
    setTitularBorrador(g.docenteTitularId ?? "");
    setInglesBorrador(g.docenteTitularInglesId ?? "");
    setError(null);
    setAviso(null);
  }

  function cancelarEdicion() {
    setEditando(null);
    setTitularBorrador("");
    setInglesBorrador("");
  }

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

  function onGuardarTitulares(g: GrupoAdmin) {
    setError(null);
    setAviso(null);

    const dosIdiomas = admiteTitularIngles(g.nivelAcademico);
    if (dosIdiomas && titularBorrador && titularBorrador === inglesBorrador) {
      setError("El titular de Español y el de Inglés tienen que ser personas distintas.");
      return;
    }

    // Solo se envía lo que de verdad cambió: así un grupo de Secundaria nunca
    // toca la columna de inglés, y no se escribe de más sin necesidad.
    const cambios: { rol: RolTitular; docenteId: string | null }[] = [];
    if ((titularBorrador || null) !== g.docenteTitularId) {
      cambios.push({ rol: "titular", docenteId: titularBorrador || null });
    }
    if (dosIdiomas && (inglesBorrador || null) !== g.docenteTitularInglesId) {
      cambios.push({ rol: "ingles", docenteId: inglesBorrador || null });
    }

    if (cambios.length === 0) {
      cancelarEdicion();
      return;
    }

    startTransition(async () => {
      for (const c of cambios) {
        const res = await asignarDocenteTitularAction(g.id, c.docenteId, c.rol);
        if (!res.ok) {
          setError(res.error);
          await recargar();
          return;
        }
      }
      setAviso(`Se actualizaron los titulares de ${g.nombre}.`);
      cancelarEdicion();
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
        {/* "Completo" significa cosas distintas según el nivel: en Primaria
            hacen falta los dos titulares, en el resto basta uno. */}
        <span className="rounded-full bg-gardner-gris/10 px-3 py-1">
          {
            grupos.filter((g) =>
              admiteTitularIngles(g.nivelAcademico)
                ? g.docenteTitular && g.docenteTitularIngles
                : g.docenteTitular
            ).length
          }{" "}
          de {grupos.length} con titulares completos
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
              <th className="px-4 py-3">Titulares del grupo</th>
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
                  {editando === g.id ? (
                    <div className="flex flex-col gap-2">
                      <SelectorTitular
                        etiqueta={etiquetaTitular(g.nivelAcademico)}
                        valor={titularBorrador}
                        onChange={setTitularBorrador}
                        docentes={docentes}
                        deshabilitado={isPending}
                        autoFocus
                      />
                      {admiteTitularIngles(g.nivelAcademico) && (
                        <SelectorTitular
                          etiqueta="Titular de Inglés"
                          valor={inglesBorrador}
                          onChange={setInglesBorrador}
                          docentes={docentes}
                          deshabilitado={isPending}
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onGuardarTitulares(g)}
                          disabled={isPending}
                          className="rounded-lg bg-gardner-azul px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gardner-azul-oscuro disabled:opacity-60"
                        >
                          {isPending ? "Guardando…" : "Guardar"}
                        </button>
                        <button
                          onClick={cancelarEdicion}
                          disabled={isPending}
                          className="rounded-lg px-2 py-1.5 text-xs font-medium text-gardner-gris/70 transition hover:bg-gardner-gris/10"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <NombreTitular
                          etiqueta={admiteTitularIngles(g.nivelAcademico) ? "Español" : null}
                          nombre={g.docenteTitular}
                        />
                        {admiteTitularIngles(g.nivelAcademico) && (
                          <NombreTitular etiqueta="Inglés" nombre={g.docenteTitularIngles} />
                        )}
                      </div>
                      <button
                        onClick={() => empezarEdicion(g)}
                        disabled={isPending || editando !== null}
                        title="Cambiar los titulares de este grupo"
                        className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gardner-azul-oscuro transition hover:bg-gardner-azul/10 disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                        Editar
                      </button>
                    </div>
                  )}
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
                      // Mientras se edita un tutor no se puede borrar nada, para
                      // que no se confundan las dos acciones en la misma fila.
                      disabled={g.alumnos > 0 || editando !== null}
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
        Los grupos de Primaria llevan dos titulares —uno de Español y uno de Inglés— porque la enseñanza es bilingüe y
        cada maestro acompaña medio día. Secundaria y Preparatoria llevan uno.
      </p>

      <p className="text-[11px] leading-relaxed text-gardner-gris/55">
        El borrado es definitivo y no se puede deshacer desde el panel. Por eso solo se habilita en grupos sin alumnos, y
        tampoco procede si el grupo tiene comunicados enviados, para no perder ese historial.
      </p>
    </div>
  );
}

/** Un desplegable de docente, con su etiqueta de rol encima. */
function SelectorTitular({
  etiqueta,
  valor,
  onChange,
  docentes,
  deshabilitado,
  autoFocus,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  docentes: Docente[];
  deshabilitado: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gardner-gris/55">
        {etiqueta}
      </span>
      <select
        autoFocus={autoFocus}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        disabled={deshabilitado}
        className="w-full max-w-[220px] rounded-lg border border-gardner-azul bg-white px-2.5 py-1.5 text-xs text-gardner-gris outline-none ring-2 ring-gardner-azul/20 disabled:opacity-60"
      >
        <option value="">Sin asignar</option>
        {docentes.map((d) => (
          <option key={d.id} value={d.id}>
            {d.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Nombre del titular en modo lectura. La etiqueta de idioma solo aparece en
 * Primaria: en los demás niveles hay uno solo y ponerle "Titular" sería ruido.
 */
function NombreTitular({ etiqueta, nombre }: { etiqueta: string | null; nombre: string | null }) {
  return (
    <div className="flex items-baseline gap-1.5">
      {etiqueta && (
        <span className="shrink-0 rounded bg-gardner-azul/10 px-1.5 py-0.5 text-[10px] font-semibold text-gardner-azul-oscuro">
          {etiqueta}
        </span>
      )}
      <span
        className={`truncate text-xs ${
          nombre ? "font-medium text-gardner-gris" : "italic text-gardner-gris/45"
        }`}
      >
        {nombre ?? "Sin asignar"}
      </span>
    </div>
  );
}
