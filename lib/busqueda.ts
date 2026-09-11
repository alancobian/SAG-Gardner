// Búsqueda global del panel (la barra de la topbar).
//
// Devuelve alumnos y docentes juntos, cada uno con la ruta a la que hay que
// llevar al usuario cuando elige un resultado. La idea es que desde cualquier
// pantalla se pueda llegar a una persona sin navegar a mano hasta su sección.

import { supaGet, ilikeP, qs } from "./supabaseAdmin";
import { filtroNivel, tieneAccesoTotal } from "./niveles";

export type ResultadoBusqueda = {
  id: string;
  tipo: "alumno" | "docente";
  nombre: string;
  // Línea secundaria: grupo del alumno o nivel del docente.
  detalle: string;
  foto: string | null;
  href: string;
};

type AlumnoRow = {
  id: string;
  nombre: string;
  foto_url: string | null;
  grupo: { nombre: string } | null;
};

type DocenteRow = {
  id: string;
  nombre: string;
  foto_url: string | null;
  nivel_academico: string | null;
};

export async function buscarEnTodoElSistema(
  termino: string,
  niveles?: string[]
): Promise<ResultadoBusqueda[]> {
  const texto = termino.trim();
  // Con una sola letra la lista sale enorme y no ayuda a nadie.
  if (texto.length < 2) return [];

  // El buscador es la vía más fácil de toparse con alguien de otro nivel, así
  // que respeta el alcance igual que los listados.
  const [alumnos, docentes] = await Promise.all([
    supaGet<AlumnoRow>(
      "alumnos",
      qs([
        ilikeP("nombre", texto),
        tieneAccesoTotal(niveles)
          ? "select=id,nombre,foto_url,grupo:grupos(nombre)"
          : "select=id,nombre,foto_url,grupo:grupos!inner(nombre)",
        filtroNivel(niveles, "grupo.nivel_academico"),
        "order=nombre.asc",
        "limit=8",
      ])
    ),
    supaGet<DocenteRow>(
      "docentes",
      qs([
        ilikeP("nombre", texto),
        "select=id,nombre,foto_url,nivel_academico",
        filtroNivel(niveles),
        "order=nombre.asc",
        "limit=6",
      ])
    ),
  ]);

  return [
    ...alumnos.map((a) => ({
      id: a.id,
      tipo: "alumno" as const,
      nombre: a.nombre,
      detalle: a.grupo ? a.grupo.nombre : "Sin grupo",
      foto: a.foto_url || null,
      // La sección lee ?alumno= para abrir la ficha directamente.
      href: `/grupos-alumnos?alumno=${a.id}`,
    })),
    ...docentes.map((d) => ({
      id: d.id,
      tipo: "docente" as const,
      nombre: d.nombre,
      detalle: d.nivel_academico || "Sin nivel asignado",
      foto: d.foto_url || null,
      href: `/docentes?docente=${d.id}`,
    })),
  ];
}
