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
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const getTextColor = (hex: string) => {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255 > 0.58 ? '#2B2114' : '#FFFFFF'
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
      const finder =
        ((row < 7 && col < 7) || (row < 7 && col >= grid - 7) || (row >= grid - 7 && col < 7))
      if (finder) {
        const inBorder =
          row === 0 || row === 6 || col === 0 || col === 6 || ((row >= 2 && row <= 4) && (col >= 2 && col <= 4))
        if (inBorder) ctx.fillRect(x + col * cell, y + row * cell, cell, cell)
        continue
      }
      hash = (hash * 1664525 + 1013904223) >>> 0
      if ((hash & 1) === 1) {
        ctx.fillRect(x + col * cell, y + row * cell, cell, cell)
      }
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

export const renderBlueprintExportCanvas = (payload: ExportPayload) => {
  const width = Number(payload.canvasData.width || 30)
  const height = Number(payload.canvasData.height || 30)
  const totalBeads = getBeadCount(payload.canvasData)
  const colorTypes = getColorTypeCount(payload.canvasData)
  const legend = buildLegend(payload.canvasData)

  const canvas = document.createElement('canvas')
  const targetWidth = 2048
  const outerPadding = 72
  const infoHeight = 280
  const footerHeight = Math.max(260, Math.ceil(legend.length / 4) * 92 + 120)
  const gridAvailableWidth = targetWidth - outerPadding * 2 - 84
  const gridAvailableHeight = 2048 - infoHeight - footerHeight - outerPadding * 2
  const cellPx = Math.max(12, Math.min(Math.floor(gridAvailableWidth / width), Math.floor(gridAvailableHeight / height), 42))
  const labelBand = 42
  const gridWidth = width * cellPx
  const gridHeight = height * cellPx
  const canvasHeight = infoHeight + footerHeight + outerPadding * 2 + gridHeight + labelBand

  canvas.width = targetWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('导出画布初始化失败')

  ctx.fillStyle = '#FFFDF9'
  ctx.fillRect(0, 0, targetWidth, canvasHeight)

  ctx.fillStyle = '#231F1A'
  ctx.font = '700 54px sans-serif'
  ctx.fillText(payload.name || '未命名作品', outerPadding, 98)

  ctx.font = '500 24px sans-serif'
  ctx.fillStyle = '#786B57'
  const metaLines = [
    `图纸 ID：${payload.projectId}`,
    `作者：${payload.creatorName || 'Pin用户'}`,
    `时间：${formatDateTime(payload.updatedAt)}`,
    `规格：${width}×${height}格｜${totalBeads}豆｜${colorTypes}种色号`,
    `品牌：MARD｜积分：${Number(payload.points || 0) === 0 ? '免费' : `${payload.points} 积分`}`,
  ]
  metaLines.forEach((line, index) => {
    ctx.fillText(line, outerPadding, 148 + index * 32)
  })

  const qrSize = 180
  const qrX = targetWidth - outerPadding - qrSize
  const qrY = 64
  drawPseudoQr(ctx, payload.projectId, qrX, qrY, qrSize)
  ctx.font = '500 22px sans-serif'
  ctx.fillText('扫码回看图纸', qrX - 8, qrY + qrSize + 34)

  const gridOffsetX = outerPadding + labelBand
  const gridOffsetY = infoHeight

  ctx.fillStyle = '#F8EFD9'
  ctx.fillRect(gridOffsetX, gridOffsetY - labelBand, gridWidth, labelBand)
  ctx.fillRect(gridOffsetX - labelBand, gridOffsetY, labelBand, gridHeight)

  ctx.strokeStyle = '#231F1A'
  ctx.lineWidth = 2
  ctx.strokeRect(gridOffsetX, gridOffsetY, gridWidth, gridHeight)

  ctx.font = `${Math.max(12, Math.floor(cellPx * 0.32))}px sans-serif`
  ctx.fillStyle = '#6C5438'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let col = 0; col < width; col += 1) {
    ctx.fillText(String(col + 1), gridOffsetX + col * cellPx + cellPx / 2, gridOffsetY - labelBand / 2)
  }
  for (let row = 0; row < height; row += 1) {
    ctx.fillText(String(row + 1), gridOffsetX - labelBand / 2, gridOffsetY + row * cellPx + cellPx / 2)
  }

  ctx.strokeStyle = 'rgba(35,31,26,0.1)'
  ctx.lineWidth = 1
  for (let col = 0; col <= width; col += 1) {
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(gridOffsetX + col * cellPx, gridOffsetY)
    ctx.lineTo(gridOffsetX + col * cellPx, gridOffsetY + gridHeight)
    ctx.stroke()
  }
  for (let row = 0; row <= height; row += 1) {
    ctx.beginPath()
    ctx.moveTo(gridOffsetX, gridOffsetY + row * cellPx)
    ctx.lineTo(gridOffsetX + gridWidth, gridOffsetY + row * cellPx)
    ctx.stroke()
  }
  for (let row = 5; row < height; row += 5) {
    ctx.setLineDash([])
    ctx.strokeStyle = 'rgba(248, 90, 60, 0.78)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(gridOffsetX, gridOffsetY + row * cellPx)
    ctx.lineTo(gridOffsetX + gridWidth, gridOffsetY + row * cellPx)
    ctx.stroke()
  }
  for (let col = 5; col < width; col += 5) {
    ctx.setLineDash([8, 6])
    ctx.strokeStyle = 'rgba(248, 90, 60, 0.82)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(gridOffsetX + col * cellPx, gridOffsetY)
    ctx.lineTo(gridOffsetX + col * cellPx, gridOffsetY + gridHeight)
    ctx.stroke()
  }
  ctx.setLineDash([])

  const beadMap = new Map((payload.canvasData.beads || []).map((bead) => [`${bead.x},${bead.y}`, bead.color]))
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const color = beadMap.get(`${col},${row}`)
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(gridOffsetX + col * cellPx + 1, gridOffsetY + row * cellPx + 1, cellPx - 2, cellPx - 2)
      if (cellPx >= 20) {
        ctx.fillStyle = getTextColor(color)
        ctx.font = `700 ${Math.max(10, Math.floor(cellPx * 0.28))}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(getMardCodeByHex(color) || '', gridOffsetX + col * cellPx + cellPx / 2, gridOffsetY + row * cellPx + cellPx / 2)
      }
    }
  }

  const footerY = gridOffsetY + gridHeight + outerPadding
  ctx.fillStyle = '#231F1A'
  ctx.font = '700 34px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('颜色清单', outerPadding, footerY)

  legend.forEach((item, index) => {
    const col = index % 4
    const row = Math.floor(index / 4)
    const x = outerPadding + col * 470
    const y = footerY + 44 + row * 92
    ctx.fillStyle = item.color
    ctx.fillRect(x, y, 48, 48)
    ctx.strokeStyle = 'rgba(35,31,26,0.12)'
    ctx.strokeRect(x, y, 48, 48)
    ctx.fillStyle = '#231F1A'
    ctx.font = '700 24px sans-serif'
    ctx.fillText(item.code, x + 68, y + 18)
    ctx.font = '500 22px sans-serif'
    ctx.fillStyle = '#786B57'
    ctx.fillText(`${item.count} 颗`, x + 68, y + 44)
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
