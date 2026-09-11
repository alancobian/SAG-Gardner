// Puerto directo de get_reporteDiario (http-functions-supabase.js, Bloque 1)
// a una funcion de servidor que se puede llamar desde un Server Component,
// sin pasar por un endpoint HTTP intermedio. Misma logica, mismo contrato de
// datos -- solo cambia la forma de invocarla.

import { supaGet, supaCount, eqP, qs } from "./supabaseAdmin";
import { filtroNivel, tieneAccesoTotal } from "./niveles";

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
  codigo_qr: string | null;
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
  codigoQr: string | null;
  // Solo tiene sentido cuando el alumno esta Ausente: indica si esa falta ya
  // esta cubierta por un justificante que abarque la fecha del reporte.
  justificado: boolean;
};

export type GrupoReporte = {
  id: string;
  grupo: string;
  nivelAcademico: string;
  grado: string;
  // Docente titular (tutor) del grupo. Queda en null mientras no se asigne.
  tutor: string | null;
  alumnos: AlumnoReporte[];
};

// Comparativa contra el dia lectivo anterior con registros, para las tarjetas
// de resumen ("vs ayer"). Se busca hacia atras en vez de restar un dia a secas
// para no comparar un lunes contra un domingo sin clases.
export type ComparativaDia = {
  fecha: string;
  puntual: number;
  retardo: number;
  ausente: number;
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
  comparativa: ComparativaDia | null;
};

// El tutor de cada grupo vive en grupos.docente_titular_id, columna que agrega
// la migracion 1. Se consulta aparte y con red de seguridad para que el
// dashboard siga funcionando si la migracion todavia no se ha corrido: en ese
// caso simplemente no hay tutores y las tarjetas lo omiten.
async function obtenerTutoresPorGrupo(): Promise<Map<string, string>> {
  try {
    const rows = await supaGet<{ id: string; docente_titular: { nombre: string } | null }>(
      "grupos",
      qs(["select=id,docente_titular:docentes!grupos_docente_titular_id_fkey(nombre)", "limit=200"])
    );
    const mapa = new Map<string, string>();
    rows.forEach((g) => {
      if (g.docente_titular) mapa.set(g.id, g.docente_titular.nombre);
    });
    return mapa;
  } catch {
    return new Map();
  }
}

// Alumnos con una falta justificada que cubra la fecha dada. Igual que arriba,
// depende de columnas que agrega la migracion 1 y degrada sin romper.
async function obtenerAlumnosJustificados(fecha: string): Promise<Set<string>> {
  try {
    const rows = await supaGet<{ alumno_id: string }>(
      "justificantes",
      qs(["select=alumno_id", `fecha_inicio=lte.${fecha}`, `fecha_fin=gte.${fecha}`, "limit=1000"])
    );
    return new Set(rows.map((j) => j.alumno_id));
  } catch {
    return new Set();
  }
}

// Retrocede dia por dia (hasta 7) hasta encontrar uno con registros, y devuelve
// sus totales. Si no hay nada -- inicio de ciclo, vacaciones largas -- devuelve
// null y la UI oculta la comparativa en vez de inventar un 0.
async function obtenerComparativa(fecha: string, totalAlumnos: number): Promise<ComparativaDia | null> {
  for (let i = 1; i <= 7; i++) {
    const dia = new Date(fecha + "T12:00:00");
    dia.setDate(dia.getDate() - i);
    const fechaPrevia = dia.toISOString().slice(0, 10);

    const registros = await supaGet<{ estatus: string }>(
      "registros_asistencia",
      qs([eqP("fecha", fechaPrevia), "select=estatus", "limit=1000"])
    );
    if (registros.length === 0) continue;

    const puntual = registros.filter((r) => r.estatus === "Puntual").length;
    const retardo = registros.filter((r) => r.estatus === "Retardo").length;
    return {
      fecha: fechaPrevia,
      puntual,
      retardo,
      ausente: Math.max(totalAlumnos - registros.length, 0),
    };
  }
  return null;
}

// Fecha de hoy en Mexico, en formato "YYYY-MM-DD". Se exporta porque otras
// consultas (el roster de un grupo, por ejemplo) necesitan el mismo criterio
// de "hoy" que el reporte, y no deben reimplementarlo por su cuenta.
export function fechaHoyMx(): string {
  return fechaComoTextoMx(new Date());
}

function fechaComoTextoMx(fecha: Date) {
  // Mexico (mayor parte del pais) esta fijo en UTC-6 desde 2022 (sin horario
  // de verano) -- mismo criterio ya usado en el backend de Bloque 1.
  const local = new Date(fecha.getTime() - 6 * 60 * 60 * 1000);
  const anio = local.getUTCFullYear();
  const mes = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(local.getUTCDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

// Cuantas faltas de hoy siguen sin justificante. Es el numero que el sidebar
// muestra como pendiente sobre Justificantes, asi que se calcula con conteos
// (tres consultas que no traen filas) en vez de armar el reporte completo,
// porque corre en cada carga del panel.
export async function contarAusenciasSinJustificar(
  fechaParam?: string,
  niveles?: string[]
): Promise<number> {
  const fecha = fechaParam || fechaHoyMx();
  try {
    // Con alcance restringido el conteo sale del reporte ya filtrado: son
    // pocos grupos y así el número coincide exactamente con lo que esa persona
    // ve en pantalla, en vez de contar alumnos de niveles que no le tocan.
    if (!tieneAccesoTotal(niveles)) {
      const reporte = await obtenerReporteDiario(fecha, niveles);
      return reporte.grupos.reduce(
        (acc, g) => acc + g.alumnos.filter((a) => a.estatus === "Ausente" && !a.justificado).length,
        0
      );
    }

    const [activos, conRegistro, justificados] = await Promise.all([
      supaCount("alumnos", eqP("estatus", "Activo")),
      supaCount("registros_asistencia", eqP("fecha", fecha)),
      supaCount("justificantes", qs([`fecha_inicio=lte.${fecha}`, `fecha_fin=gte.${fecha}`])),
    ]);
    return Math.max(activos - conRegistro - justificados, 0);
  } catch {
    // Antes de la migracion 1 las columnas del rango no existen; en ese caso
    // no se pinta badge en vez de romper la navegacion entera.
    return 0;
  }
}

export async function obtenerReporteDiario(fechaParam?: string, niveles?: string[]): Promise<ReporteDiario> {
  const fecha = fechaParam || fechaComoTextoMx(new Date());

  const [alumnosRows, registrosRows, calendarioRows, tutores, justificados] = await Promise.all([
    // El filtro por nivel viaja dentro del embed del grupo: PostgREST acepta
    // "grupo.nivel_academico=in.(...)" y, junto con el !inner, descarta a los
    // alumnos cuyo grupo no cae en el alcance en vez de traerlos con grupo nulo.
    supaGet<Alumno>(
      "alumnos",
      qs([
        eqP("estatus", "Activo"),
        tieneAccesoTotal(niveles) ? "select=*,grupo:grupos(*)" : "select=*,grupo:grupos!inner(*)",
        filtroNivel(niveles, "grupo.nivel_academico"),
        "limit=1000",
      ])
    ),
    supaGet<RegistroAsistencia>("registros_asistencia", qs([eqP("fecha", fecha), "limit=1000"])),
    supaGet<DiaCalendario>("calendario_escolar", eqP("fecha", fecha)),
    obtenerTutoresPorGrupo(),
    obtenerAlumnosJustificados(fecha),
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
        tutor: grupo ? tutores.get(grupo.id) ?? null : null,
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

    gruposMap.get(grupoId)!.alumnos.push({
      id: alumno.id,
      nombre: alumno.nombre,
      estatus,
      horaEntrada,
      horaSalida,
      foto: alumno.foto_url || null,
      codigoQr: alumno.codigo_qr || null,
      justificado: estatus === "Ausente" && justificados.has(alumno.id),
    });
  });

  const grupos = Array.from(gruposMap.values()).sort((a, b) => {
    const nivelA = ORDEN_NIVEL[a.nivelAcademico] ?? 99;
    const nivelB = ORDEN_NIVEL[b.nivelAcademico] ?? 99;
    if (nivelA !== nivelB) return nivelA - nivelB;
    return a.grupo.localeCompare(b.grupo, "es", { numeric: true });
  });

  const comparativa = await obtenerComparativa(fecha, alumnosRows.length);

  return {
    fecha,
    tipoDia,
    totales: { puntual: totalPuntual, retardo: totalRetardo, ausente: totalAusente, total: alumnosRows.length },
    grupos,
    comparativa,
  };
}
