"use client";

import { useRef, useState, useTransition } from "react";
import { parseCSV, filasComoObjetos, generarPlantillaCSV } from "@/lib/csv";
import type { FilaImportacionAlumno, ResultadoImportacion } from "@/lib/importar";
import { importarAlumnosAction } from "./actions";

const ALIASES: Record<string, keyof FilaImportacionAlumno> = {
  nombre: "nombre",
  nombrecompleto: "nombre",
  grupo: "grupo",
  grado: "grado",
  nivelacademico: "nivelAcademico",
  nivel: "nivelAcademico",
  tutor: "tutorNombre",
  tutornombre: "tutorNombre",
  nombretutor: "tutorNombre",
  tutortelefono: "tutorTelefono",
  telefonotutor: "tutorTelefono",
  tutorcorreo: "tutorCorreo",
  correotutor: "tutorCorreo",
};

function descargarPlantilla() {
  const csv = generarPlantillaCSV(
    ["nombre", "grupo", "grado", "nivelAcademico", "tutorNombre", "tutorTelefono", "tutorCorreo"],
    ["Pérez López Juan", "1° grado A", "1° grado", "Primaria", "Pérez García María", "9991234567", "maria@correo.com"]
  );
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla-alumnos.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CargarAlumnosClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filas, setFilas] = useState<FilaImportacionAlumno[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [resultados, setResultados] = useState<ResultadoImportacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setError(null);
    setResultados(null);
    setNombreArchivo(archivo.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const texto = String(reader.result || "");
        const csv = parseCSV(texto);
        const objetos = filasComoObjetos<FilaImportacionAlumno>(csv, ALIASES).filter((f) => f.nombre);
        if (objetos.length === 0) {
          setError("No se encontraron filas con nombre. Revisa que el CSV tenga una columna 'nombre'.");
          setFilas([]);
          return;
        }
        setFilas(objetos);
      } catch {
        setError("No se pudo leer el archivo. Verifica que sea un CSV válido.");
      }
    };
    reader.readAsText(archivo, "utf-8");
  }

  function importar() {
    setError(null);
    startTransition(async () => {
      const res = await importarAlumnosAction(filas);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResultados(res.data);
    });
  }

  function reiniciar() {
    setFilas([]);
    setNombreArchivo(null);
    setResultados(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const exitosos = resultados?.filter((r) => r.ok).length ?? 0;
  const fallidos = resultados?.filter((r) => !r.ok).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gardner-gris">Cargar alumnos</h1>
        <p className="text-sm text-gardner-gris/75">
          Da de alta varios alumnos a la vez desde un archivo CSV. Los grupos y tutores nuevos se crean automáticamente.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
        <button
          onClick={descargarPlantilla}
          className="rounded-lg border border-gardner-azul/30 px-4 py-2 text-sm font-medium text-gardner-azul hover:bg-gardner-azul/5"
        >
          Descargar plantilla CSV
        </button>
        <label className="cursor-pointer rounded-lg bg-gardner-azul px-4 py-2 text-sm font-semibold text-white hover:bg-gardner-azul-oscuro">
          Elegir archivo CSV
          <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={onArchivo} className="hidden" />
        </label>
        {nombreArchivo && <span className="text-sm text-gardner-gris/75">{nombreArchivo}</span>}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {filas.length > 0 && !resultados && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gardner-gris">Vista previa — {filas.length} alumnos detectados</p>
          <div className="max-h-80 overflow-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gardner-gris/15 text-xs uppercase tracking-wide text-gardner-gris/55">
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2">Grupo</th>
                  <th className="px-4 py-2">Tutor</th>
                </tr>
              </thead>
              <tbody>
                {filas.slice(0, 50).map((f, i) => (
                  <tr key={i} className="border-t border-gardner-gris/15">
                    <td className="px-4 py-2 text-gardner-gris">{f.nombre}</td>
                    <td className="px-4 py-2 text-gardner-gris/70">{f.grupo || "—"}</td>
                    <td className="px-4 py-2 text-gardner-gris/70">{f.tutorNombre || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filas.length > 50 && (
              <p className="px-4 py-2 text-xs text-gardner-gris/55">y {filas.length - 50} más…</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={importar}
              disabled={isPending}
              className="rounded-lg bg-gardner-azul px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? "Importando…" : `Importar ${filas.length} alumnos`}
            </button>
            <button
              onClick={reiniciar}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gardner-gris/75 hover:bg-gardner-gris/10"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {resultados && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gardner-gris">
            Resultado: {exitosos} importados · {fallidos} con error
          </p>
          <div className="max-h-96 overflow-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gardner-gris/15 text-xs uppercase tracking-wide text-gardner-gris/55">
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((r, i) => (
                  <tr key={i} className="border-t border-gardner-gris/15">
                    <td className="px-4 py-2 text-gardner-gris">{r.nombre}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.ok ? "bg-estado-puntual/10 text-estado-puntual" : "bg-red-50 text-red-600"
                        }`}
                      >
                        {r.ok ? "OK" : "Error"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gardner-gris/75">{r.ok ? r.codigoQr : r.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={reiniciar}
            className="self-start rounded-lg bg-gardner-azul px-4 py-2 text-sm font-semibold text-white hover:bg-gardner-azul-oscuro"
          >
            Cargar otro archivo
          </button>
        </div>
      )}
    </div>
  );
}
