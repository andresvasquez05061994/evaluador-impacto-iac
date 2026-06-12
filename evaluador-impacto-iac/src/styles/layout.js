import { FONT } from '../constants/typography'

export const chartCard = {
  background: 'var(--bg3)',
  borderRadius: 2,
  padding: '12px 14px',
  border: '1px solid var(--border)',
  marginBottom: 10,
}

export const grid2 = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: 10,
  marginBottom: 10,
}

export const kpiGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))',
  gap: 8,
  marginBottom: 12,
}

export const progBg = {
  background: 'var(--bg4)',
  borderRadius: 2,
  height: 4,
  overflow: 'hidden',
  marginTop: 2,
}

export const panelPre = {
  fontFamily: FONT,
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: '.12em',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  marginBottom: 5,
}

export const sLabel = {
  fontFamily: FONT,
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: '.1em',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  marginBottom: 8,
  paddingBottom: 5,
  borderBottom: '1px solid var(--border)',
}

export const chartTooltipStyle = {
  background: 'var(--bg3)',
  border: '1px solid var(--border-strong)',
  borderRadius: 2,
  fontSize: 10,
}

export const panelTitle = {
  fontFamily: FONT,
  fontSize: 19,
  fontWeight: 600,
  letterSpacing: '-.02em',
  marginBottom: 4,
  color: 'var(--text)',
  lineHeight: 1.2,
}

export const panelDesc = {
  fontSize: 11,
  color: 'var(--text-muted)',
  marginBottom: 12,
  lineHeight: 1.5,
  maxWidth: 560,
}

export const pageTitle = {
  fontFamily: FONT,
  fontSize: 20,
  fontWeight: 600,
  letterSpacing: '-.02em',
  marginBottom: 5,
  color: 'var(--text)',
  lineHeight: 1.2,
}

export const pageSubtitle = {
  fontSize: 11,
  color: 'var(--text-muted)',
  lineHeight: 1.55,
  maxWidth: 560,
}
