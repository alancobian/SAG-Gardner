// Reporte acumulado por alumno en un rango de fechas.
//
// El reporte diario responde "¿quién faltó hoy?", que es la pregunta de
// prefectura. Dirección necesita la otra: "¿quién lleva muchas faltas?".
// La inasistencia acumulada es el primer síntoma de una baja, y ese dato ya
// está en la base -- solo faltaba agregarlo.
//
// Ojo con el denominador: no son los días del rango, son los días lectivos.
// Contar sábados y festivos como faltas convertiría a todos los alumnos en
// casos de riesgo y el reporte no serviría para nada.
//
// Y hay un segundo filtro igual de importante: un día en que NINGÚN alumno del
// grupo fue escaneado no cuenta para ese grupo. No se puede afirmar que un
// alumno faltó un día en que el sistema no se usó en su salón. Sin esto, el
// arranque escalonado del SAG (Prepa desde el inicio, Secundaria y Primaria
// desde el 9 de septiembre) marcaba en riesgo a 263 de 353 alumnos, que es
// falso y habría quemado la credibilidad del reporte en su primera lectura.

import { supaGet, eqP, qs } from "./supabaseAdmin";
import { filtroNivel, tieneAccesoTotal } from "./niveles";

type GrupoRow = {
  id: string;
  nombre: string;
  nivel_academico: string;
  grado: string;
};

type AlumnoRow = {
  id: string;
  nombre: string;
  foto_url: string | null;
  grupo: GrupoRow | null;
};

type RegistroRow = {
  alumno_id: string;
  fecha: string;
  estatus: string;
};

type DiaCalendarioRow = {
  fecha: string;
  aplica_a: string | null;
  tipo_dia: string;
};

type JustificanteRow = {
  alumno_id: string;
  fecha_inicio: string;
  fecha_fin: string;
};

export type AlumnoAcumulado = {
  id: string;
  nombre: string;
  foto: string | null;
  grupoId: string | null;
  grupo: string;
  nivelAcademico: string;
  grado: string;
  /** Días lectivos del rango, antes de descartar los días sin registro. */
  diasLectivos: number;
  /**
   * Días realmente evaluables para este alumno: los lectivos en que su grupo
   * sí tuvo actividad en el sistema. Es el denominador de porcentajeAsistencia.
   */
  diasEvaluados: number;
  /** Días lectivos en que el grupo del alumno no registró a nadie. */
  diasSinRegistro: number;
  asistencias: number;
  puntuales: number;
  retardos: number;
  ausencias: number;
  /** Ausencias cubiertas por un justificante vigente en esa fecha. */
  ausenciasJustificadas: number;
  ausenciasSinJustificar: number;
  /** Porcentaje sobre diasEvaluados (0-100). null si no hay días evaluables. */
  porcentajeAsistencia: number | null;
  /**
   * Cobertura del grupo al que pertenece. Se arrastra a cada alumno para que
   * la tabla pueda advertir, fila por fila, cuándo su porcentaje no es de fiar.
   */
  coberturaGrupo: number;
};

/**
 * Qué tanto se está usando el SAG en un grupo: escaneos reales sobre escaneos
 * posibles (alumnos × días lectivos del rango).
 *
 * Es la pieza que hace creíble el resto del reporte. Mientras la cobertura sea
 * baja, un alumno "ausente" puede estar ausente o simplemente no haber pasado
 * su credencial, y no hay forma de distinguirlo desde los datos. Separar las
 * dos cosas evita que Dirección lea como ausentismo lo que en realidad es
 * falta de hábito en un salón -- y de paso señala exactamente en qué grupos
 * hay que insistir.
 */
export type GrupoCobertura = {
  id: string;
  nombre: string;
  nivelAcademico: string;
  alumnos: number;
  /** Días lectivos en que el grupo registró al menos un escaneo. */
  diasActivos: number;
  escaneos: number;
  escaneosPosibles: number;
  cobertura: number;
  confianza: "Alta" | "Parcial" | "Baja";
};

/** Umbrales de confianza en la cobertura de un grupo. */
export const COBERTURA_CONFIABLE = 60;
export const COBERTURA_PARCIAL = 30;

export function nivelDeConfianza(cobertura: number): GrupoCobertura["confianza"] {
  if (cobertura >= COBERTURA_CONFIABLE) return "Alta";
  if (cobertura >= COBERTURA_PARCIAL) return "Parcial";
  return "Baja";
}

export type ReporteAcumulado = {
  desde: string;
  hasta: string;
  diasLectivos: number;
  /** Fechas lectivas incluidas, por si la UI quiere mostrarlas. */
  fechas: string[];
  /**
   * Pares grupo-día descartados por no tener ningún registro. Sirve para
   * advertir en pantalla que el reporte no cubre el rango completo.
   */
  diasGrupoSinRegistro: number;
  alumnos: AlumnoAcumulado[];
  grupos: GrupoCobertura[];
};

/** Enumera las fechas de un rango, ambas inclusive. */
function rangoDeFechas(desde: string, hasta: string): string[] {
  const fechas: string[] = [];
  let actual = new Date(`${desde}T00:00:00Z`);
  const fin = new Date(`${hasta}T00:00:00Z`);
  // Tope de seguridad: un ciclo escolar completo cabe de sobra en 400 días.
  let guarda = 0;
  while (actual <= fin && guarda++ < 400) {
    fechas.push(actual.toISOString().slice(0, 10));
    actual = new Date(actual.getTime() + 24 * 60 * 60 * 1000);
  }
  return fechas;
}

export async function obtenerReporteAcumulado(
  desde: string,
  hasta: string,
  niveles?: string[]
): Promise<ReporteAcumulado> {
  const [alumnosRows, registrosRows, calendarioRows, justificantesRows] = await Promise.all([
    // Mismo patrón que obtenerReporteDiario: con alcance restringido el !inner
    // descarta al alumno cuyo grupo no cae en el alcance, en vez de traerlo con
    // el grupo en null.
    supaGet<AlumnoRow>(
      "alumnos",
      qs([
        eqP("estatus", "Activo"),
        tieneAccesoTotal(niveles)
          ? "select=id,nombre,foto_url,grupo:grupos(id,nombre,nivel_academico,grado)"
          : "select=id,nombre,foto_url,grupo:grupos!inner(id,nombre,nivel_academico,grado)",
        filtroNivel(niveles, "grupo.nivel_academico"),
        "limit=1000",
      ])
    ),
    supaGet<RegistroRow>(
      "registros_asistencia",
      qs([
        `fecha=gte.${desde}`,
        `fecha=lte.${hasta}`,
        "select=alumno_id,fecha,estatus",
        "limit=20000",
      ])
    ),
    supaGet<DiaCalendarioRow>(
      "calendario_escolar",
      qs([`fecha=gte.${desde}`, `fecha=lte.${hasta}`, "select=fecha,aplica_a,tipo_dia", "limit=1000"])
    ),
    supaGet<JustificanteRow>(
      "justificantes",
      qs([
        `fecha_fin=gte.${desde}`,
        `fecha_inicio=lte.${hasta}`,
        "select=alumno_id,fecha_inicio,fecha_fin",
        "limit=5000",
      ])
    ).catch(() => [] as JustificanteRow[]),
  ]);

  // --- Días lectivos del rango ---
  const noLectivos = new Set(
    calendarioRows
      .filter((d) => !d.aplica_a || d.aplica_a === "Alumnos" || d.aplica_a === "Ambos")
      .map((d) => d.fecha)
  );
  const fechasLectivas = rangoDeFechas(desde, hasta).filter((f) => {
    const dia = new Date(`${f}T00:00:00Z`).getUTCDay();
    return dia !== 0 && dia !== 6 && !noLectivos.has(f);
  });
  const fechasLectivasSet = new Set(fechasLectivas);

  // --- Índices ---
  // Un alumno tiene a lo más un registro por día, pero se agrupa por fecha para
  // no depender de esa suposición.
  const registrosPorAlumno = new Map<string, Map<string, string>>();
  for (const r of registrosRows) {
    if (!fechasLectivasSet.has(r.fecha)) continue;
    let porFecha = registrosPorAlumno.get(r.alumno_id);
    if (!porFecha) {
      porFecha = new Map();
      registrosPorAlumno.set(r.alumno_id, porFecha);
    }
    porFecha.set(r.fecha, r.estatus);
  }

  // Días en que cada grupo tuvo al menos un escaneo. Todo lo demás para ese
  // grupo se considera "sin datos", no "todos faltaron".
  const grupoDePorAlumno = new Map(alumnosRows.map((a) => [a.id, a.grupo?.id ?? null]));
  const diasActivosPorGrupo = new Map<string, Set<string>>();
  for (const r of registrosRows) {
    if (!fechasLectivasSet.has(r.fecha)) continue;
    const grupoId = grupoDePorAlumno.get(r.alumno_id);
    if (!grupoId) continue;
    const dias = diasActivosPorGrupo.get(grupoId);
    if (dias) dias.add(r.fecha);
    else diasActivosPorGrupo.set(grupoId, new Set([r.fecha]));
  }

  const justificadosPorAlumno = new Map<string, JustificanteRow[]>();
  for (const j of justificantesRows) {
    const lista = justificadosPorAlumno.get(j.alumno_id);
    if (lista) lista.push(j);
    else justificadosPorAlumno.set(j.alumno_id, [j]);
  }

  // --- Cobertura por grupo ---
  // Denominador: alumnos × días lectivos del rango COMPLETO (no solo los días
  // activos). Un día en que el grupo no registró a nadie es cobertura cero,
  // no un día que no existió: para medir adopción sí cuenta.
  const escaneosPorGrupo = new Map<string, number>();
  for (const r of registrosRows) {
    if (!fechasLectivasSet.has(r.fecha)) continue;
    const grupoId = grupoDePorAlumno.get(r.alumno_id);
    if (!grupoId) continue;
    escaneosPorGrupo.set(grupoId, (escaneosPorGrupo.get(grupoId) ?? 0) + 1);
  }

  const datosGrupo = new Map<string, GrupoRow>();
  const alumnosPorGrupo = new Map<string, number>();
  for (const a of alumnosRows) {
    if (!a.grupo) continue;
    datosGrupo.set(a.grupo.id, a.grupo);
    alumnosPorGrupo.set(a.grupo.id, (alumnosPorGrupo.get(a.grupo.id) ?? 0) + 1);
  }

  const grupos: GrupoCobertura[] = [...datosGrupo.values()].map((gr) => {
    const alumnos = alumnosPorGrupo.get(gr.id) ?? 0;
    const escaneos = escaneosPorGrupo.get(gr.id) ?? 0;
    const escaneosPosibles = alumnos * fechasLectivas.length;
    const cobertura = escaneosPosibles ? Math.round((escaneos / escaneosPosibles) * 100) : 0;
    return {
      id: gr.id,
      nombre: gr.nombre,
      nivelAcademico: gr.nivel_academico,
      alumnos,
      diasActivos: diasActivosPorGrupo.get(gr.id)?.size ?? 0,
      escaneos,
      escaneosPosibles,
      cobertura,
      confianza: nivelDeConfianza(cobertura),
    };
  });
  grupos.sort((a, b) => a.cobertura - b.cobertura || a.nombre.localeCompare(b.nombre, "es"));
  const coberturaPorGrupo = new Map(grupos.map((gr) => [gr.id, gr.cobertura]));

  const alumnos: AlumnoAcumulado[] = alumnosRows.map((a) => {
    const porFecha = registrosPorAlumno.get(a.id);
    const justificantes = justificadosPorAlumno.get(a.id) ?? [];
    const diasActivos = a.grupo ? diasActivosPorGrupo.get(a.grupo.id) : undefined;

    let puntuales = 0;
    let retardos = 0;
    let ausencias = 0;
    let ausenciasJustificadas = 0;
    let diasEvaluados = 0;

    for (const fecha of fechasLectivas) {
      // Si ese día nadie de su grupo pasó credencial, el día no dice nada de
      // este alumno: se salta en vez de contarle una falta.
      if (!diasActivos?.has(fecha)) continue;
      diasEvaluados++;

      const estatus = porFecha?.get(fecha);
      if (estatus === "Retardo") {
        retardos++;
      } else if (estatus) {
        puntuales++;
      } else {
        ausencias++;
        if (justificantes.some((j) => j.fecha_inicio <= fecha && j.fecha_fin >= fecha)) {
          ausenciasJustificadas++;
        }
      }
    }

    const asistencias = puntuales + retardos;
    return {
      id: a.id,
      nombre: a.nombre,
      foto: a.foto_url,
      grupoId: a.grupo?.id ?? null,
      grupo: a.grupo?.nombre ?? "Sin grupo",
      nivelAcademico: a.grupo?.nivel_academico ?? "Sin nivel",
      grado: a.grupo?.grado ?? "",
      diasLectivos: fechasLectivas.length,
      diasEvaluados,
      diasSinRegistro: fechasLectivas.length - diasEvaluados,
      asistencias,
      puntuales,
      retardos,
      ausencias,
      ausenciasJustificadas,
      ausenciasSinJustificar: ausencias - ausenciasJustificadas,
      porcentajeAsistencia: diasEvaluados ? Math.round((asistencias / diasEvaluados) * 100) : null,
      coberturaGrupo: a.grupo ? coberturaPorGrupo.get(a.grupo.id) ?? 0 : 0,
    };
  });

  // De peor a mejor asistencia: el reporte existe para encontrar a los que
  // están faltando, así que lo importante va arriba sin que nadie ordene nada.
  // Los alumnos sin días evaluables van al final: no hay nada que reportar.
  alumnos.sort(
    (a, b) =>
      (a.porcentajeAsistencia ?? 999) - (b.porcentajeAsistencia ?? 999) ||
      a.nombre.localeCompare(b.nombre, "es")
  );

  // Cuántos pares grupo-día quedaron fuera, para poder advertirlo en pantalla.
  const gruposDistintos = new Set(alumnosRows.map((a) => a.grupo?.id).filter(Boolean) as string[]);
  let diasGrupoSinRegistro = 0;
  for (const grupoId of gruposDistintos) {
    diasGrupoSinRegistro += fechasLectivas.length - (diasActivosPorGrupo.get(grupoId)?.size ?? 0);
  }

  return {
    desde,
    hasta,
    diasLectivos: fechasLectivas.length,
    fechas: fechasLectivas,
    diasGrupoSinRegistro,
    alumnos,
    grupos,
  };
}
