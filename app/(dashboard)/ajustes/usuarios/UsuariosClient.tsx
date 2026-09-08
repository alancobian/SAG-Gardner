"use client";

import { useEffect, useState, useTransition } from "react";
import type { Usuario } from "@/lib/usuarios";
import { listarUsuariosAction, crearUsuarioAction, actualizarUsuarioAction } from "./actions";

const ROLES = ["Administrador", "Staff", "Portería"];

function Iniciales({ nombre }: { nombre: string }) {
  const iniciales = nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gardner-azul text-xs font-bold text-white">
      {iniciales}
    </div>
  );
}

function FilaUsuario({
  usuario,
  esMiPropiaCuenta,
  onCambio,
}: {
  usuario: Usuario;
  esMiPropiaCuenta: boolean;
  onCambio: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(usuario.nombre);
  const [correo, setCorreo] = useState(usuario.correo);
  const [rol, setRol] = useState(usuario.rol);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    startTransition(async () => {
      const res = await actualizarUsuarioAction(usuario.id, {
        nombre,
        correo,
        rol,
        ...(pin.trim() ? { pin: pin.trim() } : {}),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPin("");
      setEditando(false);
      onCambio();
    });
  }

  function toggleActivo() {
    if (esMiPropiaCuenta && usuario.activo) {
      setError("No puedes desactivar tu propia cuenta.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await actualizarUsuarioAction(usuario.id, { activo: !usuario.activo });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onCambio();
    });
  }

  if (editando) {
    return (
      <div className="rounded-xl border border-gardner-azul/20 bg-white p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre"
            className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
          />
          <input
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="Correo"
            className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
          />
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            disabled={esMiPropiaCuenta}
            className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm disabled:bg-gardner-gris/10"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Nuevo PIN (dejar vacío para no cambiar)"
            className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
          />
        </div>
        {esMiPropiaCuenta && (
          <p className="mt-2 text-xs text-gardner-gris/65">No puedes cambiar tu propio rol desde aquí.</p>
        )}
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            onClick={guardar}
            disabled={isPending}
            className="rounded-lg bg-gardner-azul px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Guardar
          </button>
          <button
            onClick={() => {
              setEditando(false);
              setNombre(usuario.nombre);
              setCorreo(usuario.correo);
              setRol(usuario.rol);
              setPin("");
              setError(null);
            }}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gardner-gris/75 hover:bg-gardner-gris/10"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
      <Iniciales nombre={usuario.nombre} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gardner-gris">
          {usuario.nombre} {esMiPropiaCuenta && <span className="text-xs text-gardner-gris/55">(tú)</span>}
        </p>
        <p className="text-xs text-gardner-gris/65">
          {usuario.correo} · {usuario.rol}
        </p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          usuario.activo ? "bg-estado-puntual/10 text-estado-puntual" : "bg-gardner-gris/10 text-gardner-gris/65"
        }`}
      >
        {usuario.activo ? "Activo" : "Inactivo"}
      </span>
      <button onClick={() => setEditando(true)} className="text-xs font-medium text-gardner-azul hover:underline">
        Editar
      </button>
      <button
        onClick={toggleActivo}
        disabled={isPending}
        className="text-xs font-medium text-gardner-gris/75 hover:underline disabled:opacity-50"
      >
        {usuario.activo ? "Desactivar" : "Reactivar"}
      </button>
    </div>
  );
}

function FormularioNuevoUsuario({ onCreado }: { onCreado: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [pin, setPin] = useState("");
  const [rol, setRol] = useState("Staff");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await crearUsuarioAction({ nombre, correo, pin, rol });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNombre("");
      setCorreo("");
      setPin("");
      setRol("Staff");
      setAbierto(false);
      onCreado();
    });
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="self-start rounded-lg bg-gardner-azul px-4 py-2 text-sm font-semibold text-white hover:bg-gardner-azul-oscuro"
      >
        + Nueva cuenta
      </button>
    );
  }

  return (
    <form onSubmit={crear} className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre completo"
          className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
        />
        <input
          required
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="Correo"
          className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
        />
        <input
          required
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN de acceso"
          className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
        />
        <select
          value={rol}
          onChange={(e) => setRol(e.target.value)}
          className="rounded-lg border border-gardner-gris/25 px-3 py-2 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-gardner-azul px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Crear cuenta
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gardner-gris/75 hover:bg-gardner-gris/10"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function UsuariosClient({ miPropioId }: { miPropioId: string }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);

  function cargar() {
    setCargando(true);
    listarUsuariosAction().then((res) => {
      setUsuarios(res.ok ? res.data : []);
      setCargando(false);
    });
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gardner-gris">Usuarios</h1>
        <p className="text-sm text-gardner-gris/75">Cuentas con acceso al panel de SAG y sus roles.</p>
      </div>

      <FormularioNuevoUsuario onCreado={cargar} />

      {cargando && <p className="text-sm text-gardner-gris/65">Cargando…</p>}
      <div className="flex flex-col gap-2">
        {usuarios.map((u) => (
          <FilaUsuario key={u.id} usuario={u} esMiPropiaCuenta={u.id === miPropioId} onCambio={cargar} />
        ))}
      </div>
    </div>
  );
}
