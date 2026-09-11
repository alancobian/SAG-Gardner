"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import type { AlumnoBusqueda } from "@/lib/alumnos";
import type { ItemHistorial, RespuestaEscaneo } from "@/lib/escaneo";
import {
  registrarEscaneoAction,
  registrarEscaneoManualAction,
  buscarAlumnosParaEscaneoAction,
  obtenerHistorialRecienteAction,
} from "./actions";

const COOLDOWN_MS = 3500;

function Iniciales({ nombre, size = 18 }: { nombre: string; size?: number }) {
  const iniciales = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gardner-azul/15 font-bold text-gardner-azul-oscuro"
      style={{ width: size * 2, height: size * 2, fontSize: size * 0.85 }}
    >
      {iniciales || "?"}
    </div>
  );
}

// Las horas se guardan con el truco de "UTC falso": lib/escaneo.ts calcula la
// hora local de Mexico (UTC-6) y la almacena etiquetada como +00:00, de modo
// que los campos UTC del timestamp YA son la hora de pared correcta. Por eso
// se formatea con timeZone "UTC": sin eso el navegador volveria a restar 6
// horas y una entrada de las 07:00 a.m. se mostraria como 01:00 a.m.
function formatoHora(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  } catch {
    return "";
  }
}

const ESTILO_RESULTADO: Record<
  string,
  { color: string; bg: string; icono: string; titulo: (r: RespuestaEscaneo) => string }
> = {
  entrada: {
    color: "text-white",
    bg: "bg-[var(--color-estado-puntual)]",
    icono: "login",
    titulo: (r) => (r.estatus === "Retardo" ? "Entrada con retardo" : "Entrada registrada"),
  },
  salida: {
    color: "text-white",
    bg: "bg-gardner-azul",
    icono: "logout",
    titulo: () => "Salida registrada",
  },
  duplicado: {
    color: "text-white",
    bg: "bg-[var(--color-estado-puntual)]",
    icono: "verified",
    titulo: () => "Entrada ya registrada",
  },
  ya_completo: {
    color: "text-white",
    bg: "bg-gardner-gris",
    icono: "task_alt",
    titulo: () => "Ya completó entrada y salida hoy",
  },
  inactivo: {
    color: "text-white",
    bg: "bg-red-500",
    icono: "block",
    titulo: () => "Registro inactivo",
  },
  no_encontrado: {
    color: "text-white",
    bg: "bg-red-500",
    icono: "search_off",
    titulo: () => "Código no reconocido",
  },
  sesion_invalida: {
    color: "text-white",
    bg: "bg-red-500",
    icono: "lock",
    titulo: () => "Sesión inválida, vuelve a iniciar sesión",
  },
};

// Reloj grande del kiosco. Se actualiza cada 15 s (basta para minutos) y se
// monta solo en el cliente para que el HTML del servidor no llegue con una
// hora distinta a la del navegador.
function useReloj() {
  const [hora, setHora] = useState<string>("");
  useEffect(() => {
    const actualizar = () =>
      setHora(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
    actualizar();
    const id = setInterval(actualizar, 15000);
    return () => clearInterval(id);
  }, []);
  return hora;
}

export default function EscaneoClient() {
  const reloj = useReloj();
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [camaraError, setCamaraError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<RespuestaEscaneo | null>(null);
  const [historial, setHistorial] = useState<ItemHistorial[]>([]);

  const [buscarAbierto, setBuscarAbierto] = useState(false);
  const [termino, setTermino] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<AlumnoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const ultimoCodigoRef = useRef<{ codigo: string; ts: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargarHistorial = useCallback(async () => {
    const res = await obtenerHistorialRecienteAction();
    if (res.ok) setHistorial(res.data);
  }, []);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const procesarCodigo = useCallback(
    async (codigo: string) => {
      const ahora = Date.now();
      const ultimo = ultimoCodigoRef.current;
      if (ultimo && ultimo.codigo === codigo && ahora - ultimo.ts < COOLDOWN_MS) return;
      ultimoCodigoRef.current = { codigo, ts: ahora };

      setProcesando(true);
      const res = await registrarEscaneoAction(codigo);
      setProcesando(false);
      if (res.ok) {
        setResultado(res.data);
        if (res.data.resultado === "entrada" || res.data.resultado === "salida") {
          cargarHistorial();
        }
      } else {
        setResultado({ resultado: "sesion_invalida" });
      }
    },
    [cargarHistorial]
  );

  // Loop de lectura de QR: dibuja el frame actual del video en un canvas
  // oculto y le pasa los pixeles a jsQR en cada frame de animación.
  useEffect(() => {
    let activo = true;

    async function iniciar() {
      setCamaraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        });
        if (!activo) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        setCamaraError("No se pudo acceder a la cámara. Revisa los permisos del navegador o usa la búsqueda manual.");
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imagen = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const codigo = jsQR(imagen.data, imagen.width, imagen.height, { inversionAttempts: "dontInvert" });
          if (codigo && codigo.data) {
            procesarCodigo(codigo.data.trim());
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    iniciar();

    return () => {
      activo = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facing, procesarCodigo]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!termino.trim()) {
      setResultadosBusqueda([]);
      return;
    }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      const res = await buscarAlumnosParaEscaneoAction(termino);
      setResultadosBusqueda(res.ok ? res.data : []);
      setBuscando(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [termino]);

  async function marcarManual(alumno: AlumnoBusqueda) {
    setBuscarAbierto(false);
    setTermino("");
    setResultadosBusqueda([]);
    setProcesando(true);
    const res = await registrarEscaneoManualAction(alumno.id);
    setProcesando(false);
    if (res.ok) {
      setResultado(res.data);
      if (res.data.resultado === "entrada" || res.data.resultado === "salida") {
        cargarHistorial();
      }
    }
  }

  // El resultado se auto-cierra para no interrumpir el siguiente escaneo.
  useEffect(() => {
    if (!resultado) return;
    const t = setTimeout(() => setResultado(null), 4000);
    return () => clearTimeout(t);
  }, [resultado]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Escanea tu credencial</h1>
          <p className="mt-1.5 text-base text-white/70">Acerca el código al lector</p>
          <p className="mt-4 font-mono text-5xl font-bold tabular-nums text-white/95">{reloj}</p>
        </div>

        {/* Visor cuadrado: el QR tambien lo es, asi que un marco cuadrado deja
            acercar mas la credencial sin que se salga del encuadre. Lleva las
            esquinas y la linea de barrido del diseño para que se lea como un
            lector activo. */}
        <div className="relative aspect-square w-full max-w-[400px]">
          <div className="absolute inset-0 overflow-hidden rounded-3xl border-4 border-dashed border-white/30 bg-black/20">
            <video ref={videoRef} muted playsInline className="h-full w-full object-cover opacity-90" />
            {!procesando && (
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/80 shadow-[0_0_15px_rgba(255,255,255,0.8)] motion-safe:animate-[barrido_2.5s_ease-in-out_infinite]" />
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {/* Esquinas de encuadre, pegadas a las esquinas del marco */}
          <div className="pointer-events-none absolute left-4 top-4 h-9 w-9 rounded-tl-xl border-l-4 border-t-4 border-white/80" />
          <div className="pointer-events-none absolute right-4 top-4 h-9 w-9 rounded-tr-xl border-r-4 border-t-4 border-white/80" />
          <div className="pointer-events-none absolute bottom-4 left-4 h-9 w-9 rounded-bl-xl border-b-4 border-l-4 border-white/80" />
          <div className="pointer-events-none absolute bottom-4 right-4 h-9 w-9 rounded-br-xl border-b-4 border-r-4 border-white/80" />

          {camaraError && (
            <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/85 p-10 text-center">
              <p className="text-sm text-white/90">{camaraError}</p>
            </div>
          )}

          {procesando && (
            <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-gardner-azul-oscuro shadow-lg">
              Procesando…
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setBuscarAbierto(true)}
            className="flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-gardner-azul-oscuro shadow-lg transition hover:bg-white/90"
          >
            <span className="material-symbols-outlined text-[20px]">person_search</span>
            Buscar alumno
          </button>
          <button
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
            title="Cambiar entre cámara frontal y trasera"
          >
            <span className="material-symbols-outlined text-[20px]">cameraswitch</span>
            Cambiar cámara
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">

        {/* Histórico reciente */}
        <div className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gardner-gris">Últimos registrados</h2>
            <button
              onClick={cargarHistorial}
              className="flex items-center gap-1 rounded-full p-1.5 text-gardner-gris/55 transition hover:bg-gardner-azul/10 hover:text-gardner-azul"
              title="Actualizar"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>

          {historial.length === 0 && (
            <p className="py-6 text-center text-sm text-gardner-gris/60">Aún no hay registros hoy.</p>
          )}

          <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 460 }}>
            {historial.map((item) => (
              <div
                key={`${item.tipoPersona}-${item.id}`}
                className="flex items-center gap-3 rounded-xl border border-gardner-gris/10 p-2.5"
              >
                {item.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.foto} alt={item.nombre} className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <Iniciales nombre={item.nombre} size={14} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gardner-gris">{item.nombre}</p>
                  <p className="truncate text-xs text-gardner-gris/60">
                    {item.tipoPersona === "docente" ? "Docente" : "Alumno"}
                    {item.grupo ? ` · ${item.grupo}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      item.movimiento === "salida"
                        ? "bg-gardner-azul/10 text-gardner-azul-oscuro"
                        : item.estatus === "Retardo"
                          ? "bg-[var(--color-estado-retardo)]/15 text-[var(--color-estado-retardo)]"
                          : "bg-[var(--color-estado-puntual)]/15 text-[var(--color-estado-puntual)]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {item.movimiento === "salida" ? "logout" : "login"}
                    </span>
                    {item.movimiento === "salida" ? "Salida" : item.estatus}
                  </span>
                  <span className="text-[11px] text-gardner-gris/55">{formatoHora(item.hora)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel flotante: Buscar alumno */}
      {buscarAbierto && (
        <div
          className="fixed inset-0 z-30 flex items-start justify-center bg-black/30 pt-24"
          onClick={() => setBuscarAbierto(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-gardner-gris/10 p-4">
              <span className="material-symbols-outlined text-[20px] text-gardner-gris/55">search</span>
              <input
                autoFocus
                type="text"
                value={termino}
                onChange={(e) => setTermino(e.target.value)}
                placeholder="Buscar alumno por nombre…"
                className="flex-1 text-sm outline-none"
              />
              <button
                onClick={() => setBuscarAbierto(false)}
                className="rounded-full p-1 text-gardner-gris/55 hover:bg-gardner-gris/10"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {buscando && <p className="px-4 py-3 text-sm text-gardner-gris/65">Buscando…</p>}
              {!buscando && termino.trim() && resultadosBusqueda.length === 0 && (
                <p className="px-4 py-3 text-sm text-gardner-gris/65">Sin resultados</p>
              )}
              {!buscando &&
                resultadosBusqueda.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => marcarManual(a)}
                    className="flex w-full flex-col items-start px-4 py-2.5 text-left text-sm hover:bg-gardner-azul/10"
                  >
                    <span className="font-medium text-gardner-gris">{a.nombre}</span>
                    <span className="text-xs text-gardner-gris/65">{a.grupo}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de resultado del escaneo */}
      {resultado && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-6"
          onClick={() => setResultado(null)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl ${
              ESTILO_RESULTADO[resultado.resultado].bg
            } ${ESTILO_RESULTADO[resultado.resultado].color}`}
            onClick={(e) => e.stopPropagation()}
          >
            {resultado.persona?.foto ? (
              <div className="relative mx-auto h-24 w-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultado.persona.foto}
                  alt={resultado.persona.nombre}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-white/50"
                />
                <span className="material-symbols-outlined absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[20px] shadow">
                  {ESTILO_RESULTADO[resultado.resultado].icono}
                </span>
              </div>
            ) : (
              <span className="material-symbols-outlined text-[56px]">
                {ESTILO_RESULTADO[resultado.resultado].icono}
              </span>
            )}
            <p className="mt-2 text-lg font-bold">{ESTILO_RESULTADO[resultado.resultado].titulo(resultado)}</p>
            {resultado.persona && (
              <>
                <p className="mt-3 text-xl font-semibold">{resultado.persona.nombre}</p>
                {resultado.persona.grupo && <p className="text-sm opacity-90">{resultado.persona.grupo}</p>}
              </>
            )}
            <button
              onClick={() => setResultado(null)}
              className="mt-5 rounded-full bg-white/20 px-5 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/30"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
