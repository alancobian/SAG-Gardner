"use client";

import { useState } from "react";
import CalendarioClient from "./calendario/CalendarioClient";
import UsuariosClient from "./usuarios/UsuariosClient";
import CargarAlumnosClient from "./cargar-alumnos/CargarAlumnosClient";
import CargarDocentesClient from "./cargar-docentes/CargarDocentesClient";
import HorarioDocentesClient from "./horario-docentes/HorarioDocentesClient";
import HorarioAdministrativoClient from "./horario-administrativo/HorarioAdministrativoClient";
import ArchivoClient from "./ArchivoClient";
import GruposAdminClient from "./grupos/GruposAdminClient";
import CargarAdministrativosClient from "./cargar-administrativos/CargarAdministrativosClient";

const TABS = [
  { clave: "calendario", etiqueta: "Calendario escolar", icono: "calendar_month" },
  { clave: "grupos", etiqueta: "Grupos", icono: "groups" },
  { clave: "horario-docentes", etiqueta: "Horario de docentes", icono: "schedule" },
  { clave: "horario-administrativo", etiqueta: "Horario administrativo", icono: "work_history" },
  { clave: "usuarios", etiqueta: "Usuarios y roles", icono: "manage_accounts" },
  { clave: "cargar-alumnos", etiqueta: "Cargar alumnos", icono: "person_add" },
  { clave: "cargar-docentes", etiqueta: "Cargar docentes", icono: "badge" },
  { clave: "cargar-administrativos", etiqueta: "Cargar administrativos", icono: "work" },
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
        {tab === "grupos" && <GruposAdminClient />}
        {tab === "horario-docentes" && <HorarioDocentesClient />}
        {tab === "horario-administrativo" && <HorarioAdministrativoClient />}
        {tab === "usuarios" && <UsuariosClient miPropioId={miPropioId} />}
        {tab === "cargar-alumnos" && <CargarAlumnosClient />}
        {tab === "cargar-docentes" && <CargarDocentesClient />}
        {tab === "cargar-administrativos" && <CargarAdministrativosClient />}
        {tab === "archivo" && <ArchivoClient />}
      </div>
    </div>
  );
}
