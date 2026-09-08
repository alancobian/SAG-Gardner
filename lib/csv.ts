// Parser de CSV simple (sin dependencias externas) para las pantallas de
// carga masiva. Soporta comillas dobles, comas dentro de campos citados y
// saltos de línea CRLF/LF. Pensado para archivos exportados desde Excel/
// Google Sheets, no para CSV arbitrariamente complejo.

export function parseCSV(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let dentroDeComillas = false;
  const limpio = texto.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (dentroDeComillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeComillas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroDeComillas = true;
    } else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((c) => c.trim().length > 0));
}

function normalizarEncabezado(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Convierte filas de CSV (con encabezado) en objetos, usando un mapa de
 * alias normalizados -> nombre de campo canónico. Encabezados no reconocidos
 * se ignoran silenciosamente.
 */
export function filasComoObjetos<T extends Record<string, string>>(
  filasCSV: string[][],
  aliases: Record<string, keyof T>
): T[] {
  if (filasCSV.length === 0) return [];
  const [encabezado, ...resto] = filasCSV;
  const columnas = encabezado.map((h) => aliases[normalizarEncabezado(h)] || null);

  return resto.map((fila) => {
    const obj = {} as T;
    columnas.forEach((campo, i) => {
      if (campo) {
        (obj as Record<string, string>)[campo as string] = (fila[i] || "").trim();
      }
    });
    return obj;
  });
}

export function generarPlantillaCSV(encabezados: string[], filaEjemplo: string[]): string {
  const linea = (arr: string[]) => arr.map((v) => (v.includes(",") ? `"${v}"` : v)).join(",");
  return `${linea(encabezados)}\n${linea(filaEjemplo)}\n`;
}
