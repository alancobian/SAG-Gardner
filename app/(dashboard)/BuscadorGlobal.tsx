"use client";

// Buscador de la barra superior. Antes era un campo deshabilitado que decía
// "próximamente"; ahora busca alumnos y docentes en todo el sistema y lleva
// directo a la ficha de quien se elija.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ResultadoBusqueda } from "@/lib/busqueda";
import { buscarGlobalAction } from "./actions";

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function BuscadorGlobal() {
  const router = useRouter();
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Búsqueda con retraso, para no consultar en cada tecla.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (termino.trim().length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      const res = await buscarGlobalAction(termino);
      setResultados(res.ok ? res.data : []);
      setBuscando(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [termino]);

  // Cerrar al hacer clic fuera, y atajo ⌘K / Ctrl+K para enfocar desde
  // cualquier pantalla sin levantar la mano del teclado.
  useEffect(() => {
    function alClicFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false);
    }
    function alTeclado(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setAbierto(true);
      }
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", alClicFuera);
    document.addEventListener("keydown", alTeclado);
    return () => {
      document.removeEventListener("mousedown", alClicFuera);
      document.removeEventListener("keydown", alTeclado);
    };
  }, []);

  function abrir(r: ResultadoBusqueda) {
    setAbierto(false);
    setTermino("");
    setResultados([]);
    router.push(r.href);
  }

  const mostrarPanel = abierto && termino.trim().length >= 2;

  return (
    <div ref={contenedorRef} className="relative w-72">
      <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-gardner-gris/60">
        search
      </span>
      <input
        ref={inputRef}
        type="text"
        value={termino}
        onChange={(e) => setTermino(e.target.value)}
        onFocus={() => setAbierto(true)}
        placeholder="Buscar alumno o docente…"
        className="w-full rounded-lg border border-transparent bg-gardner-neutro py-2 pl-10 pr-12 text-sm text-gardner-gris outline-none transition focus:border-gardner-azul focus:bg-white focus:ring-2 focus:ring-gardner-azul/20 placeholder:text-gardner-gris/50"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-gardner-gris/20 px-1.5 py-0.5 text-[10px] font-semibold text-gardner-gris/45 lg:block">
        ⌘K
      </kbd>

      {mostrarPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-gardner-gris/15 bg-white shadow-xl">
          {buscando && <p className="px-4 py-3 text-sm text-gardner-gris/65">Buscando…</p>}

          {!buscando && resultados.length === 0 && (
            <p className="px-4 py-3 text-sm text-gardner-gris/65">Sin resultados para “{termino.trim()}”</p>
          )}

          {!buscando &&
            resultados.map((r) => (
              <button
                key={`${r.tipo}-${r.id}`}
                onClick={() => abrir(r)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-gardner-azul/10"
              >
                {r.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.foto} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gardner-azul/10 text-[11px] font-bold text-gardner-azul-oscuro">
                    {iniciales(r.nombre)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gardner-gris">{r.nombre}</span>
                  <span className="block truncate text-xs text-gardner-gris/60">{r.detalle}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    r.tipo === "alumno"
                      ? "bg-gardner-azul/10 text-gardner-azul-oscuro"
                      : "bg-gardner-gris/10 text-gardner-gris/70"
                  }`}
                >
                  {r.tipo}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
