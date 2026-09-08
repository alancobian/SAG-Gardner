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

export async function supaDelete(table: string, filterQuery: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filterQuery}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) {
    throw new Error(`Supabase DELETE ${table}: ${res.status} ${await res.text()}`);
  }
}
