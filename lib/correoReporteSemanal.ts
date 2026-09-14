// Plantilla del correo semanal para el maestro titular.
//
// Restricciones de correo, que explican por qué el HTML se ve anticuado:
// los clientes (Gmail, Outlook, Mail de iOS) ignoran <style>, no ejecutan JS y
// varios no soportan flexbox ni grid. Por eso todo va con <table>, estilos en
// línea y la gráfica dibujada con celdas de colores en vez de un <canvas> o una
// imagen — las imágenes además llegan bloqueadas por defecto.
//
// La mayoría lo va a abrir en el celular, así que el ancho máximo es 600px y
// los textos no bajan de 13px.

import type { ReporteSemanalGrupo } from "./reporteSemanal";
import { FALTAS_PARA_ALERTA, COBERTURA_PARA_ALERTAS } from "./reporteSemanal";

const AZUL = "#007dc4";
const AZUL_OSCURO = "#005386";
const GRIS = "#52515d";
const VERDE = "#16a34a";
const AMBAR = "#f59e0b";
const ROJO = "#dc2626";
const NEUTRO = "#fcfcfd";

function formatoFechaCorta(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

function colorAsistencia(pct: number | null) {
  if (pct === null) return "#d1d5db";
  if (pct >= 85) return VERDE;
  if (pct >= 70) return AMBAR;
  return ROJO;
}

/** Gráfica de barras verticales hecha con celdas de tabla. */
function graficaSemanal(r: ReporteSemanalGrupo): string {
  const ALTO = 90;
  const columnas = r.dias
    .map((d) => {
      const pct = d.porcentajeAsistencia;
      const alto = pct === null ? 3 : Math.max(3, Math.round((pct / 100) * ALTO));
      const color = colorAsistencia(pct);
      const valor = pct === null ? "—" : `${pct}%`;
      return `
        <td align="center" valign="bottom" style="padding:0 4px;">
          <div style="font:600 12px/1.2 Arial,sans-serif;color:${GRIS};margin-bottom:4px;">${valor}</div>
          <div style="width:100%;height:${ALTO}px;position:relative;">
            <div style="position:absolute;bottom:0;left:0;right:0;height:${alto}px;background:${color};border-radius:4px 4px 0 0;"></div>
          </div>
          <div style="font:400 12px/1.2 Arial,sans-serif;color:#8b8a93;padding-top:6px;border-top:1px solid #e5e7eb;margin-top:2px;">
            ${d.etiqueta}
          </div>
        </td>`;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;">
      <tr>${columnas}</tr>
    </table>`;
}

function tarjetaDato(etiqueta: string, valor: string, color: string): string {
  return `
    <td width="33%" align="center" style="padding:12px 6px;background:${NEUTRO};border:1px solid #e5e7eb;border-radius:10px;">
      <div style="font:700 22px/1.1 Arial,sans-serif;color:${color};">${valor}</div>
      <div style="font:400 11px/1.3 Arial,sans-serif;color:#8b8a93;padding-top:4px;">${etiqueta}</div>
    </td>`;
}

function bloqueAlertas(r: ReporteSemanalGrupo): string {
  if (r.diasConRegistro === 0) return "";

  // Cobertura insuficiente: no se señala a nadie. Se explica por qué, para que
  // el silencio no se lea como "todo bien".
  if (!r.alertasConfiables) {
    return `
      <tr><td style="padding:0 24px 20px;">
        <div style="background:${NEUTRO};border:1px solid #e5e7eb;padding:14px;border-radius:8px;">
          <div style="font:600 14px/1.4 Arial,sans-serif;color:${GRIS};">
            Esta semana no se listan alumnos con faltas
          </div>
          <div style="font:400 13px/1.5 Arial,sans-serif;color:#8b8a93;padding-top:4px;">
            Con ${r.cobertura}% de registro no es posible distinguir a un alumno que faltó
            de uno que asistió sin pasar su credencial. Prefiero no darte una lista
            que probablemente estaría equivocada. En cuanto el registro pase del
            ${COBERTURA_PARA_ALERTAS}%, estas alertas aparecen solas.
          </div>
        </div>
      </td></tr>`;
  }

  if (r.alertas.length === 0) {
    return `
      <tr><td style="padding:0 24px 20px;">
        <div style="background:#f0fdf4;border-left:4px solid ${VERDE};padding:12px 14px;border-radius:0 8px 8px 0;">
          <div style="font:600 14px/1.4 Arial,sans-serif;color:${VERDE};">Sin alertas esta semana</div>
          <div style="font:400 13px/1.5 Arial,sans-serif;color:${GRIS};padding-top:2px;">
            Ningún alumno acumuló ${FALTAS_PARA_ALERTA} o más faltas sin justificante.
          </div>
        </div>
      </td></tr>`;
  }

  const filas = r.alertas
    .map(
      (a) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f1f3;font:600 14px/1.4 Arial,sans-serif;color:${GRIS};">
          ${a.nombre}
          <div style="font:400 12px/1.4 Arial,sans-serif;color:#8b8a93;padding-top:2px;">
            ${a.fechas.map(formatoFechaCorta).join(" · ")}
          </div>
        </td>
        <td align="right" style="padding:8px 0;border-bottom:1px solid #f1f1f3;font:700 15px/1.4 Arial,sans-serif;color:${ROJO};white-space:nowrap;">
          ${a.faltasSinJustificar} faltas
        </td>
      </tr>`
    )
    .join("");

  return `
    <tr><td style="padding:0 24px 20px;">
      <div style="background:#fef2f2;border-left:4px solid ${ROJO};padding:14px;border-radius:0 8px 8px 0;">
        <div style="font:700 14px/1.4 Arial,sans-serif;color:${ROJO};padding-bottom:6px;">
          ${r.alertas.length === 1 ? "1 alumno requiere seguimiento" : `${r.alertas.length} alumnos requieren seguimiento`}
        </div>
        <div style="font:400 13px/1.5 Arial,sans-serif;color:${GRIS};padding-bottom:10px;">
          Faltaron ${FALTAS_PARA_ALERTA} o más días sin justificante registrado.
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>
      </div>
    </td></tr>`;
}

function bloqueCobertura(r: ReporteSemanalGrupo): string {
  const completo = r.diasConRegistro === r.diasLectivos && r.alertasConfiables;
  if (completo) {
    return `
      <div style="font:400 13px/1.5 Arial,sans-serif;color:#8b8a93;">
        Se registró asistencia los ${r.diasLectivos} días de clase de la semana
        (${r.cobertura}% de los alumnos).
      </div>`;
  }

  // Sin este dato el reporte se vería vacío sin explicar por qué. Va como
  // información, no como reclamo: la meta es que se entienda que los días sin
  // registro no cuentan como faltas de nadie.
  return `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;">
      <div style="font:600 13px/1.5 Arial,sans-serif;color:#92400e;">
        Se registró asistencia ${r.diasConRegistro} de ${r.diasLectivos} días de clase,
        con ${r.cobertura}% de los alumnos.
      </div>
      <div style="font:400 12px/1.5 Arial,sans-serif;color:#92400e;padding-top:3px;">
        Lo que no se registra no cuenta como falta para nadie: no se puede saber
        si el alumno faltó o si no pasó su credencial ese día.
      </div>
    </div>`;
}

export function asuntoReporteSemanal(r: ReporteSemanalGrupo): string {
  const semana = `${formatoFechaCorta(r.semanaInicio)} al ${formatoFechaCorta(r.semanaFin)}`;
  // Las alertas van en el asunto: es lo que decide si se abre hoy o el lunes.
  if (r.alertas.length > 0) {
    return `${r.grupo} · ${r.alertas.length} ${r.alertas.length === 1 ? "alumno" : "alumnos"} con faltas — semana del ${semana}`;
  }
  return `${r.grupo} · Asistencia de la semana del ${semana}`;
}

export function correoReporteSemanal(r: ReporteSemanalGrupo): string {
  const pct = r.porcentajeAsistencia;
  const variacion = r.variacionVsSemanaPrevia;

  const lineaVariacion =
    variacion === null
      ? ""
      : variacion === 0
        ? `<div style="font:400 12px/1.4 Arial,sans-serif;color:#8b8a93;padding-top:3px;">igual que la semana pasada</div>`
        : `<div style="font:600 12px/1.4 Arial,sans-serif;color:${variacion > 0 ? VERDE : ROJO};padding-top:3px;">
             ${variacion > 0 ? "▲" : "▼"} ${Math.abs(variacion)} puntos vs. la semana pasada
           </div>`;

  const cuerpo =
    r.diasConRegistro === 0
      ? `
      <tr><td style="padding:0 24px 24px;">
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;">
          <div style="font:600 14px/1.5 Arial,sans-serif;color:#92400e;">
            Esta semana no se registró asistencia en el grupo.
          </div>
          <div style="font:400 13px/1.5 Arial,sans-serif;color:#92400e;padding-top:4px;">
            Sin registros no podemos decir nada sobre la asistencia de tus alumnos.
            Si necesitas apoyo con el escaneo, avísanos.
          </div>
        </div>
      </td></tr>`
      : `
      <tr><td style="padding:0 24px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${tarjetaDato("Asistencia", pct === null ? "—" : `${pct}%`, colorAsistencia(pct))}
            <td width="8"></td>
            ${tarjetaDato("Retardos", String(r.totalRetardos), r.totalRetardos ? AMBAR : GRIS)}
            <td width="8"></td>
            ${tarjetaDato("Faltas", String(r.totalFaltasSinJustificar), r.totalFaltasSinJustificar ? ROJO : GRIS)}
          </tr>
        </table>
        <div align="center">${lineaVariacion}</div>
      </td></tr>

      <tr><td style="padding:16px 24px 4px;">
        <div style="font:700 13px/1.4 Arial,sans-serif;color:${GRIS};padding-bottom:10px;">
          Asistencia día por día
        </div>
        ${graficaSemanal(r)}
      </td></tr>

      <tr><td style="padding:14px 24px 20px;">${bloqueCobertura(r)}</td></tr>

      ${bloqueAlertas(r)}`;

  const titulares = r.titulares.length
    ? r.titulares.map((t) => (r.titulares.length > 1 ? `${t.nombre} (${t.rol})` : t.nombre)).join(" · ")
    : "Sin titular asignado";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reporte semanal</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:20px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">

        <tr><td style="background:${AZUL_OSCURO};padding:20px 24px;">
          <div style="font:700 18px/1.3 Arial,sans-serif;color:#ffffff;">${r.grupo}</div>
          <div style="font:400 13px/1.4 Arial,sans-serif;color:#b9dcf0;padding-top:3px;">
            ${r.nivelAcademico} · ${r.totalAlumnos} alumnos · Semana del ${formatoFechaCorta(r.semanaInicio)} al ${formatoFechaCorta(r.semanaFin)}
          </div>
        </td></tr>

        <tr><td style="padding:18px 24px 10px;">
          <div style="font:400 14px/1.6 Arial,sans-serif;color:${GRIS};">
            Hola, ${titulares}. Este es el resumen de asistencia de tu grupo.
          </div>
        </td></tr>

        ${cuerpo}

        <tr><td style="background:${NEUTRO};padding:16px 24px;border-top:1px solid #eceef1;">
          <div style="font:400 11px/1.6 Arial,sans-serif;color:#9a99a3;">
            SAG · Sistema de Acceso Gardner. Correo automático, no hace falta responderlo.
            Si algún dato no cuadra con lo que ves en tu salón, avísale a coordinación
            para revisarlo.
          </div>
          <div style="font:600 11px/1.6 Arial,sans-serif;color:${AZUL};padding-top:4px;">
            Instituto Gardner · Formando líderes y mentes creativas
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
