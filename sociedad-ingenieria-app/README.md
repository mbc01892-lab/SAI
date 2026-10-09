# S.A. Ingeniería (app instalable)

App web instalable (PWA) de la sociedad: asistencia con QR dinámico, solicitudes y evidencia, comités, calendario, retenciones y planificador editorial. Las reglas de negocio son las del proyecto original (`app/domain.ts`); lo que cambió es la infraestructura.

## Qué cambió respecto al proyecto de Sites
- Inicio de sesión de ChatGPT/Sites → **correo y contraseña propios** (`/api/auth`, PBKDF2-SHA256, sesión de 30 días en cookie HttpOnly, 5 intentos por 15 min).
- Cloudflare D1 y R2 → **Netlify Blobs** en Netlify (datos y evidencias), o **archivos en `DATA_DIR`** si corre en un servidor propio o en tu computadora. Se elige solo (`app/storage.ts`).
- Se añadió manifest, service worker (solo cachea el cascarón; nunca `/api`), íconos y pantalla sin conexión.

## Primer acceso
1. Abre la app: la primera cuenta que se crea es la **jefatura**. (Opcional: define `OWNER_EMAIL` para que solo ese correo pueda crearla.)
2. En Administración crea la contraseña del panel del jefe (12+ caracteres).
3. Agrega los correos de los integrantes. Cada quien entra a la app, elige "¿Primera vez? Crea tu cuenta" y usa **ese mismo correo**. Un correo no dado de alta no puede registrarse.

## Correr en tu computadora
```
pnpm install
pnpm build
pnpm start          # http://localhost:3000   (requiere Node 22.13+)
pnpm test           # reglas de negocio
```
Variables: `OWNER_EMAIL` (opcional, solo ese correo puede crear la primera cuenta), `APP_ORIGIN` (opcional), `DATA_DIR` (solo fuera de Netlify, por defecto ./data).

## Publicar en Netlify (plan gratis)
1. Sube esta carpeta a un repositorio de GitHub.
2. En netlify.com: "Add new site" → "Import an existing project" → elige el repositorio. Netlify detecta Next.js y usa `netlify.toml`.
3. Antes de desplegar, en "Site configuration" → "Environment variables" agrega `OWNER_EMAIL` con tu correo.
4. Despliega. Netlify te da un link `https://algo.netlify.app` (puedes cambiar el nombre en "Domain management").
5. Abre el link y crea tu cuenta de jefa de inmediato.
6. iPhone: abre el link en Safari → Compartir → "Agregar a pantalla de inicio". Android: Chrome → "Instalar app".

Los datos viven en Netlify Blobs: **no los borres** ni borres el sitio. Un servidor propio también sirve (hay `Dockerfile`; monta un disco en `/data`).

## Pendientes conocidos
- No hay recuperación de contraseña de cuenta ni del panel del jefe (igual que el original).
- Probado con el simulador local de Netlify Blobs y con archivos; no se ha desplegado en un Netlify real.
