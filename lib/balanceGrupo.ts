// Balance de un grupo en un rango de fechas, alumno por alumno.
//
// Es el reporte que el coordinador entrega al docente titular: "en estos N días
// hábiles, tu grupo acumuló tantos retardos y tantas faltas, y estos alumnos en
// particular son los que hay que atender".
//
// LA REGLA DEL DENOMINADOR
//
// Aquí el denominador es siempre el mismo y es el que se anuncia arriba: los
// días hábiles del rango. Para cada alumno, puntuales + retardos + faltas suma
// exactamente esa cifra. Es lo que hace que el reporte se pueda leer de un
// vistazo y se pueda defender frente a un papá: "de 17 días, tu hijo llegó a
// tiempo 12, tarde 2 y faltó 3".
//
// A diferencia de las gráficas de dirección, un día en que el grupo no registró
// a nadie sí cuenta como falta. Es una decisión deliberada: el tutor necesita un
// número cerrado. Para no volverlo engañoso, el reporte devuelve además
// `diasConRegistro`, que la pantalla muestra junto al total — si un grupo
// registró 4 de 17 días, eso queda a la vista al lado de las faltas.

import { supaGet, eqP, qs } from "./supabaseAdmin";

type AlumnoRow = { id: string; nombre: string; foto_url: string | null };
type RegistroRow = { alumno_id: string; fecha: string; estatus: string };
type DiaCalendarioRow = { fecha: string; aplica_a: string | null };
type JustificanteRow = { alumno_id: string; fecha_inicio: string; fecha_fin: string };

export type AlumnoBalance = {
  id: string;
  nombre: string;
  foto: string | null;
  puntuales: number;
  retardos: number;
  faltas: number;
  /** Faltas cubiertas por un justificante vigente. Subconjunto de `faltas`. */
  faltasJustificadas: number;
  /** (puntuales + retardos) / días hábiles, en porcentaje. */
  porcentajeAsistencia: number;
  /** Fechas exactas, para que el tutor pueda revisarlas con el alumno. */
  fechasRetardo: string[];
  fechasFalta: string[];
};

export type BalanceGrupo = {
  desde: string;
  hasta: string;
  /** Días hábiles del rango. Denominador de todo el reporte. */
  diasHabiles: number;
  fechas: string[];
  /** De esos días hábiles, en cuántos el grupo registró al menos un escaneo. */
  diasConRegistro: number;
  alumnos: AlumnoBalance[];
  totales: {
    alumnos: number;
    puntuales: number;
    retardos: number;
    faltas: number;
    faltasJustificadas: number;
    porcentajeAsistencia: number;
  };
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

export async function obtenerBalanceGrupo(
  grupoId: string,
  desde: string,
  hasta: string
): Promise<BalanceGrupo> {
  const alumnosRows = await supaGet<AlumnoRow>(
    "alumnos",
    qs([eqP("estatus", "Activo"), eqP("grupo_id", grupoId), "select=id,nombre,foto_url", "limit=200"])
  );
  const ids = alumnosRows.map((a) => a.id);

  const [registrosRows, calendarioRows, justificantesRows] = await Promise.all([
    ids.length
      ? supaGet<RegistroRow>(
          "registros_asistencia",
          qs([
            `alumno_id=in.(${ids.join(",")})`,
            `fecha=gte.${desde}`,
            `fecha=lte.${hasta}`,
            "select=alumno_id,fecha,estatus",
            "limit=20000",
          ])
        )
      : Promise.resolve([] as RegistroRow[]),
    supaGet<DiaCalendarioRow>(
      "calendario_escolar",
      qs([`fecha=gte.${desde}`, `fecha=lte.${hasta}`, "select=fecha,aplica_a", "limit=500"])
    ),
    ids.length
      ? supaGet<JustificanteRow>(
          "justificantes",
          qs([
            `alumno_id=in.(${ids.join(",")})`,
            `fecha_fin=gte.${desde}`,
            `fecha_inicio=lte.${hasta}`,
            "select=alumno_id,fecha_inicio,fecha_fin",
            "limit=2000",
          ])
        ).catch(() => [] as JustificanteRow[])
      : Promise.resolve([] as JustificanteRow[]),
  ]);

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

  const porAlumno = new Map<string, Map<string, string>>();
  const diasConRegistro = new Set<string>();
  for (const r of registrosRows) {
    if (!fechasSet.has(r.fecha)) continue;
    diasConRegistro.add(r.fecha);
    let m = porAlumno.get(r.alumno_id);
    if (!m) {
      m = new Map();
      porAlumno.set(r.alumno_id, m);
    }
    m.set(r.fecha, r.estatus);
  }

  const justificantesDe = new Map<string, JustificanteRow[]>();
  for (const j of justificantesRows) {
    const lista = justificantesDe.get(j.alumno_id);
    if (lista) lista.push(j);
    else justificantesDe.set(j.alumno_id, [j]);
  }

  const alumnos: AlumnoBalance[] = alumnosRows.map((a) => {
    const reg = porAlumno.get(a.id);
    const just = justificantesDe.get(a.id) ?? [];
    let puntuales = 0;
    let faltasJustificadas = 0;
    const fechasRetardo: string[] = [];
    const fechasFalta: string[] = [];

    for (const f of fechas) {
      const estatus = reg?.get(f);
      if (estatus === "Retardo") fechasRetardo.push(f);
      else if (estatus) puntuales++;
      else {
        fechasFalta.push(f);
        if (just.some((j) => j.fecha_inicio <= f && j.fecha_fin >= f)) faltasJustificadas++;
      }
    }

    const asistencias = puntuales + fechasRetardo.length;
    return {
      id: a.id,
      nombre: a.nombre,
      foto: a.foto_url,
      puntuales,
      retardos: fechasRetardo.length,
      faltas: fechasFalta.length,
      faltasJustificadas,
      porcentajeAsistencia: fechas.length ? Math.round((asistencias / fechas.length) * 100) : 0,
      fechasRetardo,
      fechasFalta,
    };
  });

  // Más faltas primero: el reporte existe para encontrar a quién atender.
  alumnos.sort((a, b) => b.faltas - a.faltas || a.nombre.localeCompare(b.nombre, "es"));

  const suma = (fn: (a: AlumnoBalance) => number) => alumnos.reduce((t, a) => t + fn(a), 0);
  const puntuales = suma((a) => a.puntuales);
  const retardos = suma((a) => a.retardos);
  const posibles = alumnos.length * fechas.length;

  return {
    desde,
    hasta,
    diasHabiles: fechas.length,
    fechas,
    diasConRegistro: diasConRegistro.size,
    alumnos,
    totales: {
      alumnos: alumnos.length,
      puntuales,
      retardos,
      faltas: suma((a) => a.faltas),
      faltasJustificadas: suma((a) => a.faltasJustificadas),
      porcentajeAsistencia: posibles ? Math.round(((puntuales + retardos) / posibles) * 100) : 0,
    },
  };
}
