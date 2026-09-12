// Cliente de Supabase para uso EXCLUSIVO en el servidor (Server Components,
// Route Handlers, Server Actions). Usa la service_role key, que nunca debe
// llegar al navegador -- nunca importar este archivo desde un componente
// marcado con "use client".
//
// Se usa un helper simple sobre PostgREST (no el SDK @supabase/supabase-js)
// para mantener el mismo patron de llamadas que ya se probo y quedo publicado
// en http-functions-supabase.js (Bloque 1), facilitando portar esa logica
// funcion por funcion sin reescribir la capa de datos desde cero.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertEnv() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno. " +
        "Revisa .env.local (desarrollo) o las variables del proyecto en Vercel (produccion)."
    );
  }
}

function headers(extra?: Record<string, string>) {
  assertEnv();
  return {
    apikey: SERVICE_ROLE_KEY as string,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export function eqP(field: string, value: string | number | boolean) {
  return `${field}=eq.${encodeURIComponent(String(value))}`;
}

export function ilikeP(field: string, term: string) {
  return `${field}=ilike.*${encodeURIComponent(term)}*`;
}

export function qs(parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join("&");
}

export async function supaGet<T = unknown>(table: string, query?: string): Promise<T[]> {
  assertEnv();
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`;
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Supabase GET ${table}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// Cuenta filas sin traerlas. PostgREST devuelve el total en la cabecera
// Content-Range ("0-0/1556") cuando se pide Prefer: count=exact, asi que se
// trae una sola fila y se lee el total de ahi -- util para conteos grandes
// (registros de un ciclo completo) donde descargar todo seria absurdo.
export async function supaCount(table: string, query?: string): Promise<number> {
  assertEnv();
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query ? `${query}&` : ""}select=*`;
  const res = await fetch(url, {
    headers: headers({ Prefer: "count=exact", Range: "0-0" }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Supabase COUNT ${table}: ${res.status} ${await res.text()}`);
  }
  const rango = res.headers.get("content-range") || "";
  const total = Number(rango.split("/")[1]);
  return Number.isFinite(total) ? total : 0;
}

export async function supaInsert<T = unknown>(table: string, row: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    throw new Error(`Supabase INSERT ${table}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function supaUpdate<T = unknown>(
  table: string,
  filterQuery: string,
  patch: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filterQuery}`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Supabase UPDATE ${table}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data[0];
}

/**
 * Actualiza de golpe todas las filas que cumplan el filtro y devuelve cuantas
 * fueron. A diferencia de supaUpdate, que esta pensado para una fila concreta,
 * aqui se hace UNA sola llamada sin importar cuantos registros toque: el bucle
 * de "una llamada por fila" se cae por timeout en cuanto son un par de cientos.
 *
 * Se pide return=minimal para no traer de vuelta el contenido de las filas, y
 * el conteo llega en la cabecera Content-Range ("0-221/222").
 */
export async function supaUpdateMany(
  table: string,
  filterQuery: string,
  patch: Record<string, unknown>
): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filterQuery}`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=minimal,count=exact" }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Supabase UPDATE ${table}: ${res.status} ${await res.text()}`);
  }
  const rango = res.headers.get("content-range");
  const total = rango ? Number(rango.split("/")[1]) : NaN;
  return Number.isFinite(total) ? total : 0;
}

export async function supaDelete(table: string, filterQuery: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filterQuery}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) {
    throw new Error(`Supabase DELETE ${table}: ${res.status} ${await res.text()}`);
  }
}
