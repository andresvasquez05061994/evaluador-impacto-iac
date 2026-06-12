import { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import {
  LOGO_DARK_THEME_SCALE,
  LOGO_SIZE_CM,
  getLogoUrl,
} from '../utils/loadIacLogo'

export default function IacLogo({ style = {} }) {
  const { isDark } = useTheme()
  const preferred = getLogoUrl(isDark)
  const fallback = getLogoUrl(false)
  const [src, setSrc] = useState(preferred)

  useEffect(() => {
    setSrc(getLogoUrl(isDark))
  }, [isDark])

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${LOGO_SIZE_CM}cm`,
        height: `${LOGO_SIZE_CM}cm`,
        overflow: 'hidden',
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src={src}
        alt="IAC — Ingeniería Asistida por Computador"
        onError={() => {
          if (src !== fallback) setSrc(fallback)
        }}
        style={{
          display: 'block',
          width: `${LOGO_SIZE_CM}cm`,
          height: `${LOGO_SIZE_CM}cm`,
          objectFit: 'contain',
          transform: isDark ? `scale(${LOGO_DARK_THEME_SCALE})` : undefined,
        }}
      />
    </span>
  )
}
