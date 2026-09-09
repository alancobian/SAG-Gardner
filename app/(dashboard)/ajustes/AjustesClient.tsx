"use client";

import { useState } from "react";
import CalendarioClient from "./calendario/CalendarioClient";
import UsuariosClient from "./usuarios/UsuariosClient";
import CargarAlumnosClient from "./cargar-alumnos/CargarAlumnosClient";
import CargarDocentesClient from "./cargar-docentes/CargarDocentesClient";
import HorarioDocentesClient from "./horario-docentes/HorarioDocentesClient";

const TABS = [
  { clave: "calendario", etiqueta: "Calendario escolar", icono: "calendar_month" },
  { clave: "horario-docentes", etiqueta: "Horario de docentes", icono: "schedule" },
  { clave: "usuarios", etiqueta: "Usuarios y roles", icono: "manage_accounts" },
  { clave: "cargar-alumnos", etiqueta: "Cargar alumnos", icono: "person_add" },
  { clave: "cargar-docentes", etiqueta: "Cargar docentes", icono: "badge" },
  { clave: "archivo", etiqueta: "Archivo", icono: "archive" },
] as const;

type Tab = (typeof TABS)[number]["clave"];

export default function AjustesClient({ miPropioId }: { miPropioId: string }) {
  const [tab, setTab] = useState<Tab>("calendario");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gardner-gris">Ajustes</h1>
        <p className="text-sm font-medium text-gardner-gris/75">Configuración del ciclo escolar, usuarios y carga de datos.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.clave}
            onClick={() => setTab(t.clave)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              tab === t.clave
                ? "bg-gardner-azul text-white shadow-sm"
                : "text-gardner-gris/80 hover:bg-gardner-azul/10 hover:text-gardner-azul-oscuro"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icono}</span>
            {t.etiqueta}
          </button>
        ))}
      </div>

      <div>
        {tab === "calendario" && <CalendarioClient />}
        {tab === "horario-docentes" && <HorarioDocentesClient />}
        {tab === "usuarios" && <UsuariosClient miPropioId={miPropioId} />}
        {tab === "cargar-alumnos" && <CargarAlumnosClient />}
        {tab === "cargar-docentes" && <CargarDocentesClient />}
        {tab === "archivo" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-[40px] text-gardner-gris/45">archive</span>
            <p className="text-sm font-medium text-gardner-gris">Archivo</p>
            <p className="max-w-sm text-xs text-gardner-gris/65">
              Esta sección todavía no está definida. Aquí podrán consultarse en el futuro los alumnos y docentes dados de
              baja u otros documentos históricos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
