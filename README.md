# SAG · Panel propio (Bloque 2 de GCore)

Panel administrativo del Sistema de Acceso Gardner, construido en Next.js
sobre el mismo Supabase compartido de GCore (el que ya usa el backend
migrado en el Bloque 1). Reemplaza, sección por sección, a los Custom
Embeds de Wix.

## Qué incluye esta primera entrega

- **Login** (correo + PIN) — mismo contrato que `post_login` del backend de
  Wix/Supabase: valida contra la tabla `usuarios_sistema`. La sesión ahora
  se guarda en una cookie `httpOnly` firmada (antes vivía en
  `sessionStorage`/`localStorage` del navegador, sin verificación real de
  servidor).
- **Asistencia** (pantalla principal) — mismo cálculo que `get_reporteDiario`:
  tarjetas de Puntuales/Retardos/Ausentes/Total y tabla por grupo, para
  cualquier fecha.
- El resto de secciones (Grupos y Alumnos, Docentes, Justificantes, Ajustes)
  aparecen en el menú marcadas "Próx." — se construyen en las siguientes
  rondas, una por una, sobre esta misma base.

## Cómo correrlo en tu computadora

1. Instala las dependencias (solo la primera vez):
   ```
   npm install
   ```
2. Copia `.env.local.example` a `.env.local` y llena los 3 valores:
   - `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: los encuentras en
     supabase.com → tu proyecto → Project Settings → API.
   - `SESSION_SECRET`: genera uno nuevo con
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
     y pégalo tal cual.
3. Arranca el servidor de desarrollo:
   ```
   npm run dev
   ```
4. Abre http://localhost:3000 — te llevará al login. Entra con tu correo y
   PIN de siempre.

## Publicarlo en línea (cuando esté listo)

Este proyecto sigue el mismo patrón que ya usa el CRM de leads
(`gardner-crm.vercel.app`): Next.js + Vercel.

1. Sube este proyecto a un repositorio (o usa `vercel` directo desde esta
   carpeta).
2. En Vercel, crea el proyecto y agrega las mismas 3 variables de entorno
   del paso anterior (Project Settings → Environment Variables).
3. Una vez publicado, se puede apuntar el subdominio
   `sag.institutogardner.edu.mx` a Vercel (agregar un registro CNAME desde
   el DNS de Wix) — sin mover el dominio principal.

## Notas técnicas (para la siguiente ronda de desarrollo)

- La `service_role key` de Supabase solo se usa del lado del servidor
  (`lib/supabaseAdmin.ts`) — nunca se expone al navegador. Todas las
  páginas que necesitan datos son Server Components o Route Handlers.
- El login NO usa Supabase Auth (la tabla `usuarios_sistema` con PIN es un
  esquema propio, heredado de la versión Wix) — la sesión es un JWT propio
  en cookie httpOnly, ver `lib/session.ts` y `lib/auth.ts`.
- La tipografía del panel es Calibri (auto-hospedada en `public/fonts/`),
  no Inter — así se confirmó explícitamente para mantener consistencia con
  la identidad visual oficial de Gardner.
- `lib/reportes.ts` es el puerto directo de `get_reporteDiario` — al
  construir "Grupos y Alumnos", "Docentes", etc., seguir el mismo patrón:
  una función en `lib/` que replica la función equivalente de
  `http-functions-supabase.js`, llamada directo desde el Server Component
  de la página (sin pasar por un endpoint HTTP intermedio, porque ya no
  hace falta — antes existía esa capa por la limitación de Wix Custom
  Embeds, que aquí no aplica).
