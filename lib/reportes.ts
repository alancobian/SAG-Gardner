// Puerto directo de get_reporteDiario (http-functions-supabase.js, Bloque 1)
// a una funcion de servidor que se puede llamar desde un Server Component,
// sin pasar por un endpoint HTTP intermedio. Misma logica, mismo contrato de
// datos -- solo cambia la forma de invocarla.

import { supaGet, eqP, qs } from "./supabaseAdmin";

type Grupo = {
  id: string;
  nombre: string;
  nivel_academico: string;
  grado: string;
};

type Alumno = {
  id: string;
  nombre: string;
  estatus: string;
  foto_url: string | null;
  grupo: Grupo | null;
};

type RegistroAsistencia = {
  alumno_id: string;
  estatus: "Puntual" | "Retardo" | string;
  hora_entrada: string | null;
  hora_salida: string | null;
};

type DiaCalendario = {
  fecha: string;
  aplica_a: string | null;
  tipo_dia: string;
};

export type AlumnoReporte = {
  id: string;
  nombre: string;
  estatus: "Puntual" | "Retardo" | "Ausente" | string;
  horaEntrada: string | null;
  horaSalida: string | null;
  foto: string | null;
};

export type GrupoReporte = {
  id: string;
  grupo: string;
  nivelAcademico: string;
  grado: string;
  alumnos: AlumnoReporte[];
};

// Primaria y Secundaria usan el mismo patron de nombre ("1° grado A", etc.),
// asi que el nombre del grupo NO es unico entre niveles -- solo el id lo es.
// Este orden tambien se usa para que la lista se vea agrupada por nivel en
// vez de mezclada alfabeticamente.
const ORDEN_NIVEL: Record<string, number> = {
  Preescolar: 0,
  Primaria: 1,
  Secundaria: 2,
  Preparatoria: 3,
};

export type ReporteDiario = {
  fecha: string;
  tipoDia: string;
  totales: { puntual: number; retardo: number; ausente: number; total: number };
  grupos: GrupoReporte[];
};

function fechaComoTextoMx(fecha: Date) {
  // Mexico (mayor parte del pais) esta fijo en UTC-6 desde 2022 (sin horario
  // de verano) -- mismo criterio ya usado en el backend de Bloque 1.
  const local = new Date(fecha.getTime() - 6 * 60 * 60 * 1000);
  const anio = local.getUTCFullYear();
  const mes = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(local.getUTCDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export async function obtenerReporteDiario(fechaParam?: string): Promise<ReporteDiario> {
  const fecha = fechaParam || fechaComoTextoMx(new Date());

  const [alumnosRows, registrosRows, calendarioRows] = await Promise.all([
    supaGet<Alumno>("alumnos", qs([eqP("estatus", "Activo"), "select=*,grupo:grupos(*)", "limit=1000"])),
    supaGet<RegistroAsistencia>("registros_asistencia", qs([eqP("fecha", fecha), "limit=1000"])),
    supaGet<DiaCalendario>("calendario_escolar", eqP("fecha", fecha)),
  ]);

  const diaAlumnos = calendarioRows.find(
    (item) => !item.aplica_a || item.aplica_a === "Alumnos" || item.aplica_a === "Ambos"
  );
  const tipoDia = diaAlumnos ? diaAlumnos.tipo_dia : "Lectivo";

  const registrosPorAlumno = new Map<string, RegistroAsistencia>();
  registrosRows.forEach((registro) => registrosPorAlumno.set(registro.alumno_id, registro));

  const gruposMap = new Map<string, GrupoReporte>();
  let totalPuntual = 0;
  let totalRetardo = 0;
  let totalAusente = 0;

  alumnosRows.forEach((alumno) => {
    const grupo = alumno.grupo;
    const grupoId = grupo ? grupo.id : "sin-grupo";
    const grupoNombre = grupo ? grupo.nombre : "Sin grupo";

    if (!gruposMap.has(grupoId)) {
      gruposMap.set(grupoId, {
        id: grupoId,
        grupo: grupoNombre,
        nivelAcademico: grupo ? grupo.nivel_academico : "",
        grado: grupo ? grupo.grado : "",
        alumnos: [],
      });
    }

    const registro = registrosPorAlumno.get(alumno.id);
    let estatus: AlumnoReporte["estatus"] = "Ausente";
    let horaEntrada: string | null = null;
    let horaSalida: string | null = null;

    if (registro) {
      estatus = registro.estatus;
      horaEntrada = registro.hora_entrada || null;
      horaSalida = registro.hora_salida || null;
    }

    if (estatus === "Puntual") totalPuntual++;
    else if (estatus === "Retardo") totalRetardo++;
    else totalAusente++;

    gruposMap
      .get(grupoId)!
      .alumnos.push({ id: alumno.id, nombre: alumno.nombre, estatus, horaEntrada, horaSalida, foto: alumno.foto_url || null });
  });

  const grupos = Array.from(gruposMap.values()).sort((a, b) => {
    const nivelA = ORDEN_NIVEL[a.nivelAcademico] ?? 99;
    const nivelB = ORDEN_NIVEL[b.nivelAcademico] ?? 99;
    if (nivelA !== nivelB) return nivelA - nivelB;
    return a.grupo.localeCompare(b.grupo, "es", { numeric: true });
  });

  return {
    fecha,
    tipoDia,
    totales: { puntual: totalPuntual, retardo: totalRetardo, ausente: totalAusente, total: alumnosRows.length },
    grupos,
  };
}
