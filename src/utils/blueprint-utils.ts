import type { BlueprintTransferBead, BlueprintTransferData } from './blueprint-transfer'

export interface RgbColor {
  r: number
  g: number
  b: number
}

export const clampGridSize = (value: number, min = 4, max = 200) => {
  const safeValue = Number.isFinite(value) ? Math.round(value) : min
  return Math.min(max, Math.max(min, safeValue))
}

export const getAspectFittedGrid = (shortSide: number, aspectRatio: number) => {
  const safeShortSide = clampGridSize(shortSide)
  const safeRatio = aspectRatio > 0 ? aspectRatio : 1

  if (safeRatio >= 1) {
    return {
      width: safeShortSide,
      height: clampGridSize(safeShortSide / safeRatio),
    }
  }

  return {
    width: clampGridSize(safeShortSide * safeRatio),
    height: safeShortSide,
  }
}

export const syncGridByAspect = (
  changed: 'width' | 'height',
  value: number,
  aspectRatio: number
) => {
  const safeValue = clampGridSize(value)
  const safeRatio = aspectRatio > 0 ? aspectRatio : 1

  if (changed === 'width') {
    return {
      width: safeValue,
      height: clampGridSize(safeValue / safeRatio),
    }
  }

  return {
    width: clampGridSize(safeValue * safeRatio),
    height: safeValue,
  }
}

export const getPreviewBoxSize = (width: number, height: number, maxSize = 260) => {
  const safeWidth = clampGridSize(width)
  const safeHeight = clampGridSize(height)
  const ratio = safeWidth / safeHeight

  if (ratio >= 1) {
    return {
      width: maxSize,
      height: Math.max(72, Math.round(maxSize / ratio)),
    }
  }

  return {
    width: Math.max(72, Math.round(maxSize * ratio)),
    height: maxSize,
  }
}

export const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((item) => item.toString(16).padStart(2, '0').toUpperCase()).join('')}`

export const hexToRgb = (hex: string): RgbColor => {
  const safeHex = String(hex || '#FFFFFF').replace('#', '').padEnd(6, 'F')
  return {
    r: parseInt(safeHex.slice(0, 2), 16),
    g: parseInt(safeHex.slice(2, 4), 16),
    b: parseInt(safeHex.slice(4, 6), 16),
  }
}

export const colorDistance = (a: RgbColor, b: RgbColor) => {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
}

export const isNearWhite = (hex: string, threshold = 9) => {
  const rgb = hexToRgb(hex)
  return rgb.r >= 255 - threshold && rgb.g >= 255 - threshold && rgb.b >= 255 - threshold
}

export const shouldTreatAsBackground = (
  hex: string,
  backgroundHex: string,
  backgroundThreshold = 20
) => {
  if (!hex) return true
  const rgb = hexToRgb(hex)
  const background = hexToRgb(backgroundHex)
  return colorDistance(rgb, background) <= backgroundThreshold
}

export const buildBeadsFromPixelData = (
  pixelData: string[][],
  width: number,
  height: number,
  backgroundColor = '#FFFFFF',
  backgroundThreshold = 20
): BlueprintTransferBead[] => {
  const beads: BlueprintTransferBead[] = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = pixelData[y]?.[x] || backgroundColor
      if (!shouldTreatAsBackground(color, backgroundColor, backgroundThreshold)) {
        beads.push({ x, y, color })
      }
    }
  }

  return beads
}

export const createBlueprintTransferData = (
  data: Partial<BlueprintTransferData> & Pick<BlueprintTransferData, 'width' | 'height' | 'beads'>
): BlueprintTransferData => ({
  width: clampGridSize(data.width),
  height: clampGridSize(data.height),
  backgroundColor: data.backgroundColor || '#FFFFFF',
  showGrid: data.showGrid !== false,
  gridColor: data.gridColor || '#CCCCCC',
  beads: Array.isArray(data.beads) ? data.beads : [],
  createdAt: data.createdAt || Date.now(),
  updatedAt: data.updatedAt || Date.now(),
  sourceMeta: data.sourceMeta,
  beadStyle: data.beadStyle === 'round' ? 'round' : 'square',
  showColorCode: data.showColorCode === true,
})
