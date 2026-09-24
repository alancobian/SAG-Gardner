"use client";

// Gráfica de barras apiladas, dibujada como SVG a mano.
//
// Por qué SVG propio y no una librería de charts: la gráfica tiene que poder
// descargarse como PNG para pegarse en el PPTX mensual de Dirección, y exportar
// un SVG que uno mismo controla es trivial (serializar → canvas → PNG). Con una
// librería habría que pelearse con su DOM, sus fuentes externas y su canvas
// interno. Además esto pesa cero kilobytes de dependencia.
//
// Todo va con atributos y estilos en línea, sin clases de Tailwind, porque al
// exportar el SVG se pierde cualquier CSS que viva fuera del propio nodo.

import { useRef } from "react";
import type { FilaAnalitica } from "@/lib/analitica";

export const SERIES = [
  { clave: "puntual" as const, etiqueta: "Puntual", color: "#16a34a" },
  { clave: "retardo" as const, etiqueta: "Retardo", color: "#f59e0b" },
  { clave: "falta" as const, etiqueta: "Falta", color: "#dc2626" },
  // Gris deliberadamente apagado: no es un resultado, es ausencia de dato.
  { clave: "sinRegistro" as const, etiqueta: "Sin registro", color: "#c7c9d1" },
];

const GRIS = "#52515d";
const AZUL_OSCURO = "#005386";

function formatoFecha(f: string) {
  return new Date(`${f}T12:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function GraficaBarras({
  titulo,
  filas,
  desde,
  hasta,
  diasLectivos,
  mostrarNivel = false,
}: {
  titulo: string;
  filas: FilaAnalitica[];
  desde: string;
  hasta: string;
  diasLectivos: number;
  /**
   * Agrega el nivel bajo el nombre. Imprescindible en los cortes por grado y
   * grupo: "1° grado A" existe en Primaria Y en Secundaria, y sin el nivel las
   * dos barras se ven idénticas.
   */
  mostrarNivel?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const ALTO_BARRA = 34;
  const ESPACIO = 12;
  const MARGEN_IZQ = 170;
  const MARGEN_DER = 76;
  const TOPE = 96;
  const PIE = 62;
  const ANCHO = 900;
  const anchoUtil = ANCHO - MARGEN_IZQ - MARGEN_DER;
  const alto = TOPE + filas.length * (ALTO_BARRA + ESPACIO) + PIE;

  const maximo = Math.max(1, ...filas.map((f) => f.posibles));

  function descargarPng() {
    const svg = svgRef.current;
    if (!svg) return;
    const texto = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    // El SVG va como data URI en base64 para que el canvas no quede "tainted"
    // y toDataURL siga funcionando.
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // ×2 para que la imagen se vea nítida al proyectarla o imprimirla.
      canvas.width = ANCHO * 2;
      canvas.height = alto * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `SAG-${titulo.replace(/[^a-zA-Z0-9]+/g, "-")}-${desde}-a-${hasta}.png`;
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(texto)))}`;
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gardner-gris">{titulo}</h3>
        <button
          onClick={descargarPng}
          className="flex items-center gap-1.5 rounded-xl bg-gardner-azul px-3 py-2 text-xs font-semibold text-white transition hover:bg-gardner-azul-oscuro"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          Descargar PNG
        </button>
      </div>

      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${ANCHO} ${alto}`}
          width={ANCHO}
          height={alto}
          style={{ maxWidth: "100%", height: "auto" }}
        >
          <rect x="0" y="0" width={ANCHO} height={alto} fill="#ffffff" />

          <text x="24" y="34" fontFamily="Arial, sans-serif" fontSize="19" fontWeight="700" fill={AZUL_OSCURO}>
            {titulo}
          </text>
          <text x="24" y="56" fontFamily="Arial, sans-serif" fontSize="13" fill={GRIS} opacity="0.8">
            {`Del ${formatoFecha(desde)} al ${formatoFecha(hasta)} · ${diasLectivos} días lectivos`}
          </text>

          {/* Leyenda */}
          {SERIES.map((s, i) => (
            <g key={s.clave} transform={`translate(${24 + i * 150}, 72)`}>
              <rect x="0" y="0" width="12" height="12" rx="3" fill={s.color} />
              <text x="18" y="11" fontFamily="Arial, sans-serif" fontSize="12" fill={GRIS}>
                {s.etiqueta}
              </text>
            </g>
          ))}

          {filas.map((fila, i) => {
            const y = TOPE + i * (ALTO_BARRA + ESPACIO);
            let x = MARGEN_IZQ;
            const escala = (v: number) => (v / maximo) * anchoUtil;
            return (
              <g key={fila.clave}>
                <text
                  x={MARGEN_IZQ - 10}
                  y={mostrarNivel ? y + ALTO_BARRA / 2 - 1 : y + ALTO_BARRA / 2 + 4}
                  textAnchor="end"
                  fontFamily="Arial, sans-serif"
                  fontSize="13"
                  fontWeight="600"
                  fill={GRIS}
                >
                  {fila.etiqueta}
                </text>
                {mostrarNivel && (
                  <text
                    x={MARGEN_IZQ - 10}
                    y={y + ALTO_BARRA / 2 + 13}
                    textAnchor="end"
                    fontFamily="Arial, sans-serif"
                    fontSize="11"
                    fill={GRIS}
                    opacity="0.65"
                  >
                    {fila.nivelAcademico}
                  </text>
                )}
                {SERIES.map((s) => {
                  const valor = fila[s.clave];
                  const ancho = escala(valor);
                  const seg = (
                    <rect key={s.clave} x={x} y={y} width={Math.max(0, ancho)} height={ALTO_BARRA} fill={s.color} />
                  );
                  x += ancho;
                  return valor > 0 ? seg : null;
                })}
                {/* El porcentaje de asistencia va al final de la barra: es el
                    número que la gente busca primero. */}
                <text
                  x={ANCHO - MARGEN_DER + 8}
                  y={y + ALTO_BARRA / 2 + 4}
                  fontFamily="Arial, sans-serif"
                  fontSize="13"
                  fontWeight="700"
                  fill={fila.porcentajeAsistencia === null ? "#9a99a3" : GRIS}
                >
                  {fila.porcentajeAsistencia === null ? "—" : `${fila.porcentajeAsistencia}%`}
                </text>
              </g>
            );
          })}

          <text
            x="24"
            y={alto - 30}
            fontFamily="Arial, sans-serif"
            fontSize="11"
            fill={GRIS}
            opacity="0.7"
          >
            El porcentaje es sobre los días medidos, no sobre el periodo completo.
          </text>
          <text
            x="24"
            y={alto - 14}
            fontFamily="Arial, sans-serif"
            fontSize="11"
            fill={GRIS}
            opacity="0.7"
          >
            Un día cuenta como medido si al menos la mitad del grupo registró su entrada · SAG · Instituto Gardner
          </text>
        </svg>
      </div>
    </div>
  );
}
