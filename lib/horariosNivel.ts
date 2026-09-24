// Hora de entrada y tolerancia de los alumnos, administradas por nivel.
//
// POR QUÉ POR NIVEL Y NO POR GRUPO
//
// En la base, el horario de retardo vive por grupo (horarios_retardo.grupo_id):
// es la granularidad correcta y no se toca. Pero el Instituto no decide a esa
// altura — la hora de entrada es una política de nivel: Primaria entra 7:30,
// Secundaria y Prepa 7:00. Pedirle al administrador que edite 25 renglones
// iguales es pedirle que se equivoque.
//
// Así que la pantalla trabaja por nivel y cada guardado hace un solo PATCH
// sobre todos los grupos de ese nivel. Si algún grupo quedara con un horario
// distinto (carga manual, migración), `mixto` lo delata en pantalla en vez de
// esconderlo detrás de un promedio.

import { supaGet, supaInsert, supaUpdateMany, qs } from "./supabaseAdmin";
import { listarGrupos } from "./grupos";

export type HorarioNivel = {
  nivelAcademico: string;
  grupos: number;
  /** Grupos de ese nivel que todavía no tienen fila en horarios_retardo. */
  gruposSinHorario: number;
  horaEntrada: string; // "HH:MM"
  minutosTolerancia: number;
  /** true cuando los grupos del nivel no comparten el mismo horario. */
  mixto: boolean;
};

type HorarioRow = {
  id: string;
  grupo_id: string;
  hora_entrada: string;
  minutos_tolerancia: number | null;
};

const HORA_POR_DEFECTO = "07:00";

export async function listarHorariosPorNivel(): Promise<HorarioNivel[]> {
  const [grupos, horarios] = await Promise.all([
    listarGrupos(),
    supaGet<HorarioRow>("horarios_retardo", qs(["select=id,grupo_id,hora_entrada,minutos_tolerancia", "limit=500"])),
  ]);

  const horarioDe = new Map(horarios.map((h) => [h.grupo_id, h]));
  const porNivel = new Map<string, { grupos: number; sinHorario: number; combos: Map<string, number> }>();

  for (const g of grupos) {
    let acc = porNivel.get(g.nivelAcademico);
    if (!acc) {
      acc = { grupos: 0, sinHorario: 0, combos: new Map() };
      porNivel.set(g.nivelAcademico, acc);
    }
    acc.grupos++;
    const h = horarioDe.get(g.id);
    if (!h) {
      acc.sinHorario++;
      continue;
    }
    const clave = `${h.hora_entrada.slice(0, 5)}|${h.minutos_tolerancia ?? 0}`;
    acc.combos.set(clave, (acc.combos.get(clave) ?? 0) + 1);
  }

  return [...porNivel].map(([nivelAcademico, acc]) => {
    // El horario que se muestra es el más frecuente del nivel; si hay más de
    // uno, se marca como mixto.
    const ordenados = [...acc.combos].sort((a, b) => b[1] - a[1]);
    const [claveDominante] = ordenados[0] ?? [`${HORA_POR_DEFECTO}|0`];
    const [hora, tol] = claveDominante.split("|");
    return {
      nivelAcademico,
      grupos: acc.grupos,
      gruposSinHorario: acc.sinHorario,
      horaEntrada: hora,
      minutosTolerancia: Number(tol) || 0,
      mixto: ordenados.length > 1,
    };
  });
}

/**
 * Aplica hora de entrada y tolerancia a todos los grupos de un nivel.
 * Devuelve cuántos grupos quedaron actualizados.
 */
export async function guardarHorarioNivel(
  nivelAcademico: string,
  horaEntrada: string,
  minutosTolerancia: number
): Promise<number> {
  if (!/^\d{2}:\d{2}$/.test(horaEntrada)) throw new Error("Hora de entrada inválida");
  if (!Number.isInteger(minutosTolerancia) || minutosTolerancia < 0 || minutosTolerancia > 120) {
    throw new Error("La tolerancia debe ser un número entre 0 y 120 minutos");
  }

  const grupos = (await listarGrupos()).filter((g) => g.nivelAcademico === nivelAcademico);
  if (grupos.length === 0) throw new Error("Ese nivel no tiene grupos");

  const ids = grupos.map((g) => g.id);
  const existentes = await supaGet<HorarioRow>(
    "horarios_retardo",
    qs([`grupo_id=in.(${ids.join(",")})`, "select=id,grupo_id,hora_entrada,minutos_tolerancia", "limit=500"])
  );
  const conHorario = new Set(existentes.map((h) => h.grupo_id));

  const patch = { hora_entrada: horaEntrada, minutos_tolerancia: minutosTolerancia };

  // Un solo PATCH para todos los grupos que ya tienen fila, en vez de N.
  if (conHorario.size > 0) {
    await supaUpdateMany("horarios_retardo", `grupo_id=in.(${[...conHorario].join(",")})`, patch);
  }

  // Y un insert por cada grupo que todavía no tenía horario: sin fila, el
  // escaneo nunca marca retardo (ver lib/escaneo.ts).
  const faltantes = ids.filter((id) => !conHorario.has(id));
  for (const grupoId of faltantes) {
    await supaInsert("horarios_retardo", { grupo_id: grupoId, ...patch });
  }

  return ids.length;
}
