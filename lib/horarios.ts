// Horario institucional de docentes: la hora de entrada y minutos de
// tolerancia que aplican por default a cualquier docente de tiempo completo
// (es decir, que no tiene sus propios bloques de horario en
// bloques_horario_docentes -- ver lib/docentes.ts y lib/escaneo.ts).
//
// Es una sola fila en horario_retardo_docentes (igual que en el backend de
// Wix/http-functions-supabase.js), pero hasta ahora nunca existia una
// pantalla para cargarla -- la tabla estaba vacia y por lo tanto ningun
// docente de tiempo completo podia marcarse "Retardo".

import { supaGet, supaInsert, supaUpdate, eqP, qs } from "./supabaseAdmin";

export type HorarioInstitucionalDocentes = {
  horaEntrada: string; // "HH:MM"
  minutosTolerancia: number;
};

type HorarioRow = {
  id: string;
  hora_entrada: string;
  minutos_tolerancia: number | null;
};

export async function obtenerHorarioInstitucionalDocentes(): Promise<HorarioInstitucionalDocentes | null> {
  const rows = await supaGet<HorarioRow>("horario_retardo_docentes", qs(["limit=1"]));
  if (rows.length === 0) return null;
  const fila = rows[0];
  return {
    horaEntrada: fila.hora_entrada.slice(0, 5),
    minutosTolerancia: fila.minutos_tolerancia ?? 0,
  };
}

export async function guardarHorarioInstitucionalDocentes(
  horaEntrada: string,
  minutosTolerancia: number
): Promise<void> {
  const existentes = await supaGet<{ id: string }>("horario_retardo_docentes", qs(["limit=1"]));
  const patch = { hora_entrada: horaEntrada, minutos_tolerancia: minutosTolerancia };
  if (existentes.length > 0) {
    await supaUpdate("horario_retardo_docentes", eqP("id", existentes[0].id), patch);
  } else {
    await supaInsert("horario_retardo_docentes", patch);
  }
}
