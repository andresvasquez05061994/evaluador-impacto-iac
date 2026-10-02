# Evaluador de Impacto — IAC

Simulador de ROI y descubrimiento de automatización para procesos empresariales.  
Incluye diagnóstico con IA (Mistral), módulo de descubrimiento, portafolio y generación de informe Word.

Si acaba de fusionar el cierre de acceso al portafolio, siga **en este orden** la sección [Después de fusionar](#después-de-fusionar). La migración y el deploy van juntos: si solo despliega el frontend, guardar escenarios falla; si solo aplica la migración, la versión que está hoy en producción deja de leer y escribir en Supabase hasta que salga este deploy.

## Stack

- React 18 + Vite 5
- Recharts (gráficas)
- Mistral API vía función serverless en Vercel (key solo en servidor)

---

## Desarrollo local

```bash
npm install
copy .env.example .env
# Editar .env → MISTRAL_API_KEY=tu_key
npm run dev
```

Abre **http://localhost:5173**. Las peticiones a IA usan `/api/mistral/v1/chat/completions` (proxy de Vite en dev, serverless en Vercel).

### Probar como en Vercel (opcional)

```bash
npm i -g vercel
vercel login
vercel dev
```

`vercel dev` levanta frontend + función serverless igual que producción.

---

## Despliegue en Vercel

### Requisitos

- Cuenta en [vercel.com](https://vercel.com)
- Repositorio Git (GitHub, GitLab o Bitbucket) **o** CLI de Vercel
- API key de [Mistral AI](https://console.mistral.ai/)

### Opción A — Importar desde Git (recomendado)

1. Sube el código a GitHub (rama `main`).
2. Ve a [vercel.com/new](https://vercel.com/new) e importa el repositorio.
3. **Root Directory:** deja `.` si el repo es esta carpeta; si el repo tiene carpeta padre, indica `evaluador-impacto-iac`.
4. Vercel detecta **Vite** automáticamente (`vercel.json` ya define build y output).
5. En **Environment Variables**, agrega:

| Variable | Valor | Entornos |
|---|---|---|
| `MISTRAL_API_KEY` | key de Mistral. **Sin** prefijo `VITE_` | Production, Preview, Development |
| `ANTHROPIC_API_KEY` | key de Anthropic, si se usa esa ruta. **Sin** prefijo `VITE_` | Production, Preview, Development |
| `VITE_SUPABASE_URL` | URL del proyecto (`https://<ref>.supabase.co`, sin `/rest/v1`) | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | clave **anon / public** de Supabase | Production, Preview, Development |
| `ALLOWED_EMAILS` | correos que pueden entrar, separados por coma | Production, Preview, Development |
| `ALLOWED_EMAIL_DOMAINS` | dominios autorizados, separados por coma (opcional) | Production, Preview, Development |

No cree `VITE_MISTRAL_API_KEY`, `VITE_ANTHROPIC_API_KEY` ni ninguna variable `VITE_` con la **service role**. Esas claves quedarían dentro del JavaScript público. La service role no la usa esta aplicación: el navegador entra con la sesión del usuario y la base aplica las políticas.

6. Haz clic en **Deploy**.

Cada push a `main` desplegará automáticamente si conectaste el repo.

### Opción B — CLI

Desde la raíz del proyecto:

```bash
npm i -g vercel
vercel login
vercel link          # primera vez: vincular proyecto
vercel               # preview
vercel --prod        # producción
```

Configura `MISTRAL_API_KEY` en el dashboard o durante `vercel link`:

```bash
vercel env add MISTRAL_API_KEY production
```

### Verificación post-deploy

1. Abre la URL de producción.
2. Elige **Descubrir qué automatizar** o **Evaluar impacto**.
3. Completa un flujo con **Analizar con IA** / **Obtener sugerencias**.
4. Si falla la IA, revisa **Vercel → Project → Logs** y confirma que `MISTRAL_API_KEY` está en el entorno correcto.

> Sin `MISTRAL_API_KEY`, el **Descubrimiento** usa fallback heurístico; el **Diagnóstico con IA** mostrará error.

### Arquitectura en Vercel

```
Browser  →  /api/mistral/v1/chat/completions  →  api/mistral/v1/chat/completions.js
                                                    ↓
                                               Mistral API (key server-side)

Browser  →  /* (SPA)  →  dist/index.html + assets estáticos
```

Las keys de IA **no** van al bundle del cliente: solo `MISTRAL_API_KEY` y `ANTHROPIC_API_KEY`, sin prefijo `VITE_`. La clave anon de Supabase sí viaja al navegador; no da acceso a los escenarios. Hace falta una sesión, la política de la migración `002` y un correo de la lista (`003` y `ALLOWED_EMAILS` / `ALLOWED_EMAIL_DOMAINS`). Esas dos variables de la lista sí llegan al JavaScript para poder rechazar la sesión en pantalla; la base aplica la misma regla y es la que impide leer o escribir.

---

## Después de fusionar

Haga estos pasos en orden, en el proyecto Supabase que ya está en producción y en Vercel. **No vuelva a ejecutar** `supabase/migrations/001_projects.sql` después del paso 6: ese script recrea las políticas abiertas.

Nada de esto borra escenarios. `002` agrega `owner_id` vacío. `003` solo crea la lista de correos y una política adicional. Ninguna de las dos hace `UPDATE`, `DELETE`, `TRUNCATE` ni `DROP` sobre `projects`.

### 1. Deje el alta pública cerrada y cree el administrador

En Supabase → **Authentication → Sign In / Providers → Email**:

1. El proveedor Email queda habilitado.
2. Desactive **Allow new users to sign up** (el alta solo se hace desde el dashboard).
3. Puede dejar activada la confirmación de correo: un usuario creado con **Add user** en el dashboard ya queda confirmado.

En **Authentication → Users → Add user**, cree el usuario administrador con su correo y una contraseña. Anote el correo: lo usará en los pasos 5, 6 y 7. El ingreso con correo y contraseña sigue disponible para esa cuenta.

El alta pública de correo puede quedar cerrada. Google igual puede crear un usuario la primera vez que alguien entra con esa cuenta: por eso el paso 6 niega el portafolio a quien no esté en la lista, aunque Supabase le haya abierto sesión.

### 2. Cliente OAuth en Google Cloud Console

1. Entre a [Google Cloud Console](https://console.cloud.google.com/) → **APIs y servicios → Pantalla de consentimiento de OAuth**.
2. Si la organización usa Google Workspace, elija **Interno**. Si no, **Externo**. En modo **Prueba**, agregue como usuario de prueba cada correo que vaya a entrar (incluido el administrador).
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web.**
4. En **URI de redireccionamiento autorizados** ponga exactamente la callback de Supabase, con el ref de su proyecto:

```
https://<project-ref>.supabase.co/auth/v1/callback
```

No ponga ahí la URL de Vercel. Esa callback es la de Supabase, no la de la app.
5. En **Orígenes de JavaScript autorizados** puede agregar `https://evaluador-impacto-iac.vercel.app` y `http://localhost:5173`.
6. Copie el **ID de cliente** y el **secreto**. El secreto solo va en Supabase, nunca en el repositorio ni en una variable `VITE_`.

### 3. Google y URLs de retorno en Supabase

1. **Authentication → Sign In / Providers → Google.** Active el proveedor y pegue el ID de cliente y el secreto del paso 2.
2. **Authentication → URL Configuration.**
   - **Site URL:** `https://evaluador-impacto-iac.vercel.app` (o el dominio real del deploy).
   - **Redirect URLs**, una por línea:

```
https://evaluador-impacto-iac.vercel.app/**
http://localhost:5173/**
http://127.0.0.1:5173/**
```

La app vuelve a `{origen}/` después de Google (`signInWithOAuth`, `redirectTo`). Esas URLs tienen que estar permitidas o Supabase rechaza el retorno. El intercambio del `code` lo hace el cliente al cargar (PKCE, `detectSessionInUrl`).

### 4. Variables en Vercel (antes del deploy)

En el proyecto de Vercel, Production, Preview y Development:

| Variable | Qué poner |
|---|---|
| `MISTRAL_API_KEY` | la key de Mistral, sin prefijo `VITE_` |
| `ANTHROPIC_API_KEY` | la key de Anthropic, si la usa |
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | la clave anon / public |
| `ALLOWED_EMAILS` | correos autorizados, separados por coma. Incluya el del administrador |
| `ALLOWED_EMAIL_DOMAINS` | dominios autorizados, separados por coma. Vacío si solo usa correos |

Si existían `VITE_MISTRAL_API_KEY` o `VITE_ANTHROPIC_API_KEY`, elimínelas: el cliente las empaquetaría. No agregue la service role.

Si las dos listas quedan vacías, la app no deja entrar a nadie. Un dominio autoriza a **todas** las cuentas de ese dominio; para un equipo chico use correos.

La misma lista tiene que existir en la base (paso 6). Si solo está en Vercel, la pantalla rechaza o acepta, pero quien llame la API directo sigue sujeto a Postgres. Si solo está en Postgres, la API niega, pero la pantalla puede cerrar la sesión antes.

En local, copie `.env.example` a `.env` con los mismos nombres.

### 5. Marque ese usuario como administrador

En **SQL Editor** (no cambia ninguna fila de `projects`):

```sql
UPDATE auth.users
SET raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
WHERE email = 'correo-del-administrador';
```

Sustituya el correo. El rol vive en `app_metadata`, que el usuario no puede editarse a sí mismo. No use `user_metadata` para esto.

Compruebe:

```sql
SELECT email, raw_app_meta_data
FROM auth.users
WHERE email = 'correo-del-administrador';
```

Debe verse `"role": "admin"`.

### 6. Aplique las migraciones, cargue la lista y despliegue enseguida

En **SQL Editor**, en este orden, si `002` todavía no está aplicada:

1. `supabase/migrations/002_projects_rls_auth.sql`
2. `supabase/migrations/003_projects_email_allowlist.sql`

Si `002` ya se aplicó, ejecute solo `003`. No vuelva a ejecutar `001`.

`003` no toca las filas de `projects` ni reemplaza las políticas de dueño y admin. Añade una política restrictiva: además de ser dueño o admin, el correo del token tiene que estar en `private.allowed_emails` o el dominio en `private.allowed_domains`. Con esas tablas vacías, **nadie** lee ni escribe escenarios (tampoco el admin). En la misma sesión de SQL, antes de depender de la app, cargue la lista. Esto no es un `UPDATE` de escenarios:

```sql
INSERT INTO private.allowed_emails (email)
VALUES (lower('correo-del-administrador'))
ON CONFLICT (email) DO NOTHING;

-- Opcional. Autoriza a todo el dominio, no solo a una persona:
-- INSERT INTO private.allowed_domains (domain)
-- VALUES (lower('empresa.com'))
-- ON CONFLICT (domain) DO NOTHING;
```

Repita el `INSERT` por cada correo de `ALLOWED_EMAILS`. Compruebe:

```sql
SELECT email FROM private.allowed_emails ORDER BY email;
SELECT domain FROM private.allowed_domains ORDER BY domain;
```

Inmediatamente después, despliegue esta versión (push a `main` si Vercel despliega solo, o `vercel --prod`). Las variables del paso 4 tienen que estar guardadas antes de ese deploy: Vite las incluye al construir.

Qué pasa si separa los pasos:

- **`002` sin este deploy:** la app que está hoy en el aire no inicia sesión. El portafolio deja de responder hasta que salga este frontend.
- **Deploy sin `002`:** el ingreso abre, pero guardar falla porque `owner_id` todavía no existe.
- **`003` sin los `INSERT`:** el ingreso puede abrir y la base responde vacío o rechaza el guardado, para todos, hasta que cargue la lista.
- **Deploy sin `003`:** la pantalla puede cerrar una cuenta que no está en `ALLOWED_EMAILS`, pero esa cuenta todavía podría leer la API si ya tiene sesión. `003` tiene que estar aplicada antes o junto con el deploy.

### 7. Asigne los escenarios que ya estaban guardados

Hasta este paso las filas siguen en la tabla, con `owner_id` vacío. El administrador ya puede verlas al iniciar sesión (la política se lo permite). Este `UPDATE` solo les pone dueño. No borra filas ni columnas. Ejecútelo en el **SQL Editor** después de la migración, con el mismo correo del paso 1:

```sql
UPDATE public.projects
SET owner_id = (SELECT id FROM auth.users WHERE email = 'correo-del-administrador')
WHERE owner_id IS NULL
  AND EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'correo-del-administrador'
  );
```

Si el correo no existe, el `EXISTS` hace que no se actualice ninguna fila. Vuelva a crearlo y repita. Compruebe que no quedó ninguna huérfana:

```sql
SELECT count(*) AS sin_dueno FROM public.projects WHERE owner_id IS NULL;
```

Tiene que dar `0` después de la asignación. Si da un número mayor, el correo no coincidió: no se perdió nada, corrija el correo y vuelva a ejecutar el `UPDATE`.

### 8. Entre a la aplicación

1. Abra el sitio. Use **Iniciar sesión con Google** o el correo y la contraseña del paso 1. Las dos vías exigen que el correo esté en la lista.
2. Si ya tenía una sesión abierta de antes de marcar el rol admin, use **Salir** y vuelva a entrar. El rol entra en el token al iniciar sesión.
3. Una cuenta de Google que no esté en la lista ve el aviso de no autorizada y no llega al evaluador. Aunque conserve un token, Postgres no le devuelve ni le deja escribir escenarios.
4. En **Portafolio**, elija la empresa y confirme que los escenarios históricos siguen ahí.
5. Guarde un escenario de prueba y compruebe que aparece. Borrar solo afecta a la empresa elegida (**Vaciar esta empresa**), no al resto de la tabla.

Quien no sea administrador solo ve y edita los escenarios que guardó con su usuario. Para darle la misma visibilidad del portafolio compartido, repita el paso 5 con su correo (`role = admin`) y pídale que vuelva a entrar. Crear ese usuario también es desde **Authentication → Users**; el formulario de la app no registra cuentas nuevas.

Sin variables de Supabase, la app sigue en modo **navegador local** (`localStorage`) y no pide ingreso. Ese modo no usa la base.

---

## Supabase — portafolio de escenarios

El módulo **Portafolio** guarda y consulta escenarios por empresa. Con Supabase configurado, los datos persisten en la nube y exigen inicio de sesión. Sin Supabase, usa **localStorage** (modo local, sin login).

### Proyecto nuevo

1. Cree el proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecute en orden `supabase/migrations/001_projects.sql`, `002_projects_rls_auth.sql` y `003_projects_email_allowlist.sql`. No ejecute `001` otra vez al final.
3. Siga los pasos 1, 2, 3, 5, 6 y 7 de [Después de fusionar](#después-de-fusionar) (usuario admin, Google, rol, lista de correos y, si ya hay filas, asignación).
4. Copie **Project URL** → `VITE_SUPABASE_URL` y la clave **anon public** → `VITE_SUPABASE_ANON_KEY`.

### Uso en la app

- Sin sesión, con Supabase configurado, la app muestra el ingreso y no abre el evaluador.
- **Guardar escenario** escribe la fila a nombre del usuario que inició sesión.
- **Portafolio** lista las empresas que ese usuario puede ver (las suyas, o todas si es administrador, incluidas las históricas sin dueño).
- El badge **Supabase** / **Navegador local** indica de dónde salen los datos.
- **Salir** cierra la sesión en este navegador.

---

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor local con proxy Mistral |
| `npm run build` | Build de producción |
| `npm run preview` | Vista previa estática (sin IA) |
| `npm test` | Suite completa (cálculos, informe, portafolio y controles de seguridad) |
| `npm run test:calc` | Validación cálculos ROI |
| `npm run test:docx` | Validación informe Word |
| `vercel dev` | Local con serverless |
| `vercel --prod` | Deploy producción |

---

## Estructura

```
api/mistral/v1/chat/completions.js   ← serverless (Vercel)
lib/mistralForward.js                ← proxy Mistral
src/
  App.jsx                            ← módulos: Diagnóstico, Descubrimiento, Portafolio
  components/discovery/              ← wizard y resultados
  panels/                            ← dimensiones de impacto
  components/AuthScreen.jsx          ← ingreso con Supabase Auth
  services/                          ← mistral.js, discoverAutomations.js, projectsService.js, authService.js
  lib/supabase.js                    ← cliente Supabase (solo URL y clave anon)
  utils/                             ← cálculos, informe, storage local
supabase/migrations/                 ← 001 schema; 002 cierra el acceso anónimo
vercel.json
```

---

## Personalización

- Colores y tema: `src/constants/colors.js`, `src/constants/theme.js`
- Tipografía: Poppins — `index.html`, `src/constants/typography.js`
- Prompts IA: `src/constants/prompts.js`, `src/constants/discoveryPrompts.js`

---

Ingeniería Asistida por Computador S.A.S. © 2025
