// Puerto directo de post_crearJustificante / get_justificantes /
// post_eliminarJustificante (http-functions-supabase.js, Bloque 1).

import { supaGet, supaInsert, supaDelete, eqP, qs } from "./supabaseAdmin";

export type Justificante = {
  id: string;
  fecha: string;
  motivo: string;
  autorizadoPor: string;
};

type JustificanteRow = {
  id: string;
  fecha: string;
  motivo: string;
  autorizado_por: string;
};

export async function listarJustificantes(alumnoId: string): Promise<Justificante[]> {
  const rows = await supaGet<JustificanteRow>(
    "justificantes",
    qs([eqP("alumno_id", alumnoId), "order=fecha.desc", "limit=100"])
  );
  return rows.map((j) => ({ id: j.id, fecha: j.fecha, motivo: j.motivo, autorizadoPor: j.autorizado_por }));
}

export async function crearJustificante(
  alumnoId: string,
  fecha: string,
  motivo: string,
  autorizadoPor: string
): Promise<string> {
  const nuevo = await supaInsert<{ id: string }>("justificantes", {
    alumno_id: alumnoId,
    fecha,
    motivo,
    autorizado_por: autorizadoPor,
  });
  return nuevo.id;
}

export async function eliminarJustificante(justificanteId: string): Promise<void> {
  await supaDelete("justificantes", eqP("id", justificanteId));
}
