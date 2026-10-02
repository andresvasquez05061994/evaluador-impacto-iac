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

Las keys de IA **no** van al bundle del cliente: solo `MISTRAL_API_KEY` y `ANTHROPIC_API_KEY`, sin prefijo `VITE_`. La clave anon de Supabase sí viaja al navegador; no da acceso a los escenarios. Hace falta una sesión y la política de la migración `002`.

---

## Después de fusionar

Haga estos pasos en orden, en el proyecto Supabase que ya está en producción y en Vercel. **No vuelva a ejecutar** `supabase/migrations/001_projects.sql` después del paso 4: ese script recrea las políticas abiertas.

Nada de esto borra escenarios. La migración solo agrega la columna `owner_id` (vacía en las filas que ya existen), un índice y políticas nuevas. No hay `UPDATE`, `DELETE`, `TRUNCATE` ni `DROP` de datos.

### 1. Deje el alta pública cerrada y cree el administrador

En Supabase → **Authentication → Sign In / Providers → Email**:

1. El proveedor Email queda habilitado.
2. Desactive **Allow new users to sign up** (el alta solo se hace desde el dashboard).
3. Puede dejar activada la confirmación de correo: un usuario creado con **Add user** en el dashboard ya queda confirmado.

En **Authentication → Users → Add user**, cree el usuario administrador con su correo y una contraseña. Anote el correo: lo usará en los pasos 3 y 5.

### 2. Variables en Vercel (antes del deploy)

En el proyecto de Vercel, Production, Preview y Development:

| Variable | Qué poner |
|---|---|
| `MISTRAL_API_KEY` | la key de Mistral, sin prefijo `VITE_` |
| `ANTHROPIC_API_KEY` | la key de Anthropic, si la usa |
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | la clave anon / public |

Si existían `VITE_MISTRAL_API_KEY` o `VITE_ANTHROPIC_API_KEY`, elimínelas: el cliente las empaquetaría. No agregue la service role.

En local, copie `.env.example` a `.env` con los mismos nombres.

### 3. Marque ese usuario como administrador

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

### 4. Aplique la migración y despliegue enseguida

En **SQL Editor**, ejecute el archivo completo:

`supabase/migrations/002_projects_rls_auth.sql`

Inmediatamente después, despliegue esta versión (push a `main` si Vercel despliega solo, o `vercel --prod`).

Qué pasa si separa los dos pasos:

- **Migración sin este deploy:** la app que está hoy en el aire no inicia sesión. Supabase le niega leer y guardar hasta que salga este frontend. El diagnóstico en pantalla abre, el portafolio no.
- **Deploy sin esta migración:** el ingreso funciona, pero guardar falla porque la columna `owner_id` todavía no existe y las políticas viejas siguen abiertas.

Por eso van en la misma ventana, migración primero y deploy justo después.

### 5. Asigne los escenarios que ya estaban guardados

Hasta este paso las filas siguen en la tabla, con `owner_id` vacío. El administrador ya puede verlas al iniciar sesión (la política se lo permite). Este `UPDATE` solo les pone dueño. No borra filas ni columnas. Ejecútelo en el **SQL Editor** después de la migración, con el mismo correo del paso 3:

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

### 6. Entre a la aplicación

1. Abra el sitio y entre con el correo y la contraseña del paso 1.
2. Si ya tenía una sesión abierta de antes de marcar el rol admin, use **Salir** y vuelva a entrar. El rol entra en el token al iniciar sesión.
3. En **Portafolio**, elija la empresa y confirme que los escenarios históricos siguen ahí.
4. Guarde un escenario de prueba y compruebe que aparece. Borrar solo afecta a la empresa elegida (**Vaciar esta empresa**), no al resto de la tabla.

Quien no sea administrador solo ve y edita los escenarios que guardó con su usuario. Para darle la misma visibilidad del portafolio compartido, repita el paso 3 con su correo (`role = admin`) y pídale que vuelva a entrar. Crear ese usuario también es desde **Authentication → Users**; el formulario de la app no registra cuentas nuevas.

Sin variables de Supabase, la app sigue en modo **navegador local** (`localStorage`) y no pide ingreso. Ese modo no usa la base.

---

## Supabase — portafolio de escenarios

El módulo **Portafolio** guarda y consulta escenarios por empresa. Con Supabase configurado, los datos persisten en la nube y exigen inicio de sesión. Sin Supabase, usa **localStorage** (modo local, sin login).

### Proyecto nuevo

1. Cree el proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecute primero `supabase/migrations/001_projects.sql` y después `supabase/migrations/002_projects_rls_auth.sql`. No ejecute `001` otra vez al final.
3. Siga los pasos 1, 3 y 5 de [Después de fusionar](#después-de-fusionar) (usuario admin, rol y, si ya hay filas, asignación).
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
