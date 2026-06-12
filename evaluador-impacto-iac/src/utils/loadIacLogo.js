export const LOGO_SIZE_CM = 1.25

/** Píxeles a 96 DPI equivalentes a 1,25 cm (unidad usada por docx). */
export const LOGO_SIZE_PX = Math.round((LOGO_SIZE_CM / 2.54) * 96)

/** Logo estándar — fondos claros e informes Word (papel blanco). */
export const LOGO_FILE_DEFAULT = 'logo-iac.png'

/** Logo claro/blanco — tema oscuro de la plataforma. */
export const LOGO_FILE_DARK_THEME = 'logo-iac-white.png'

/**
 * El PNG blanco tiene más margen interno; escala para igualar el tamaño visual
 * al logo estándar dentro del cuadro de 1,25 cm.
 */
export const LOGO_DARK_THEME_SCALE = 1.69

function assetUrl(file) {
  const base = import.meta.env?.BASE_URL ?? '/'
  return `${base}${file}`.replace(/\/{2,}/g, '/').replace(':/', '://')
}

export function getLogoUrl(isDarkTheme) {
  return assetUrl(isDarkTheme ? LOGO_FILE_DARK_THEME : LOGO_FILE_DEFAULT)
}

let cachedReportLogo = null

/** Logo para informes Word — siempre el estándar (fondo blanco del documento). */
export async function loadIacLogo() {
  if (cachedReportLogo) return cachedReportLogo
  const res = await fetch(assetUrl(LOGO_FILE_DEFAULT))
  if (!res.ok) throw new Error('No se pudo cargar el logo IAC.')
  cachedReportLogo = new Uint8Array(await res.arrayBuffer())
  return cachedReportLogo
}

export function logoImageRun(logoData) {
  return {
    type: 'png',
    data: logoData,
    transformation: { width: LOGO_SIZE_PX, height: LOGO_SIZE_PX },
  }
}
