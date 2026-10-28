// Corrección manual del estatus de entrada de un alumno (Puntual ↔ Retardo).
//
// POR QUÉ EXISTE
//
// El estatus lo decide el reloj del escaneo contra la hora de entrada del
// grupo, y a veces se equivoca por razones legítimas: el alumno llegó a tiempo
// pero la fila del lector lo retrasó, el horario del nivel estaba mal cargado
// ese día, hubo un evento. Sin forma de corregirlo, la única salida era pedirle
// a alguien que editara la base a mano.
//
// QUÉ *NO* HACE
//
// No crea registros. Un alumno "Ausente" no tiene fila en registros_asistencia,
// y darle una desde aquí sería pase de lista a destiempo: a media mañana ya no
// se puede saber si llegó temprano o tarde, y marcarlo "Puntual" inventaría un
// dato. Por eso solo se mueve entre los dos estatus que nacieron de un escaneo
// real.
//
// QUEDA REGISTRADO
//
// Cambiar un Retardo a Puntual es justo el tipo de edición que alguien va a
// cuestionar después, así que se guarda quién lo hizo y cuándo (migración 7).
// Si esas columnas todavía no existen, el cambio se aplica igual y sin
// bitácora, en vez de fallar.

import { supaGet, supaUpdate, eqP, qs } from "./supabaseAdmin";
import { horaLocalMx } from "./escaneo";

export type EstatusCorregible = "Puntual" | "Retardo";

type RegistroRow = {
  id: string;
  alumno_id: string;
  fecha: string;
  estatus: string;
  hora_entrada: string | null;
};

export async function corregirEstatusEntrada(
  alumnoId: string,
  fecha: string,
  nuevoEstatus: EstatusCorregible,
  usuarioId: string
): Promise<{ estatus: EstatusCorregible }> {
  if (!alumnoId) throw new Error("Falta el alumno");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("Fecha no válida");
  if (nuevoEstatus !== "Puntual" && nuevoEstatus !== "Retardo") {
    throw new Error("Estatus no válido");
  }

  const registros = await supaGet<RegistroRow>(
    "registros_asistencia",
    qs([
      eqP("alumno_id", alumnoId),
      eqP("fecha", fecha),
      "select=id,alumno_id,fecha,estatus,hora_entrada",
      "limit=1",
    ])
  );

  if (registros.length === 0) {
    throw new Error(
      "Ese alumno no tiene entrada registrada ese día; no se puede cambiar su estatus."
    );
  }

  const registro = registros[0];
  if (registro.estatus !== "Puntual" && registro.estatus !== "Retardo") {
    throw new Error(`No se puede corregir un registro en estatus "${registro.estatus}".`);
  }
  if (registro.estatus === nuevoEstatus) return { estatus: nuevoEstatus };

  const conBitacora = {
    estatus: nuevoEstatus,
    estatus_corregido_por_id: usuarioId,
    estatus_corregido_en: horaLocalMx().toISOString(),
  };

  try {
    await supaUpdate("registros_asistencia", eqP("id", registro.id), conBitacora);
  } catch {
    // Sin la migración 7 las columnas de bitácora no existen: se aplica el
    // cambio de estatus solo, que es lo que el usuario pidió.
    await supaUpdate("registros_asistencia", eqP("id", registro.id), { estatus: nuevoEstatus });
  }

  return { estatus: nuevoEstatus };
}
