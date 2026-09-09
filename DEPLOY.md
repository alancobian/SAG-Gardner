# Guía de publicación — Panel SAG (Next.js) en Vercel

El proyecto ya está listo: compila sin errores, tiene `.gitignore` correcto (nunca sube `.env.local`) y ya inicialicé el repositorio Git local con el primer commit.

## 1. Subir el código a GitHub

En tu Mac, abre Terminal y entra a esta carpeta:

```bash
cd "/Users/alancobian/Documents/Diseños/CoWork/Instituto Gardner - CoWork/3. Plataforma SAG/Panel Next.js (Bloque 2)/sag-gardner"
```

1. Crea un repositorio nuevo y **vacío** en GitHub (sin README, sin .gitignore) — por ejemplo `sag-gardner`. Puede ser privado.
2. Conéctalo y sube el código:

```bash
git remote add origin https://github.com/TU-USUARIO/sag-gardner.git
git push -u origin main
```

## 2. Importar el proyecto en Vercel

1. En vercel.com → **Add New… → Project**.
2. Selecciona el repo `sag-gardner` que acabas de subir.
3. Vercel detecta Next.js automáticamente — no toques el build command ni el output.
4. **Antes de darle "Deploy"**, agrega las variables de entorno (siguiente paso).

## 3. Variables de entorno

En la pantalla de configuración del proyecto (o después, en **Settings → Environment Variables**), agrega estas 3, copiando los valores exactos de tu archivo `.env.local` (está en esta misma carpeta, en tu computadora — nunca lo subas a GitHub):

| Nombre | De dónde sale |
|---|---|
| `SUPABASE_URL` | Supabase → tu proyecto GCore → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Mismo lugar — es la clave `service_role` (secreta) |
| `SESSION_SECRET` | La que ya está generada en tu `.env.local` |

Márcalas para los 3 entornos (Production, Preview, Development) y dale **Deploy**.

## 4. Dominio institucional (sag.institutogardner.edu.mx)

1. En el proyecto de Vercel → **Settings → Domains** → agrega `sag.institutogardner.edu.mx`.
2. Vercel te va a mostrar un registro DNS para agregar (normalmente un **CNAME** apuntando a `cname.vercel-dns.com`).
3. Entra al panel donde administras el DNS del dominio `institutogardner.edu.mx` (probablemente Wix, ya que ahí vive el sitio público actual) y agrega ese registro CNAME con el nombre `sag`.
4. La propagación puede tardar desde minutos hasta un par de horas. Vercel marca el dominio como verificado automáticamente cuando detecta el registro.

## 5. Verificación final

Una vez publicado:
- Entra a `https://sag.institutogardner.edu.mx/login` y confirma que carga el login.
- Inicia sesión con tu cuenta y revisa Asistencia, Grupos y Alumnos, Docentes, Justificantes y Ajustes.
- Prueba en un celular que el sidebar responsivo funcione bien.

---

**Notas:**
- Cada `git push` a `main` después de esto dispara un deploy automático en Vercel — así se actualizará el panel en producción cada vez que yo te entregue cambios y tú los subas.
- El middleware de sesión (`middleware.ts`) ya protege todas las rutas excepto `/login`, así que no hay pantallas expuestas sin autenticación.
