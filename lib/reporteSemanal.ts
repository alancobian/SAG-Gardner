// Reporte semanal por grupo, pensado para el maestro titular.
//
// Por qué semanal y no diario: el maestro ya sabe quién faltó hoy, vio la silla
// vacía. Lo que no puede ver desde el salón es el patrón — el alumno que falta
// martes y jueves cada semana es invisible día a día y evidente en el
// acumulado. Ahí está lo que el sistema aporta y la observación directa no.
//
// Las mismas dos cautelas que en lib/acumulados.ts: los días no lectivos no
// cuentan, y un día en que el grupo no registró a nadie no se computa como
// faltas de todos — no se puede afirmar que alguien faltó un día en que el
// sistema no se usó en su salón.

import { supaGet, eqP, qs } from "./supabaseAdmin";
import { fechaHoyMx } from "./reportes";

type GrupoRow = {
  id: string;
  nombre: string;
  nivel_academico: string;
  docente_titular: { nombre: string; correo: string | null } | null;
  docente_titular_ingles?: { nombre: string; correo: string | null } | null;
};

type AlumnoRow = { id: string; nombre: string; grupo_id: string | null };
type RegistroRow = { alumno_id: string; fecha: string; estatus: string };
type DiaCalendarioRow = { fecha: string; aplica_a: string | null; tipo_dia: string };
type JustificanteRow = { alumno_id: string; fecha_inicio: string; fecha_fin: string };

/** Faltas sin justificar en la semana a partir de las cuales se levanta alerta. */
export const FALTAS_PARA_ALERTA = 2;

/**
 * Cobertura mínima del grupo para que las alertas signifiquen algo.
 *
 * Por debajo de esto, "el alumno faltó" y "no le pasaron la credencial" son
 * indistinguibles desde los datos, y la lista de alertas se llena de falsos
 * positivos: en la semana del 7 de septiembre, 6° B salía con 13 de 17 alumnos
 * en alerta teniendo 15% de cobertura. Mandarle eso a la maestra la habría
 * hecho descartar el reporte entero, con razón.
 *
 * Es más alto que el 60% que usa la pantalla de cobertura a propósito: ahí el
 * umbral decide si un número es orientativo, aquí decide si se señala a un
 * alumno por nombre. La segunda decisión pide más evidencia.
 */
export const COBERTURA_PARA_ALERTAS = 75;

export type DiaSemana = {
  fecha: string;
  /** Nombre corto para la gráfica: "lun", "mar"… */
  etiqueta: string;
  /** null = el grupo no registró a nadie ese día; no se puede concluir nada. */
  porcentajeAsistencia: number | null;
  presentes: number;
  retardos: number;
  ausentes: number;
};

export type AlumnoAlerta = {
  id: string;
  nombre: string;
  faltasSinJustificar: number;
  /** Fechas exactas, para que el maestro sepa de qué días hablar. */
  fechas: string[];
};

export type ReporteSemanalGrupo = {
  grupoId: string;
  grupo: string;
  nivelAcademico: string;
  titulares: { nombre: string; correo: string | null; rol: string }[];
  semanaInicio: string;
  semanaFin: string;
  diasLectivos: number;
  /** Días lectivos en que el grupo sí registró a alguien. */
  diasConRegistro: number;
  totalAlumnos: number;
  dias: DiaSemana[];
  porcentajeAsistencia: number | null;
  /** Diferencia en puntos contra la semana anterior; null si no hay con qué comparar. */
  variacionVsSemanaPrevia: number | null;
  totalRetardos: number;
  totalFaltasSinJustificar: number;
  /** Escaneos reales sobre posibles (alumnos × días lectivos), 0-100. */
  cobertura: number;
  /**
   * Si las alertas son de fiar. Cuando es false, `alertas` viene vacío a
   * propósito: con cobertura baja la lista serían casi todos falsos positivos.
   */
  alertasConfiables: boolean;
  alertas: AlumnoAlerta[];
};

const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** Lunes de la semana a la que pertenece la fecha dada. */
export function lunesDeLaSemana(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  // getUTCDay: 0 = domingo. Se retrocede al lunes anterior (o al mismo si ya lo es).
  const desplazamiento = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - desplazamiento);
  return d.toISOString().slice(0, 10);
}

function sumarDias(fecha: string, n: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Calcula el reporte de una semana para todos los grupos (o solo los indicados).
 *
 * `semana` es cualquier fecha dentro de la semana deseada; se normaliza al
 * lunes. Por defecto, la semana en curso.
 */
export async function obtenerReporteSemanal(
  semana?: string,
  grupoIds?: string[]
): Promise<ReporteSemanalGrupo[]> {
  const lunes = lunesDeLaSemana(semana || fechaHoyMx());
  const viernes = sumarDias(lunes, 4);
  const lunesPrevio = sumarDias(lunes, -7);

  const selectGrupos =
    "select=id,nombre,nivel_academico," +
    "docente_titular:docentes!grupos_docente_titular_id_fkey(nombre,correo)," +
    "docente_titular_ingles:docentes!grupos_docente_titular_ingles_id_fkey(nombre,correo)";

  const [gruposRows, alumnosRows, registrosRows, calendarioRows, justificantesRows] =
    await Promise.all([
      supaGet<GrupoRow>("grupos", qs([selectGrupos, "limit=200"])),
      supaGet<AlumnoRow>(
        "alumnos",
        qs([eqP("estatus", "Activo"), "select=id,nombre,grupo_id", "limit=1000"])
      ),
      // Se traen las dos semanas de una vez: la actual para el reporte y la
      // previa solo para la comparación.
      supaGet<RegistroRow>(
        "registros_asistencia",
        qs([
          `fecha=gte.${lunesPrevio}`,
          `fecha=lte.${viernes}`,
          "select=alumno_id,fecha,estatus",
          "limit=5000",
        ])
      ),
      supaGet<DiaCalendarioRow>(
        "calendario_escolar",
        qs([`fecha=gte.${lunesPrevio}`, `fecha=lte.${viernes}`, "select=fecha,aplica_a,tipo_dia", "limit=200"])
      ),
      supaGet<JustificanteRow>(
        "justificantes",
        qs([
          `fecha_fin=gte.${lunes}`,
          `fecha_inicio=lte.${viernes}`,
          "select=alumno_id,fecha_inicio,fecha_fin",
          "limit=2000",
        ])
      ).catch(() => [] as JustificanteRow[]),
    ]);

  const noLectivos = new Set(
    calendarioRows
      .filter((d) => !d.aplica_a || d.aplica_a === "Alumnos" || d.aplica_a === "Ambos")
      .map((d) => d.fecha)
  );
  const diasLectivosDe = (inicio: string) =>
    [0, 1, 2, 3, 4].map((n) => sumarDias(inicio, n)).filter((f) => !noLectivos.has(f));

  const fechasSemana = diasLectivosDe(lunes);
  const fechasPrevias = diasLectivosDe(lunesPrevio);

  const alumnosPorGrupo = new Map<string, AlumnoRow[]>();
  for (const a of alumnosRows) {
    if (!a.grupo_id) continue;
    const lista = alumnosPorGrupo.get(a.grupo_id);
    if (lista) lista.push(a);
    else alumnosPorGrupo.set(a.grupo_id, [a]);
  }

  // alumno -> fecha -> estatus
  const registrosPorAlumno = new Map<string, Map<string, string>>();
  for (const r of registrosRows) {
    let porFecha = registrosPorAlumno.get(r.alumno_id);
    if (!porFecha) {
      porFecha = new Map();
      registrosPorAlumno.set(r.alumno_id, porFecha);
    }
    porFecha.set(r.fecha, r.estatus);
  }

  const justificadosPorAlumno = new Map<string, JustificanteRow[]>();
  for (const j of justificantesRows) {
    const lista = justificadosPorAlumno.get(j.alumno_id);
    if (lista) lista.push(j);
    else justificadosPorAlumno.set(j.alumno_id, [j]);
  }
  const tieneJustificante = (alumnoId: string, fecha: string) =>
    (justificadosPorAlumno.get(alumnoId) ?? []).some(
      (j) => j.fecha_inicio <= fecha && j.fecha_fin >= fecha
    );

  const grupos = grupoIds?.length
    ? gruposRows.filter((g) => grupoIds.includes(g.id))
    : gruposRows;

  return grupos
    .map((g): ReporteSemanalGrupo => {
      const alumnos = alumnosPorGrupo.get(g.id) ?? [];

      // Días en que el grupo tuvo actividad. Todo lo demás es "sin datos".
      const conRegistro = (fechas: string[]) =>
        fechas.filter((f) => alumnos.some((a) => registrosPorAlumno.get(a.id)?.has(f)));
      const diasActivos = conRegistro(fechasSemana);
      const diasActivosPrevios = conRegistro(fechasPrevias);

      const dias: DiaSemana[] = fechasSemana.map((fecha) => {
        const activo = diasActivos.includes(fecha);
        let presentes = 0;
        let retardos = 0;
        for (const a of alumnos) {
          const estatus = registrosPorAlumno.get(a.id)?.get(fecha);
          if (estatus === "Retardo") retardos++;
          else if (estatus) presentes++;
        }
        const asistieron = presentes + retardos;
        return {
          fecha,
          etiqueta: DIAS_CORTOS[new Date(`${fecha}T00:00:00Z`).getUTCDay()],
          porcentajeAsistencia:
            activo && alumnos.length ? Math.round((asistieron / alumnos.length) * 100) : null,
          presentes,
          retardos,
          ausentes: activo ? alumnos.length - asistieron : 0,
        };
      });

      // Alertas: faltas sin justificante en los días que sí se evaluaron.
      const alertas: AlumnoAlerta[] = [];
      let totalRetardos = 0;
      let totalFaltasSinJustificar = 0;

      for (const a of alumnos) {
        const porFecha = registrosPorAlumno.get(a.id);
        const faltas: string[] = [];
        for (const fecha of diasActivos) {
          const estatus = porFecha?.get(fecha);
          if (estatus === "Retardo") totalRetardos++;
          else if (!estatus && !tieneJustificante(a.id, fecha)) faltas.push(fecha);
        }
        totalFaltasSinJustificar += faltas.length;
        if (faltas.length >= FALTAS_PARA_ALERTA) {
          alertas.push({
            id: a.id,
            nombre: a.nombre,
            faltasSinJustificar: faltas.length,
            fechas: faltas,
          });
        }
      }
      alertas.sort(
        (x, y) => y.faltasSinJustificar - x.faltasSinJustificar || x.nombre.localeCompare(y.nombre, "es")
      );

      const porcentajeDe = (fechas: string[]) => {
        if (!fechas.length || !alumnos.length) return null;
        let asistencias = 0;
        for (const a of alumnos) {
          const porFecha = registrosPorAlumno.get(a.id);
          for (const f of fechas) if (porFecha?.has(f)) asistencias++;
        }
        return Math.round((asistencias / (alumnos.length * fechas.length)) * 100);
      };

      const actual = porcentajeDe(diasActivos);
      const previo = porcentajeDe(diasActivosPrevios);

      // Cobertura de la semana: escaneos sobre escaneos posibles. A diferencia
      // del porcentaje de asistencia, el denominador son TODOS los días
      // lectivos, no solo los activos — un día sin registrar es cobertura cero.
      let escaneos = 0;
      for (const a of alumnos) {
        const porFecha = registrosPorAlumno.get(a.id);
        for (const f of fechasSemana) if (porFecha?.has(f)) escaneos++;
      }
      const posibles = alumnos.length * fechasSemana.length;
      const cobertura = posibles ? Math.round((escaneos / posibles) * 100) : 0;
      const alertasConfiables = cobertura >= COBERTURA_PARA_ALERTAS;

      const titulares = [
        g.docente_titular && {
          nombre: g.docente_titular.nombre,
          correo: g.docente_titular.correo,
          rol: g.nivel_academico === "Primaria" ? "Español" : "Titular",
        },
        g.docente_titular_ingles && {
          nombre: g.docente_titular_ingles.nombre,
          correo: g.docente_titular_ingles.correo,
          rol: "Inglés",
        },
      ].filter(Boolean) as ReporteSemanalGrupo["titulares"];

      return {
        grupoId: g.id,
        grupo: g.nombre,
        nivelAcademico: g.nivel_academico,
        titulares,
        semanaInicio: lunes,
        semanaFin: viernes,
        diasLectivos: fechasSemana.length,
        diasConRegistro: diasActivos.length,
        totalAlumnos: alumnos.length,
        dias,
        porcentajeAsistencia: actual,
        variacionVsSemanaPrevia: actual !== null && previo !== null ? actual - previo : null,
        totalRetardos,
        totalFaltasSinJustificar,
        cobertura,
        alertasConfiables,
        // Con cobertura baja la lista se suprime entera. Mostrar "algunas" sería
        // peor: no hay forma de saber cuáles de ellas son reales.
        alertas: alertasConfiables ? alertas : [],
      };
    })
    .sort((a, b) => a.grupo.localeCompare(b.grupo, "es", { numeric: true }));
}
