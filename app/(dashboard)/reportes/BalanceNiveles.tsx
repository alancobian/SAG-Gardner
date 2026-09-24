"use client";

// Balance general del periodo: primero el instituto completo, luego una
// tarjeta por nivel.
//
// EL DENOMINADOR ES SIEMPRE EL MISMO
//
// Días hábiles del rango × alumnos. Para cada corte, puntuales + retardos +
// faltas suma exactamente esa cifra, así que las tres se leen sin tener que
// preguntar "¿sobre qué está calculado esto?". Es la misma regla del Balance
// por grupo, y por eso los números de las dos pantallas coinciden.

import type { AlumnoAcumulado } from "@/lib/acumulados";

export type Balance = {
  etiqueta: string;
  alumnos: number;
  puntuales: number;
  retardos: number;
  faltas: number;
  posibles: number;
  asistencia: number;
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

export function calcularBalance(
  etiqueta: string,
  lista: AlumnoAcumulado[],
  diasLectivos: number
): Balance {
  const alumnos = lista.length;
  const posibles = alumnos * diasLectivos;
  const puntuales = lista.reduce((s, a) => s + a.puntuales, 0);
  const retardos = lista.reduce((s, a) => s + a.retardos, 0);
  const asistencias = puntuales + retardos;
  return {
    etiqueta,
    alumnos,
    puntuales,
    retardos,
    // Todo lo que no fue una llegada registrada. Cierra contra `posibles`.
    faltas: Math.max(0, posibles - asistencias),
    posibles,
    asistencia: posibles ? Math.round((asistencias / posibles) * 100) : 0,
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

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              etiqueta: "Asistencia",
              valor: `${instituto.asistencia}%`,
              color: colorAsistencia(instituto.asistencia),
            },
            {
              etiqueta: "Llegadas a tiempo",
              valor: instituto.puntuales.toLocaleString("es-MX"),
              color: "text-estado-puntual",
            },
            {
              etiqueta: "Retardos",
              valor: instituto.retardos.toLocaleString("es-MX"),
              color: "text-estado-retardo",
            },
            {
              etiqueta: "Faltas",
              valor: instituto.faltas.toLocaleString("es-MX"),
              color: "text-red-600",
            },
          ].map((c) => (
            <div key={c.etiqueta}>
              <p className={`text-3xl font-bold ${c.color}`}>{c.valor}</p>
              <p className="mt-0.5 text-xs font-semibold text-gardner-gris/70">{c.etiqueta}</p>
            </div>
          ))}
        </div>

        <BarraBalance balance={instituto} alto="h-2.5" />

        {/* Sin esta línea el porcentaje se malinterpreta: con el escaneo a
            medio adoptar, "asistencia" mide tanto al alumno como al hábito de
            pasar credencial. */}
        <p className="mt-2 text-[11px] leading-relaxed text-gardner-gris/55">
          Calculado sobre los {diasLectivos * instituto.alumnos > 0 ? "días hábiles" : "días"} del
          periodo: un día en que no se registró la entrada cuenta como falta. Si el porcentaje se ve
          bajo, revisa primero <strong>Cobertura por grupo</strong> — puede estar midiendo el escaneo
          y no la asistencia.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {niveles.map((n) => {
          const activo = nivelActivo === n.etiqueta;
          return (
            <button
              key={n.etiqueta}
              onClick={() => onElegirNivel?.(activo ? "" : n.etiqueta)}
              className={`rounded-2xl bg-white p-4 text-left shadow-sm transition ${
                onElegirNivel ? "hover:shadow-md" : "cursor-default"
              } ${activo ? "ring-2 ring-gardner-azul" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
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
                <p className={`text-2xl font-bold ${colorAsistencia(n.asistencia)}`}>
                  {n.asistencia}%
                </p>
              </div>

              <BarraBalance balance={n} alto="h-2" />

              <div className="mt-2 flex justify-between text-[11px] font-semibold">
                <span className="text-estado-puntual">
                  {n.puntuales.toLocaleString("es-MX")} a tiempo
                </span>
                <span className="text-estado-retardo">
                  {n.retardos.toLocaleString("es-MX")} retardos
                </span>
                <span className="text-red-600">{n.faltas.toLocaleString("es-MX")} faltas</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Barra apilada de puntual / retardo / falta sobre el total posible. */
function BarraBalance({ balance, alto }: { balance: Balance; alto: string }) {
  const p = (v: number) => (balance.posibles ? (v / balance.posibles) * 100 : 0);
  return (
    <div className={`mt-3 flex ${alto} overflow-hidden rounded-full bg-gardner-gris/10`}>
      <div className="bg-estado-puntual" style={{ width: `${p(balance.puntuales)}%` }} />
      <div className="bg-estado-retardo" style={{ width: `${p(balance.retardos)}%` }} />
      <div className="bg-red-500" style={{ width: `${p(balance.faltas)}%` }} />
    </div>
  );
}
