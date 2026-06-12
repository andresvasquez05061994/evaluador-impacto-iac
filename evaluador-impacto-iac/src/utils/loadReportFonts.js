/** Fuentes Poppins embebidas en el informe Word (misma tipografía que la plataforma). */
export const REPORT_FONT = 'Poppins'

const FONT_FILES = {
  regular: 'fonts/Poppins-Regular.ttf',
  bold: 'fonts/Poppins-Bold.ttf',
  semibold: 'fonts/Poppins-SemiBold.ttf',
}

function assetUrl(file) {
  const base = import.meta.env?.BASE_URL ?? '/'
  return `${base}${file}`.replace(/\/{2,}/g, '/').replace(':/', '://')
}

let cachedFonts = null

async function fetchFont(relativePath) {
  const res = await fetch(assetUrl(relativePath))
  if (!res.ok) throw new Error(`No se pudo cargar la fuente ${relativePath}.`)
  return new Uint8Array(await res.arrayBuffer())
}

/** Carga buffers TTF para embeber Poppins en el .docx. */
export async function loadReportFonts() {
  if (cachedFonts) return cachedFonts
  const [regular, bold, semibold] = await Promise.all([
    fetchFont(FONT_FILES.regular),
    fetchFont(FONT_FILES.bold),
    fetchFont(FONT_FILES.semibold),
  ])
  cachedFonts = { regular, bold, semibold }
  return cachedFonts
}

/** Atributos de fuente para TextRun — aplica Poppins en todos los scripts. */
export function reportFont(opts = {}) {
  return { font: { ascii: REPORT_FONT, hAnsi: REPORT_FONT, cs: REPORT_FONT, eastAsia: REPORT_FONT }, ...opts }
}
