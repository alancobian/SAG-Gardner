// Agregados de asistencia para las gráficas del reporte mensual.
//
// LA DISTINCIÓN QUE SOSTIENE TODO ESTE ARCHIVO
//
// Un alumno sin registro en un día puede ser dos cosas muy distintas:
//
//   · FALTA        — ese día su grupo sí pasó credenciales, y él no aparece.
//                    La ausencia es real y se puede reportar.
//   · SIN REGISTRO — ese día nadie de su grupo escaneó. No se sabe si vino o
//                    no, y afirmar cualquiera de las dos cosas es inventar.
//
// Mezclarlas produce cifras catastróficas y falsas: del 1 al 24 de septiembre,
// Primaria acumulaba 1,536 "faltas" sobre 1,955 días-alumno posibles — un 79%
// de ausentismo que no existe. Es coberura del 21%, no ausentismo.
//
// Por eso las gráficas llevan cuatro series y no tres. La barra gris de "sin
// registro" no es un defecto del reporte: es el dato más accionable que tiene,
// porque señala exactamente dónde hay que insistir con el escaneo.

import { supaGet, eqP, qs } from "./supabaseAdmin";
import { filtroNivel, tieneAccesoTotal } from "./niveles";

/**
 * Qué porcentaje del grupo debe haber escaneado un día para que ese día cuente
 * como medido.
 *
 * No basta con "alguien escaneó". Si de un grupo de 17 pasan credencial 2, los
 * otros 15 no son faltas: lo más probable es que el escaneo no se hizo. Medido
 * sobre septiembre, el umbral cambia por completo la lectura:
 *
 *              ≥1 escaneo    ≥50% del grupo
 *   Prepa           84%            84%   (no le afecta: escanean completo)
 *   Secundaria      60%            75%
 *   Primaria        34%            60%
 *
 * Se eligió 50% y no 60% porque a partir de ahí empieza a descartar días
 * legítimos de Preparatoria.
 */
export const COBERTURA_MINIMA_DEL_DIA = 50;

type GrupoRow = { id: string; nombre: string; grado: string; nivel_academico: string };
type AlumnoRow = { id: string; grupo: GrupoRow | null };
type RegistroRow = { alumno_id: string; fecha: string; estatus: string };
type DiaCalendarioRow = { fecha: string; aplica_a: string | null };

export type FilaAnalitica = {
  clave: string;
  etiqueta: string;
  /** Para ordenar y para colorear por nivel en la gráfica. */
  nivelAcademico: string;
  alumnos: number;
  puntual: number;
  retardo: number;
  /** Ausencias reales: el grupo registró ese día y este alumno no aparece. */
  falta: number;
  /** Días-alumno en que el grupo no registró a nadie. No se puede concluir nada. */
  sinRegistro: number;
  /** alumnos × días lectivos. Suma de las cuatro series. */
  posibles: number;
  /**
   * Días de clase que este corte sí alcanzó a medir, en promedio por alumno.
   *
   * Para un grupo es exacto (todos sus alumnos comparten los mismos días
   * medidos). Para un grado, nivel o el total es un promedio, porque cada
   * grupo pudo haber medido días distintos.
   *
   * Es la referencia que hace legible la gráfica: "18 de 23" dice de inmediato
   * cuántos días de clase respaldan realmente esos números.
   */
  diasMedidos: number;
  /**
   * Promedio de alumnos por día de clase medido. Responde directamente a
   * "de los 17 días, ¿cuántos llegaron a tiempo, cuántos tarde y cuántos
   * faltaron?".
   *
   * El divisor son los días MEDIDOS, no los días lectivos: promediar sobre
   * días en que nadie escaneó hundiría artificialmente las tres cifras.
   * Cuando no hay días medidos, los tres son null: no hay nada que promediar.
   */
  promedio: { puntual: number; retardo: number; falta: number } | null;
  /** (puntual + retardo) / posibles, en porcentaje. */
  cobertura: number;
  /**
   * Puntualidad sobre los días evaluables (puntual+retardo+falta).
   * null cuando el grupo no registró ningún día: no hay nada que promediar.
   */
  porcentajeAsistencia: number | null;
};

export type Analitica = {
  desde: string;
  hasta: string;
  diasLectivos: number;
  totales: FilaAnalitica;
  porNivel: FilaAnalitica[];
  porGrado: FilaAnalitica[];
  porGrupo: FilaAnalitica[];
};

const ORDEN_NIVEL: Record<string, number> = {
  Preescolar: 0,
  Primaria: 1,
  Secundaria: 2,
  Preparatoria: 3,
};

function rangoDeFechas(desde: string, hasta: string): string[] {
  const fechas: string[] = [];
  let actual = new Date(`${desde}T00:00:00Z`);
  const fin = new Date(`${hasta}T00:00:00Z`);
  let guarda = 0;
  while (actual <= fin && guarda++ < 400) {
    fechas.push(actual.toISOString().slice(0, 10));
    actual = new Date(actual.getTime() + 86400000);
  }
  return fechas;
}

/** Acumulador mutable; se convierte en FilaAnalitica al final. */
type Acumulador = {
  etiqueta: string;
  nivelAcademico: string;
  alumnos: Set<string>;
  puntual: number;
  retardo: number;
  falta: number;
  sinRegistro: number;
};

function nuevoAcumulador(etiqueta: string, nivel: string): Acumulador {
  return {
    etiqueta,
    nivelAcademico: nivel,
    alumnos: new Set(),
    puntual: 0,
    retardo: 0,
    falta: 0,
    sinRegistro: 0,
  };
}

const red1 = (n: number) => Math.round(n * 10) / 10;

function aFila(clave: string, a: Acumulador): FilaAnalitica {
  const posibles = a.puntual + a.retardo + a.falta + a.sinRegistro;
  const evaluables = a.puntual + a.retardo + a.falta;
  const diasMedidos = a.alumnos.size ? Math.round(evaluables / a.alumnos.size) : 0;
  return {
    clave,
    etiqueta: a.etiqueta,
    nivelAcademico: a.nivelAcademico,
    alumnos: a.alumnos.size,
    puntual: a.puntual,
    retardo: a.retardo,
    falta: a.falta,
    sinRegistro: a.sinRegistro,
    posibles,
    // Días-alumno medidos ÷ alumnos = días medidos por alumno.
    diasMedidos,
    promedio: diasMedidos
      ? {
          puntual: red1(a.puntual / diasMedidos),
          retardo: red1(a.retardo / diasMedidos),
          falta: red1(a.falta / diasMedidos),
        }
      : null,
    cobertura: posibles ? Math.round(((a.puntual + a.retardo) / posibles) * 100) : 0,
    porcentajeAsistencia: evaluables ? Math.round(((a.puntual + a.retardo) / evaluables) * 100) : null,
  };
}

export async function obtenerAnalitica(
  desde: string,
  hasta: string,
  niveles?: string[]
): Promise<Analitica> {
  const [alumnosRows, registrosRows, calendarioRows] = await Promise.all([
    supaGet<AlumnoRow>(
      "alumnos",
      qs([
        eqP("estatus", "Activo"),
        tieneAccesoTotal(niveles)
          ? "select=id,grupo:grupos(id,nombre,grado,nivel_academico)"
          : "select=id,grupo:grupos!inner(id,nombre,grado,nivel_academico)",
        filtroNivel(niveles, "grupo.nivel_academico"),
        "limit=1000",
      ])
    ),
    supaGet<RegistroRow>(
      "registros_asistencia",
      qs([`fecha=gte.${desde}`, `fecha=lte.${hasta}`, "select=alumno_id,fecha,estatus", "limit=20000"])
    ),
    supaGet<DiaCalendarioRow>(
      "calendario_escolar",
      qs([`fecha=gte.${desde}`, `fecha=lte.${hasta}`, "select=fecha,aplica_a", "limit=500"])
    ),
  ]);

  // Días lectivos: hábiles menos los marcados como no lectivos para alumnos.
  const noLectivos = new Set(
    calendarioRows
      .filter((d) => !d.aplica_a || d.aplica_a === "Alumnos" || d.aplica_a === "Ambos")
      .map((d) => d.fecha)
  );
  const fechas = rangoDeFechas(desde, hasta).filter((f) => {
    const dia = new Date(`${f}T00:00:00Z`).getUTCDay();
    return dia !== 0 && dia !== 6 && !noLectivos.has(f);
  });
  const fechasSet = new Set(fechas);

  const conGrupo = alumnosRows.filter((a) => a.grupo) as (AlumnoRow & { grupo: GrupoRow })[];
  const grupoDe = new Map(conGrupo.map((a) => [a.id, a.grupo]));

  // alumno -> fecha -> estatus
  const registroDe = new Map<string, Map<string, string>>();
  // grupo -> fecha -> cuántos alumnos de ese grupo escanearon ese día.
  // Se cuenta, no solo se marca, porque el umbral es un porcentaje del grupo.
  const escaneosPorGrupoDia = new Map<string, number>();

  for (const r of registrosRows) {
    if (!fechasSet.has(r.fecha)) continue;
    let porFecha = registroDe.get(r.alumno_id);
    if (!porFecha) {
      porFecha = new Map();
      registroDe.set(r.alumno_id, porFecha);
    }
    porFecha.set(r.fecha, r.estatus);

    const grupo = grupoDe.get(r.alumno_id);
    if (!grupo) continue;
    const clave = `${grupo.id}|${r.fecha}`;
    escaneosPorGrupoDia.set(clave, (escaneosPorGrupoDia.get(clave) ?? 0) + 1);
  }

  // Tamaño de cada grupo, que es el denominador del umbral del día.
  const tamanoGrupo = new Map<string, number>();
  for (const a of conGrupo) {
    tamanoGrupo.set(a.grupo.id, (tamanoGrupo.get(a.grupo.id) ?? 0) + 1);
  }

  const diaFueMedido = (grupoId: string, fecha: string) => {
    const total = tamanoGrupo.get(grupoId) ?? 0;
    if (total === 0) return false;
    const escaneos = escaneosPorGrupoDia.get(`${grupoId}|${fecha}`) ?? 0;
    return (escaneos / total) * 100 >= COBERTURA_MINIMA_DEL_DIA;
  };

  const totales = nuevoAcumulador("Instituto Gardner", "");
  const porNivel = new Map<string, Acumulador>();
  const porGrado = new Map<string, Acumulador>();
  const porGrupo = new Map<string, Acumulador>();

  for (const alumno of conGrupo) {
    const g = alumno.grupo;
    // El nombre del grado se repite entre niveles ("1° grado" existe en
    // Primaria y Secundaria), así que la clave lleva el nivel adelante.
    const claveGrado = `${g.nivel_academico}|${g.grado}`;

    const destinos = [
      totales,
      porNivel.get(g.nivel_academico) ??
        porNivel.set(g.nivel_academico, nuevoAcumulador(g.nivel_academico, g.nivel_academico)).get(g.nivel_academico)!,
      porGrado.get(claveGrado) ??
        porGrado.set(claveGrado, nuevoAcumulador(g.grado, g.nivel_academico)).get(claveGrado)!,
      porGrupo.get(g.id) ?? porGrupo.set(g.id, nuevoAcumulador(g.nombre, g.nivel_academico)).get(g.id)!,
    ];
    destinos.forEach((d) => d.alumnos.add(alumno.id));

    const porFecha = registroDe.get(alumno.id);

    for (const fecha of fechas) {
      let campo: keyof Pick<Acumulador, "puntual" | "retardo" | "falta" | "sinRegistro">;
      if (!diaFueMedido(g.id, fecha)) {
        campo = "sinRegistro";
      } else {
        const estatus = porFecha?.get(fecha);
        if (estatus === "Retardo") campo = "retardo";
        else if (estatus) campo = "puntual";
        else campo = "falta";
      }
      destinos.forEach((d) => d[campo]++);
    }
  }

  const ordenar = (filas: FilaAnalitica[]) =>
    filas.sort((a, b) => {
      const na = ORDEN_NIVEL[a.nivelAcademico] ?? 99;
      const nb = ORDEN_NIVEL[b.nivelAcademico] ?? 99;
      if (na !== nb) return na - nb;
      return a.etiqueta.localeCompare(b.etiqueta, "es", { numeric: true });
    });

  return {
    desde,
    hasta,
    diasLectivos: fechas.length,
    totales: aFila("total", totales),
    porNivel: ordenar([...porNivel].map(([k, v]) => aFila(k, v))),
    porGrado: ordenar([...porGrado].map(([k, v]) => aFila(k, v))),
    porGrupo: ordenar([...porGrupo].map(([k, v]) => aFila(k, v))),
  };
}
