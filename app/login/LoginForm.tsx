"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [pin, setPin] = useState("");
  const [mostrarPin, setMostrarPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, pin }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "No se pudo iniciar sesión");
        setCargando(false);
        return;
      }
      router.push("/asistencia");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
      setCargando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="correo" className="text-xs font-semibold text-gardner-gris/70">
          Correo electrónico
        </label>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-gardner-gris/40">
            mail
          </span>
          <input
            id="correo"
            type="email"
            required
            autoComplete="username"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="ejemplo@institutogardner.edu.mx"
            className="w-full rounded-lg border border-gardner-gris/20 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label htmlFor="pin" className="text-xs font-semibold text-gardner-gris/70">
            PIN
          </label>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-gardner-gris/40">
            lock
          </span>
          <input
            id="pin"
            type={mostrarPin ? "text" : "password"}
            inputMode="numeric"
            required
            autoComplete="current-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••••"
            className="w-full rounded-lg border border-gardner-gris/20 py-3 pl-10 pr-10 text-sm tracking-widest outline-none transition focus:border-gardner-azul focus:ring-2 focus:ring-gardner-azul/20"
          />
          <button
            type="button"
            aria-label="Mostrar u ocultar PIN"
            onClick={() => setMostrarPin((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gardner-gris/40 transition hover:text-gardner-gris"
          >
            <span className="material-symbols-outlined text-[20px]">
              {mostrarPin ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={cargando}
        className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-gardner-azul px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gardner-azul-oscuro hover:shadow-md active:scale-[0.98] disabled:opacity-60"
      >
        <span>{cargando ? "Entrando…" : "Iniciar sesión"}</span>
        {!cargando && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
      </button>
    </form>
  );
}
