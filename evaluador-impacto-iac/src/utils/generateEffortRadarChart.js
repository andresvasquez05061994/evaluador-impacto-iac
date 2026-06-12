const CORAL = '#D85A30'
const TEAL = '#1D9E75'
const NAVY = '#37373C'
const MUTED = '#888780'
const GRID = '#E0E2EA'
const BG = '#FFFFFF'

function polar(cx, cy, radius, index, total) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  }
}

function drawPolygon(ctx, cx, cy, maxR, values, maxVal, stroke, fill) {
  const n = values.length
  ctx.beginPath()
  values.forEach((v, i) => {
    const r = (Math.max(0, v) / maxVal) * maxR
    const { x, y } = polar(cx, cy, r, i, n)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 2.5
  ctx.stroke()
}

function wrapLabel(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let line = words[0]
  for (let i = 1; i < words.length; i += 1) {
    const test = `${line} ${words[i]}`
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(line)
      line = words[i]
    } else {
      line = test
    }
  }
  lines.push(line)
  return lines
}

/**
 * Genera PNG del radar "Esfuerzo manual: antes vs. después" (canvas nativo).
 * @param {Array<{ dim: string, sin: number, con: number }>} effortDimensions
 */
export async function renderEffortRadarChart(effortDimensions) {
  const width = 720
  const height = 460
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, width, height)

  const title = 'Esfuerzo manual: antes vs. después'
  ctx.fillStyle = NAVY
  ctx.font = 'bold 18px Poppins, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(title, 28, 36)

  const cx = width / 2
  const cy = height / 2 - 10
  const maxR = 148
  const maxVal = 100
  const n = effortDimensions.length

  ;[0.25, 0.5, 0.75, 1].forEach((level) => {
    ctx.beginPath()
    for (let i = 0; i < n; i += 1) {
      const { x, y } = polar(cx, cy, maxR * level, i, n)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.strokeStyle = GRID
    ctx.lineWidth = 1
    ctx.stroke()
  })

  for (let i = 0; i < n; i += 1) {
    const { x, y } = polar(cx, cy, maxR, i, n)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    ctx.strokeStyle = GRID
    ctx.lineWidth = 1
    ctx.stroke()
  }

  const sinValues = effortDimensions.map((d) => d.sin)
  const conValues = effortDimensions.map((d) => d.con)

  drawPolygon(ctx, cx, cy, maxR, sinValues, maxVal, CORAL, 'rgba(216, 90, 48, 0.22)')
  drawPolygon(ctx, cx, cy, maxR, conValues, maxVal, TEAL, 'rgba(29, 158, 117, 0.22)')

  ctx.font = '11px Poppins, sans-serif'
  ctx.fillStyle = MUTED
  effortDimensions.forEach((d, i) => {
    const labelR = maxR + 28
    const { x, y } = polar(cx, cy, labelR, i, n)
    ctx.textAlign = Math.abs(x - cx) < 4 ? 'center' : x > cx ? 'left' : 'right'
    ctx.textBaseline = Math.abs(y - cy) < 4 ? 'middle' : y > cy ? 'top' : 'bottom'
    const lines = wrapLabel(ctx, d.dim, 72)
    lines.forEach((line, li) => {
      ctx.fillText(line, x, y + li * 13)
    })
  })

  const legendY = height - 34
  ctx.textAlign = 'left'
  ctx.font = '12px Poppins, sans-serif'
  ;[
    { color: CORAL, label: 'Sin plataforma', x: width / 2 - 130 },
    { color: TEAL, label: 'Con plataforma', x: width / 2 + 20 },
  ].forEach(({ color, label, x }) => {
    ctx.fillStyle = color
    ctx.fillRect(x, legendY - 8, 14, 14)
    ctx.fillStyle = NAVY
    ctx.fillText(label, x + 20, legendY + 2)
  })

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar el gráfico.'))), 'image/png', 1)
  })
  return new Uint8Array(await blob.arrayBuffer())
}
