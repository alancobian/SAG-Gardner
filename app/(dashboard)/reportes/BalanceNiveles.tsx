"use client";

// Balance general del periodo: primero el instituto completo, luego una
// tarjeta por nivel.
//
// POR QUÉ PORCENTAJES Y NO CONTEOS
//
// "473 a tiempo, 1,706 faltas" no se puede comparar entre niveles: Prepa tiene
// 131 alumnos y Primaria 115, y un periodo de 5 días no se parece a uno de 20.
// El conteo crudo obliga a hacer la división mentalmente antes de poder opinar.
//
// Así que lo que se lee grande es el porcentaje, y los tres porcentajes suman
// exactamente 100: de todos los días-alumno posibles del periodo, este tanto
// llegó a tiempo, este tanto llegó tarde y este tanto no se presentó. Eso sí se
// compara de un vistazo entre Primaria, Secundaria y Prepa.
//
// EL DENOMINADOR
//
// Días hábiles del rango × alumnos del corte. El mismo del Balance por grupo,
// para que las dos pantallas den el mismo número.

import type { AlumnoAcumulado } from "@/lib/acumulados";

export type Balance = {
  etiqueta: string;
  alumnos: number;
  puntuales: number;
  retardos: number;
  faltas: number;
  posibles: number;
  /** Los tres suman 100. */
  pctPuntual: number;
  pctRetardo: number;
  pctFalta: number;
  /** Puntuales + retardos, que es "asistió aunque haya llegado tarde". */
  asistencia: number;
  /** Alumnos por día, para leer el porcentaje en gente y no en abstracto. */
  promedioPuntual: number;
  promedioRetardo: number;
  promedioFalta: number;
};

/** Orden pedagógico, no alfabético: Preescolar → Preparatoria. */
const ORDEN_NIVEL: Record<string, number> = {
  Preescolar: 0,
  Primaria: 1,
  Secundaria: 2,
  Preparatoria: 3,
};

const ICONO_NIVEL: Record<string, string> = {
  Preescolar: "child_care",
  Primaria: "backpack",
  Secundaria: "menu_book",
  Preparatoria: "school",
};

/** Un decimal: con porcentajes chicos, redondear a entero borra diferencias. */
const un = (n: number) => Math.round(n * 10) / 10;
export const pctTexto = (n: number) => `${un(n).toLocaleString("es-MX")}%`;

export function calcularBalance(
  etiqueta: string,
  lista: AlumnoAcumulado[],
  diasLectivos: number
): Balance {
  const alumnos = lista.length;
  const posibles = alumnos * diasLectivos;
  const puntuales = lista.reduce((s, a) => s + a.puntuales, 0);
  const retardos = lista.reduce((s, a) => s + a.retardos, 0);
  // Todo lo que no fue una llegada registrada. Cierra contra `posibles`.
  const faltas = Math.max(0, posibles - puntuales - retardos);
  const p = (v: number) => (posibles ? (v / posibles) * 100 : 0);
  const porDia = (v: number) => (diasLectivos ? un(v / diasLectivos) : 0);

  return {
    etiqueta,
    alumnos,
    puntuales,
    retardos,
    faltas,
    posibles,
    pctPuntual: un(p(puntuales)),
    pctRetardo: un(p(retardos)),
    pctFalta: un(p(faltas)),
    asistencia: un(p(puntuales + retardos)),
    promedioPuntual: porDia(puntuales),
    promedioRetardo: porDia(retardos),
    promedioFalta: porDia(faltas),
  };
}

export function balancePorNivel(lista: AlumnoAcumulado[], diasLectivos: number): Balance[] {
  const porNivel = new Map<string, AlumnoAcumulado[]>();
  for (const a of lista) {
    const actual = porNivel.get(a.nivelAcademico);
    if (actual) actual.push(a);
    else porNivel.set(a.nivelAcademico, [a]);
  }
  return [...porNivel]
    .map(([nivel, alumnos]) => calcularBalance(nivel, alumnos, diasLectivos))
    .sort((a, b) => (ORDEN_NIVEL[a.etiqueta] ?? 99) - (ORDEN_NIVEL[b.etiqueta] ?? 99));
}

/** Las tres series, en el mismo orden en todas partes. */
const SERIES = [
  { clave: "puntual" as const, etiqueta: "A tiempo", color: "text-estado-puntual", barra: "bg-estado-puntual" },
  { clave: "retardo" as const, etiqueta: "Con retardo", color: "text-estado-retardo", barra: "bg-estado-retardo" },
  { clave: "falta" as const, etiqueta: "Faltó", color: "text-red-600", barra: "bg-red-500" },
];

const valores = (b: Balance) => ({
  puntual: { pct: b.pctPuntual, promedio: b.promedioPuntual },
  retardo: { pct: b.pctRetardo, promedio: b.promedioRetardo },
  falta: { pct: b.pctFalta, promedio: b.promedioFalta },
});

function colorAsistencia(pct: number) {
  if (pct >= 85) return "text-estado-puntual";
  if (pct >= 70) return "text-estado-retardo";
  return "text-red-600";
}

export default function BalanceNiveles({
  instituto,
  niveles,
  diasLectivos,
  onElegirNivel,
  nivelActivo,
}: {
  instituto: Balance;
  niveles: Balance[];
  diasLectivos: number;
  /** Tocar una tarjeta filtra el resto de la pantalla por ese nivel. */
  onElegirNivel?: (nivel: string) => void;
  nivelActivo?: string;
}) {
  const v = valores(instituto);

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold text-gardner-gris">Instituto Gardner</h2>
          <p className="text-xs font-medium text-gardner-gris/60">
            {diasLectivos} {diasLectivos === 1 ? "día hábil" : "días hábiles"} en el periodo ·{" "}
            {instituto.alumnos} alumnos
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SERIES.map((s) => (
            <div key={s.clave}>
              <p className={`text-4xl font-bold ${s.color}`}>{pctTexto(v[s.clave].pct)}</p>
              <p className="mt-0.5 text-xs font-semibold text-gardner-gris/70">{s.etiqueta}</p>
              <p className="text-[11px] text-gardner-gris/50">
                ≈ {v[s.clave].promedio.toLocaleString("es-MX")} alumnos al día
              </p>
            </div>
          ))}
        </div>

        <BarraBalance balance={instituto} alto="h-2.5" />

        <p className="mt-2 text-[11px] leading-relaxed text-gardner-gris/55">
          Los tres porcentajes suman 100% de los días hábiles del periodo. Asistencia total (a tiempo
          + retardo): <strong className={colorAsistencia(instituto.asistencia)}>
            {pctTexto(instituto.asistencia)}
          </strong>
          . Un día en que no se registró la entrada cuenta como falta: si el porcentaje se ve bajo,
          revisa <strong>Cobertura por grupo</strong> antes de concluir.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {niveles.map((n) => {
          const activo = nivelActivo === n.etiqueta;
          const vn = valores(n);
          return (
            <button
              key={n.etiqueta}
              onClick={() => onElegirNivel?.(activo ? "" : n.etiqueta)}
              className={`rounded-2xl bg-white p-4 text-left shadow-sm transition ${
                onElegirNivel ? "hover:shadow-md" : "cursor-default"
              } ${activo ? "ring-2 ring-gardner-azul" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gardner-azul/10 text-gardner-azul-oscuro">
                  <span className="material-symbols-outlined text-[18px]">
                    {ICONO_NIVEL[n.etiqueta] ?? "school"}
                  </span>
                </span>
                <div>
                  <p className="text-sm font-bold text-gardner-gris">{n.etiqueta}</p>
                  <p className="text-[11px] text-gardner-gris/55">{n.alumnos} alumnos</p>
                </div>
              </div>

              <BarraBalance balance={n} alto="h-2" />

              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {SERIES.map((s) => (
                  <div key={s.clave}>
                    <p className={`text-xl font-bold ${s.color}`}>{pctTexto(vn[s.clave].pct)}</p>
                    <p className="text-[11px] font-semibold text-gardner-gris/65">{s.etiqueta}</p>
                    <p className="text-[10px] text-gardner-gris/45">
                      ≈ {vn[s.clave].promedio.toLocaleString("es-MX")}/día
                    </p>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Barra apilada de a tiempo / retardo / falta sobre el total posible. */
function BarraBalance({ balance, alto }: { balance: Balance; alto: string }) {
  return (
    <div className={`mt-3 flex ${alto} overflow-hidden rounded-full bg-gardner-gris/10`}>
      <div className="bg-estado-puntual" style={{ width: `${balance.pctPuntual}%` }} />
      <div className="bg-estado-retardo" style={{ width: `${balance.pctRetardo}%` }} />
      <div className="bg-red-500" style={{ width: `${balance.pctFalta}%` }} />
    </div>
  );
}
