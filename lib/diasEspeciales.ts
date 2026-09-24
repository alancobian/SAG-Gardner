// Días con horario especial para docentes: CTE, juntas, capacitaciones.
//
// EL PROBLEMA QUE RESUELVE
//
// El horario institucional de docentes es uno solo (horario_retardo_docentes).
// Un día de CTE los docentes entran a las 8:00, no a las 7:00 — sin esta tabla,
// todos los que llegan a las 7:55 quedaban marcados como Retardo.
//
// DÓNDE VIVE EL DATO
//
// En calendario_escolar, sobre la misma fila del día (migración 6 agrega
// hora_entrada_docentes y minutos_tolerancia_docentes). Se eligió así y no una
// tabla nueva porque el día ya existe ahí: un CTE es un día en que los alumnos
// no vienen y los docentes sí. Tener dos fuentes para el mismo día es la receta
// para que se contradigan.
//
// OJO CON aplica_a
//
// Un día marcado "Ambos" es no laborable para docentes también, y entonces no
// tiene sentido fijarles hora de entrada. Por eso, al poner horario especial,
// la fila se reescribe como aplica_a = "Alumnos": los alumnos no vienen, los
// docentes sí, a la hora que aquí se indique.

import { supaGet, supaInsert, supaUpdate, supaDelete, eqP, qs } from "./supabaseAdmin";

export type DiaEspecial = {
  id: string;
  fecha: string;
  tipoDia: string;
  horaEntrada: string; // "HH:MM"
  minutosTolerancia: number;
};

type CalendarioRow = {
  id: string;
  fecha: string;
  tipo_dia: string;
  aplica_a: string | null;
  hora_entrada_docentes: string | null;
  minutos_tolerancia_docentes: number | null;
};

const CAMPOS = "id,fecha,tipo_dia,aplica_a,hora_entrada_docentes,minutos_tolerancia_docentes";

export async function listarDiasEspeciales(): Promise<DiaEspecial[]> {
  const rows = await supaGet<CalendarioRow>(
    "calendario_escolar",
    qs(["hora_entrada_docentes=not.is.null", `select=${CAMPOS}`, "order=fecha.asc", "limit=500"])
  ).catch(() => [] as CalendarioRow[]); // Sin la migración 6, lista vacía en vez de error.

  return rows.map((r) => ({
    id: r.id,
    fecha: r.fecha.slice(0, 10),
    tipoDia: r.tipo_dia,
    horaEntrada: (r.hora_entrada_docentes ?? "").slice(0, 5),
    minutosTolerancia: r.minutos_tolerancia_docentes ?? 0,
  }));
}

export async function guardarDiaEspecial(datos: {
  fecha: string;
  tipoDia: string;
  horaEntrada: string;
  minutosTolerancia: number;
}): Promise<void> {
  const fecha = datos.fecha.trim();
  const tipoDia = datos.tipoDia.trim() || "CTE";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("Fecha inválida");
  if (!/^\d{2}:\d{2}$/.test(datos.horaEntrada)) throw new Error("Hora de entrada inválida");
  if (
    !Number.isInteger(datos.minutosTolerancia) ||
    datos.minutosTolerancia < 0 ||
    datos.minutosTolerancia > 120
  ) {
    throw new Error("La tolerancia debe ser un número entre 0 y 120 minutos");
  }

  const patch = {
    tipo_dia: tipoDia,
    // Los alumnos no vienen; los docentes sí. Ver nota de arriba.
    aplica_a: "Alumnos",
    hora_entrada_docentes: datos.horaEntrada,
    minutos_tolerancia_docentes: datos.minutosTolerancia,
  };

  // Puede haber más de una fila para la misma fecha (una por audiencia): todas
  // se unifican en una sola con el horario especial.
  const existentes = await supaGet<CalendarioRow>(
    "calendario_escolar",
    qs([eqP("fecha", fecha), `select=${CAMPOS}`])
  );

  if (existentes.length === 0) {
    await supaInsert("calendario_escolar", { fecha, ...patch });
    return;
  }

  await supaUpdate("calendario_escolar", eqP("id", existentes[0].id), patch);
  for (const sobrante of existentes.slice(1)) {
    await supaDelete("calendario_escolar", eqP("id", sobrante.id));
  }
}

/** Quita el horario especial, dejando el día como día no laborable normal. */
export async function quitarDiaEspecial(id: string): Promise<void> {
  if (!id) throw new Error("Falta id");
  await supaUpdate("calendario_escolar", eqP("id", id), {
    hora_entrada_docentes: null,
    minutos_tolerancia_docentes: null,
  });
}

/**
 * Horario especial vigente para una fecha, o null si ese día no tiene uno.
 * Lo consume lib/escaneo.ts antes de caer al horario institucional.
 */
export async function horarioEspecialDeDocentes(
  fecha: string
): Promise<{ horaEntrada: string; minutosTolerancia: number } | null> {
  try {
    const rows = await supaGet<CalendarioRow>(
      "calendario_escolar",
      qs([eqP("fecha", fecha), "hora_entrada_docentes=not.is.null", `select=${CAMPOS}`, "limit=1"])
    );
    if (rows.length === 0) return null;
    return {
      horaEntrada: (rows[0].hora_entrada_docentes ?? "").slice(0, 5),
      minutosTolerancia: rows[0].minutos_tolerancia_docentes ?? 0,
    };
  } catch {
    // Antes de la migración 6 la columna no existe: el escaneo sigue con el
    // horario institucional de siempre en vez de romperse.
    return null;
  }
}
