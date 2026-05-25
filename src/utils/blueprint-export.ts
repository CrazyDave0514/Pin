import { getBeadCount, getColorTypeCount, type CanvasDataLike } from './community'
import { getMardCodeByHex } from './mard-colors'

type ExportPayload = {
  projectId: string
  name: string
  creatorName?: string
  updatedAt?: number
  points?: number
  canvasData: CanvasDataLike
}

const pad = (value: number) => String(value).padStart(2, '0')

const formatDateTime = (timestamp?: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const getTextColor = (hex: string) => {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255 > 0.62 ? '#2B2114' : '#FFFFFF'
}

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle?: string,
  strokeStyle?: string,
  lineWidth = 1
) => {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()

  if (fillStyle) {
    ctx.fillStyle = fillStyle
    ctx.fill()
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = lineWidth
    ctx.stroke()
  }
}

const drawPseudoQr = (ctx: CanvasRenderingContext2D, seed: string, x: number, y: number, size: number) => {
  const grid = 21
  const cell = size / grid
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(x, y, size, size)
  ctx.fillStyle = '#231F1A'

  for (let row = 0; row < grid; row += 1) {
    for (let col = 0; col < grid; col += 1) {
      const finder = (
        (row < 7 && col < 7) ||
        (row < 7 && col >= grid - 7) ||
        (row >= grid - 7 && col < 7)
      )
      if (finder) {
        const inBorder =
          row === 0 || row === 6 || col === 0 || col === 6 ||
          ((row >= 2 && row <= 4) && (col >= 2 && col <= 4))
        if (inBorder) ctx.fillRect(x + col * cell, y + row * cell, cell, cell)
        continue
      }
      hash = (hash * 1664525 + 1013904223) >>> 0
      if ((hash & 1) === 1) ctx.fillRect(x + col * cell, y + row * cell, cell, cell)
    }
  }
}

const buildLegend = (canvasData: CanvasDataLike) => {
  const counter = new Map<string, number>()
  ;(canvasData.beads || []).forEach((bead) => {
    counter.set(bead.color, (counter.get(bead.color) || 0) + 1)
  })
  return Array.from(counter.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({
      color,
      count,
      code: getMardCodeByHex(color) || color.slice(1, 4).toUpperCase(),
    }))
}

const drawInfoBadge = (ctx: CanvasRenderingContext2D, x: number, y: number, label: string) => {
  ctx.font = '500 24px sans-serif'
  const width = ctx.measureText(label).width + 30
  drawRoundedRect(ctx, x, y, width, 38, 12, '#F5F7FA', '#DCE3EA', 1)
  ctx.fillStyle = '#687384'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + 15, y + 19)
  return width
}

export const renderBlueprintExportCanvas = (payload: ExportPayload) => {
  const width = Number(payload.canvasData.width || 30)
  const height = Number(payload.canvasData.height || 30)
  const totalBeads = getBeadCount(payload.canvasData)
  const colorTypes = getColorTypeCount(payload.canvasData)
  const legend = buildLegend(payload.canvasData)
  const beadMap = new Map((payload.canvasData.beads || []).map((bead) => [`${bead.x},${bead.y}`, bead.color]))

  const canvas = document.createElement('canvas')
  const outerPadding = 40
  const panelRadius = 22
  const labelBand = 42
  const gridPanelPadding = 28
  const contentMinWidth = 960
  const gridAvailableWidth = Math.min(1600, Math.max(960, width * 32))
  const cellPx = Math.max(16, Math.min(32, Math.floor(gridAvailableWidth / width)))
  const gridWidth = width * cellPx
  const gridHeight = height * cellPx
  const layoutWidth = gridPanelPadding * 2 + labelBand * 2 + gridWidth
  const gridSectionHeight = gridHeight + labelBand * 2 + gridPanelPadding * 2
  const headerHeight = 168
  const legendColumns = 10
  const legendRows = Math.max(1, Math.ceil(legend.length / legendColumns))
  const legendCellWidth = Math.floor(gridWidth / legendColumns)
  const legendCellHeight = 68
  const legendSectionHeight = 90 + legendRows * legendCellHeight + 24
  const pageWidth = Math.max(contentMinWidth, layoutWidth + outerPadding * 2)
  const layoutLeft = Math.floor((pageWidth - layoutWidth) / 2)
  const gridPanelX = layoutLeft
  const gridOffsetX = gridPanelX + gridPanelPadding + labelBand
  const gridRightEdge = gridOffsetX + gridWidth
  const pageInnerWidth = pageWidth - outerPadding * 2
  const pageHeight = outerPadding * 2 + headerHeight + 24 + gridSectionHeight + 24 + legendSectionHeight + 24

  canvas.width = pageWidth
  canvas.height = pageHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('导出画布初始化失败')

  ctx.fillStyle = '#F3F6FA'
  ctx.fillRect(0, 0, pageWidth, pageHeight)

  drawRoundedRect(ctx, outerPadding, outerPadding, pageInnerWidth, pageHeight - outerPadding * 2, panelRadius, '#FFFFFF')

  const contentLeft = layoutLeft + 24
  const contentTop = outerPadding + 24
  const gridPanelY = outerPadding + headerHeight + 24
  const gridPanelWidth = layoutWidth
  const gridOffsetY = gridPanelY + gridPanelPadding + labelBand

  ctx.fillStyle = '#231F1A'
  ctx.font = '700 26px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(formatDateTime(payload.updatedAt), contentLeft, contentTop)

  ctx.font = '500 20px sans-serif'
  ctx.fillStyle = '#7B8794'
  ctx.fillText(`作者：${payload.creatorName || 'Pin用户'}`, contentLeft, contentTop + 42)
  ctx.fillText(`图纸ID：${payload.projectId}`, contentLeft + 180, contentTop + 42)

  let badgeX = contentLeft
  const badgeY = contentTop + 78
  badgeX += drawInfoBadge(ctx, badgeX, badgeY, `尺寸 ${width}×${height}`) + 10
  badgeX += drawInfoBadge(ctx, badgeX, badgeY, '品牌 mard') + 10
  badgeX += drawInfoBadge(ctx, badgeX, badgeY, `${colorTypes} 色`) + 10
  drawInfoBadge(ctx, badgeX, badgeY, `${totalBeads} 颗`)

  const brandBoxWidth = 260
  const brandBoxHeight = 78
  const qrSize = 88
  const brandGap = 20
  const brandBoxX = gridRightEdge - qrSize - brandGap - brandBoxWidth
  const brandBoxY = contentTop + 8
  drawRoundedRect(ctx, brandBoxX, brandBoxY, brandBoxWidth, brandBoxHeight, 18, '#F7FAFD', '#DDE4EC')
  drawRoundedRect(ctx, brandBoxX + 16, brandBoxY + 16, 42, 42, 12, '#1F2937')
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '700 20px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Pin', brandBoxX + 37, brandBoxY + 37)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#1F2937'
  ctx.font = '700 20px sans-serif'
  ctx.fillText('Pin', brandBoxX + 72, brandBoxY + 26)
  ctx.fillStyle = '#7B8794'
  ctx.font = '500 16px sans-serif'
  ctx.fillText('指尖轻点拼出治愈像素世界', brandBoxX + 72, brandBoxY + 50)

  const qrX = gridRightEdge - qrSize
  const qrY = contentTop + 2
  drawPseudoQr(ctx, payload.projectId, qrX, qrY, qrSize)
  drawRoundedRect(ctx, gridPanelX, gridPanelY, gridPanelWidth, gridSectionHeight, 20, '#FFFFFF', '#DCE5ED')

  ctx.fillStyle = '#E8F4FF'
  ctx.fillRect(gridOffsetX, gridOffsetY - labelBand, gridWidth, labelBand)
  ctx.fillRect(gridOffsetX - labelBand, gridOffsetY, labelBand, gridHeight)
  ctx.fillRect(gridOffsetX + gridWidth, gridOffsetY, labelBand, gridHeight)
  ctx.fillRect(gridOffsetX, gridOffsetY + gridHeight, gridWidth, labelBand)

  ctx.strokeStyle = '#5F7487'
  ctx.lineWidth = 1.5
  ctx.strokeRect(gridOffsetX, gridOffsetY, gridWidth, gridHeight)

  ctx.font = '600 14px sans-serif'
  ctx.fillStyle = '#4B5D70'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let col = 0; col < width; col += 1) {
    const x = gridOffsetX + col * cellPx + cellPx / 2
    ctx.fillText(String(col + 1), x, gridOffsetY - labelBand / 2)
    ctx.fillText(String(col + 1), x, gridOffsetY + gridHeight + labelBand / 2)
  }
  for (let row = 0; row < height; row += 1) {
    const y = gridOffsetY + row * cellPx + cellPx / 2
    ctx.fillText(String(row + 1), gridOffsetX - labelBand / 2, y)
    ctx.fillText(String(row + 1), gridOffsetX + gridWidth + labelBand / 2, y)
  }

  ctx.strokeStyle = 'rgba(107, 128, 145, 0.25)'
  ctx.lineWidth = 1
  ctx.setLineDash([])
  for (let col = 0; col <= width; col += 1) {
    const x = gridOffsetX + col * cellPx
    ctx.beginPath()
    ctx.moveTo(x, gridOffsetY)
    ctx.lineTo(x, gridOffsetY + gridHeight)
    ctx.stroke()
  }
  for (let row = 0; row <= height; row += 1) {
    const y = gridOffsetY + row * cellPx
    ctx.beginPath()
    ctx.moveTo(gridOffsetX, y)
    ctx.lineTo(gridOffsetX + gridWidth, y)
    ctx.stroke()
  }

  for (let row = 0; row <= height; row += 5) {
    const y = gridOffsetY + row * cellPx
    ctx.strokeStyle = 'rgba(59, 84, 109, 0.82)'
    ctx.lineWidth = row === 0 || row === height ? 2.2 : 1.5
    ctx.setLineDash(row !== 0 && row !== height && row % 10 === 0 ? [8, 6] : [])
    ctx.beginPath()
    ctx.moveTo(gridOffsetX, y)
    ctx.lineTo(gridOffsetX + gridWidth, y)
    ctx.stroke()
  }
  for (let col = 0; col <= width; col += 5) {
    const x = gridOffsetX + col * cellPx
    ctx.strokeStyle = 'rgba(59, 84, 109, 0.82)'
    ctx.lineWidth = col === 0 || col === width ? 2.2 : 1.5
    ctx.setLineDash(col !== 0 && col !== width && col % 10 === 0 ? [8, 6] : [])
    ctx.beginPath()
    ctx.moveTo(x, gridOffsetY)
    ctx.lineTo(x, gridOffsetY + gridHeight)
    ctx.stroke()
  }
  ctx.setLineDash([])

  const codeFontSize = Math.max(8, Math.min(14, Math.floor(cellPx * 0.34)))
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const color = beadMap.get(`${col},${row}`) || '#FFFFFF'
      const x = gridOffsetX + col * cellPx
      const y = gridOffsetY + row * cellPx
      ctx.fillStyle = color
      ctx.fillRect(x + 1, y + 1, cellPx - 2, cellPx - 2)
      ctx.fillStyle = getTextColor(color)
      ctx.font = `600 ${codeFontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(getMardCodeByHex(color) || '', x + cellPx / 2, y + cellPx / 2)
    }
  }

  const legendSectionX = gridPanelX
  const legendSectionY = gridPanelY + gridSectionHeight + 24
  drawRoundedRect(ctx, legendSectionX, legendSectionY, gridPanelWidth, legendSectionHeight, 20, '#FFFFFF', '#DCE5ED')
  ctx.fillStyle = '#231F1A'
  ctx.font = '700 24px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('颜色清单', legendSectionX + 24, legendSectionY + 22)

  const legendStartX = gridOffsetX
  const legendStartY = legendSectionY + 62
  legend.forEach((item, index) => {
    const col = index % legendColumns
    const row = Math.floor(index / legendColumns)
    const x = legendStartX + col * legendCellWidth
    const y = legendStartY + row * legendCellHeight
    const itemWidth = legendCellWidth - 10

    drawRoundedRect(ctx, x, y, itemWidth, 50, 12, item.color)
    ctx.fillStyle = getTextColor(item.color)
    ctx.font = '700 14px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${item.code} (${item.count})`, x + 12, y + 25)
  })

  return canvas
}

export const exportBlueprintAsBlob = async (payload: ExportPayload) => {
  const canvas = renderBlueprintExportCanvas(payload)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value)
      else reject(new Error('导出图片失败'))
    }, 'image/png', 1)
  })
  return { canvas, blob, fileName: `${payload.name || payload.projectId}.png` }
}

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
