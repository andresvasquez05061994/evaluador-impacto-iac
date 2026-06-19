# Evaluador de Impacto — IAC

Simulador de ROI y descubrimiento de automatización para procesos empresariales.  
Incluye diagnóstico con IA (Mistral), módulo de descubrimiento, portafolio y generación de informe Word.

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
| `MISTRAL_API_KEY` | tu key de Mistral | Production, Preview, Development |
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | anon/public key de Supabase | Production, Preview, Development |

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

La key **nunca** va al bundle del cliente (`MISTRAL_API_KEY` sin prefijo `VITE_`).

---

## Supabase — portafolio de escenarios

El módulo **Portafolio** guarda y consulta escenarios por empresa. Si configuras Supabase, los datos persisten en la nube; si no, usa **localStorage** del navegador (modo local).

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto.
2. En **SQL Editor**, ejecuta el script:
   `supabase/migrations/001_projects.sql`
3. En **Project Settings → API**, copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 2. Variables de entorno

En `.env` (local) y en **Vercel → Environment Variables**:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 3. Uso en la app

- **Guardar escenario** (módulo Diagnóstico) → inserta/actualiza en Supabase.
- **Portafolio** → lista escenarios, filtra por **empresa** y ordena por ROI u otros criterios.
- El badge **Supabase** / **Navegador local** indica dónde se están leyendo los datos.

> Las políticas RLS actuales permiten lectura/escritura pública (sin login). Para producción con datos sensibles, configure autenticación y restrinja las políticas en Supabase.

---

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor local con proxy Mistral |
| `npm run build` | Build de producción |
| `npm run preview` | Vista previa estática (sin IA) |
| `npm test` | Suite completa (114 pruebas) |
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
  services/                          ← mistral.js, discoverAutomations.js, projectsService.js
  lib/supabase.js                    ← cliente Supabase
  utils/                             ← cálculos, informe, storage local
supabase/migrations/                 ← schema tabla projects
vercel.json
```

---

## Personalización

- Colores y tema: `src/constants/colors.js`, `src/constants/theme.js`
- Tipografía: Poppins — `index.html`, `src/constants/typography.js`
- Prompts IA: `src/constants/prompts.js`, `src/constants/discoveryPrompts.js`

---

Ingeniería Asistida por Computador S.A.S. © 2025
