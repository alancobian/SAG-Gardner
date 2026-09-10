"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FichaAlumno, TutorEdicion } from "@/lib/alumnos";
import type { Grupo } from "@/lib/grupos";
import { obtenerFichaAlumnoAction, actualizarAlumnoAction, eliminarAlumnoAction, listarGruposAction } from "../../actions";

const ESTATUS_OPCIONES = [
  {
    valor: "Activo",
    etiqueta: "Activo",
    activa: "border-estado-puntual bg-estado-puntual/10 text-estado-puntual",
  },
  {
    valor: "Inactivo",
    etiqueta: "Inactivo",
    activa: "border-estado-ausente bg-estado-ausente/10 text-gardner-gris",
  },
  {
    valor: "Baja",
    etiqueta: "Baja",
    activa: "border-estado-retardo bg-estado-retardo/10 text-estado-retardo",
  },
];

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function EditarAlumnoClient({ alumnoId }: { alumnoId: string }) {
  const router = useRouter();
  const [ficha, setFicha] = useState<FichaAlumno | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [nombre, setNombre] = useState("");
  const [estatus, setEstatus] = useState("Activo");
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoId, setGrupoId] = useState("");
  const [tutores, setTutores] = useState<TutorEdicion[]>([]);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  useEffect(() => {
    obtenerFichaAlumnoAction(alumnoId).then((res) => {
      if (res.ok) {
        setFicha(res.data);
        setNombre(res.data.nombre);
        setEstatus(res.data.estatus);
        setGrupoId(res.data.grupo?.id ?? "");
        setTutores(
          res.data.tutores.map((t) => ({
            id: t.id,
            nombre: t.nombre,
            telefono: t.telefono || "",
            correo: t.correo || "",
            relacion: t.relacion || "Tutor",
          }))
        );
      } else {
        setError(res.error);
      }
      setCargando(false);
    });
    listarGruposAction().then((res) => {
      if (res.ok) setGrupos(res.data);
    });
  }, [alumnoId]);

  // Los grupos ya vienen agrupados/ordenados por nivel académico desde
  // listarGrupos(); solo se necesita la lista de niveles en ese mismo orden
  // para armar los <optgroup> del selector.
  const nivelesConGrupos = Array.from(new Set(grupos.map((g) => g.nivelAcademico)));

  function guardar() {
    setError(null);
    setGuardado(false);
    startTransition(async () => {
      const res = await actualizarAlumnoAction(alumnoId, {
        nombre,
        estatus,
        grupoId: grupoId || undefined,
        tutores: tutores.filter((t) => t.nombre.trim()),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setGuardado(true);
      router.push("/grupos-alumnos");
      router.refresh();
    });
  }

  function eliminar() {
    startTransition(async () => {
      const res = await eliminarAlumnoAction(alumnoId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/grupos-alumnos");
      router.refresh();
    });
  }

  if (cargando) {
    return <p className="text-sm text-gardner-gris/65">Cargando…</p>;
  }

  if (!ficha) {
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error ?? "Alumno no encontrado"}</p>;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/grupos-alumnos"
          className="flex h-9 w-9 items-center justify-center rounded-full text-gardner-gris/75 transition hover:bg-gardner-gris/10"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gardner-gris">Editar alumno</h1>
          <p className="text-sm text-gardner-gris/75">Actualiza los datos, el estatus y los tutores del alumno.</p>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {guardado && <p className="rounded-lg bg-estado-puntual/10 px-3 py-2 text-sm text-estado-puntual">Cambios guardados.</p>}

      <div className="flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gardner-azul text-xl font-bold text-white">
              {iniciales(nombre || ficha.nombre)}
            </div>
            <button
              type="button"
              title="La carga de fotografías todavía no está disponible en este panel"
              disabled
              className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-full bg-white text-gardner-gris/55 shadow ring-1 ring-gardner-gris/20"
            >
              <span className="material-symbols-outlined text-[16px]">photo_camera</span>
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gardner-gris/75">Nombre completo</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-72 rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
            />
            <p className="text-xs text-gardner-gris/55">{ficha.codigoQr}</p>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-gardner-gris/75">Estatus</label>
          <div className="flex gap-2">
            {ESTATUS_OPCIONES.map((op) => (
              <button
                key={op.valor}
                type="button"
                onClick={() => setEstatus(op.valor)}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  estatus === op.valor ? op.activa : "border-gardner-gris/25 text-gardner-gris/75 hover:bg-gardner-gris/10"
                }`}
              >
                {op.etiqueta}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-gardner-gris/75">Grado y grupo</label>
          <select
            value={grupoId}
            onChange={(e) => setGrupoId(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm outline-none focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
          >
            {!grupoId && <option value="">Sin grupo</option>}
            {nivelesConGrupos.map((nivel) => (
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
          <p className="mt-1.5 text-xs text-gardner-gris/55">
            Cambiar el grupo también actualiza el grado y el nivel académico del alumno, ya que cada grupo ya
            corresponde a un grado y nivel específicos.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gardner-gris">Tutores</h3>
            <button
              type="button"
              onClick={() => setTutores([...tutores, { nombre: "", telefono: "", correo: "", relacion: "Tutor" }])}
              className="flex items-center gap-1 text-xs font-medium text-gardner-azul hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Agregar tutor
            </button>
          </div>
          {tutores.length === 0 && <p className="text-xs text-gardner-gris/65">Sin tutores registrados.</p>}
          <ul className="flex flex-col gap-3">
            {tutores.map((t, i) => (
              <li key={t.id ?? `nuevo-${i}`} className="flex items-start gap-2 rounded-xl border border-gardner-gris/15 p-3">
                <div className="flex flex-1 flex-col gap-2">
                  <input
                    placeholder="Nombre"
                    value={t.nombre}
                    onChange={(e) => {
                      const copia = [...tutores];
                      copia[i] = { ...copia[i], nombre: e.target.value };
                      setTutores(copia);
                    }}
                    className="rounded-lg border border-gardner-gris/25 px-3 py-1.5 text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      placeholder="Teléfono"
                      value={t.telefono ?? ""}
                      onChange={(e) => {
                        const copia = [...tutores];
                        copia[i] = { ...copia[i], telefono: e.target.value };
                        setTutores(copia);
                      }}
                      className="w-1/2 rounded-lg border border-gardner-gris/25 px-3 py-1.5 text-sm"
                    />
                    <input
                      placeholder="Correo"
                      value={t.correo ?? ""}
                      onChange={(e) => {
                        const copia = [...tutores];
                        copia[i] = { ...copia[i], correo: e.target.value };
                        setTutores(copia);
                      }}
                      className="w-1/2 rounded-lg border border-gardner-gris/25 px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTutores(tutores.filter((_, idx) => idx !== i))}
                  className="rounded-full p-1.5 text-gardner-gris/55 hover:bg-red-50 hover:text-red-500"
                  title="Quitar tutor"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3 border-t border-gardner-gris/15 pt-5">
          <button
            onClick={guardar}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-gardner-azul px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gardner-azul-oscuro disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            Guardar cambios
          </button>
          <Link
            href="/grupos-alumnos"
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gardner-gris/75 hover:bg-gardner-gris/10"
          >
            Cancelar
          </Link>
          <div className="ml-auto">
            {confirmarEliminar ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gardner-gris/75">¿Eliminar definitivamente?</span>
                <button onClick={eliminar} disabled={isPending} className="text-xs font-semibold text-red-500 hover:underline">
                  Sí, eliminar
                </button>
                <button onClick={() => setConfirmarEliminar(false)} className="text-xs text-gardner-gris/65 hover:underline">
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmarEliminar(true)}
                className="flex items-center gap-1 text-xs font-medium text-red-500 hover:underline"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Eliminar alumno
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
