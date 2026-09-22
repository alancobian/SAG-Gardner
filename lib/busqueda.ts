// Búsqueda global del panel (la barra de la topbar).
//
// Devuelve alumnos, docentes y personal administrativo juntos, cada uno con la
// ruta a la que hay que llevar al usuario cuando elige un resultado. La idea es
// que desde cualquier pantalla se pueda llegar a una persona sin navegar a mano
// hasta su sección.

import { supaGet, ilikeP, qs } from "./supabaseAdmin";
import { filtroNivel, tieneAccesoTotal } from "./niveles";
import { filtroTipoPersonal } from "./personal";

export type ResultadoBusqueda = {
  id: string;
  tipo: "alumno" | "docente" | "administrativo";
  nombre: string;
  // Línea secundaria: grupo del alumno, nivel del docente o área del personal.
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
  nivel_academico?: string | null;
  departamento?: string | null;
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
  const [alumnos, docentes, administrativos] = await Promise.all([
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
    // Solo docentes: el personal administrativo tiene su propia sección y su
    // propio enlace, así que se busca aparte (ver más abajo).
    supaGet<DocenteRow>(
      "docentes",
      qs([
        ilikeP("nombre", texto),
        "select=id,nombre,foto_url,nivel_academico",
        filtroTipoPersonal("Docente"),
        filtroNivel(niveles),
        "order=nombre.asc",
        "limit=6",
      ])
    ).catch(() =>
      supaGet<DocenteRow>(
        "docentes",
        qs([
          ilikeP("nombre", texto),
          "select=id,nombre,foto_url,nivel_academico",
          filtroNivel(niveles),
          "order=nombre.asc",
          "limit=6",
        ])
      )
    ),
    // El personal administrativo no tiene nivel académico, así que no se le
    // aplica el alcance por nivel: o se ve completo o no se ve.
    supaGet<DocenteRow>(
      "docentes",
      qs([
        ilikeP("nombre", texto),
        "select=id,nombre,foto_url,departamento",
        filtroTipoPersonal("Administrativo"),
        "order=nombre.asc",
        "limit=5",
      ])
    ).catch(() => [] as DocenteRow[]),
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
    ...administrativos.map((d) => ({
      id: d.id,
      tipo: "administrativo" as const,
      nombre: d.nombre,
      detalle: d.departamento || "Sin área asignada",
      foto: d.foto_url || null,
      href: `/administrativos?persona=${d.id}`,
    })),
  ];
}
