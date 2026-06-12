export const fmtM = (n) => {
  const a = Math.abs(n)
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',') + 'B'
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + 'M'
  if (a >= 1e3) return Math.round(n / 1e3) + 'K'
  return Math.round(n).toString()
}

export const fmtCOP = (n) => `$${fmtM(n)}`
export const fmtPct = (n) => `${Math.round(n)}%`
