import { mardFullPalette } from './mard-colors'
import {
  buildBeadsFromPixelData,
  clampGridSize,
  colorDistance,
  createBlueprintTransferData,
  getPreviewBoxSize,
  hexToRgb,
  rgbToHex,
  shouldTreatAsBackground,
} from './blueprint-utils'
import type { BlueprintTransferData } from './blueprint-transfer'

interface LoadedImageData {
  width: number
  height: number
  data: Uint8ClampedArray
  src: string
}

export interface BlueprintRecognitionResult {
  width: number
  height: number
  pixelData: string[][]
  backgroundColor: string
  previewUrl: string
  sourceWidth: number
  sourceHeight: number
  estimatedCellSize: number
}

const getLuminance = (r: number, g: number, b: number) => (r * 0.299 + g * 0.587 + b * 0.114)

const getPixelHex = (data: Uint8ClampedArray, width: number, x: number, y: number) => {
  const safeX = Math.max(0, Math.min(width - 1, Math.round(x)))
  const index = (Math.round(y) * width + safeX) * 4
  return rgbToHex(data[index], data[index + 1], data[index + 2])
}

const getPixelRgb = (data: Uint8ClampedArray, width: number, x: number, y: number) => {
  const safeX = Math.max(0, Math.min(width - 1, Math.round(x)))
  const index = (Math.round(y) * width + safeX) * 4
  return { r: data[index], g: data[index + 1], b: data[index + 2] }
}

const getCornerBackground = (image: LoadedImageData) => {
  const points = [
    [2, 2],
    [Math.max(2, image.width - 3), 2],
    [2, Math.max(2, image.height - 3)],
    [Math.max(2, image.width - 3), Math.max(2, image.height - 3)],
  ]
  const counter: Record<string, number> = {}
  points.forEach(([x, y]) => {
    const hex = getPixelHex(image.data, image.width, x, y)
    counter[hex] = (counter[hex] || 0) + 1
  })
  return Object.entries(counter).sort((a, b) => b[1] - a[1])[0]?.[0] || '#FFFFFF'
}

const findContentBounds = (image: LoadedImageData, backgroundColor: string) => {
  let left = image.width - 1
  let right = 0
  let top = image.height - 1
  let bottom = 0

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const hex = getPixelHex(image.data, image.width, x, y)
      if (!shouldTreatAsBackground(hex, backgroundColor, 22)) {
        left = Math.min(left, x)
        right = Math.max(right, x)
        top = Math.min(top, y)
        bottom = Math.max(bottom, y)
      }
    }
  }

  if (right <= left || bottom <= top) {
    return { left: 0, top: 0, right: image.width - 1, bottom: image.height - 1 }
  }

  return { left, top, right, bottom }
}

const findPeaks = (values: number[], thresholdRatio = 0.45) => {
  if (!values.length) return []
  const maxValue = Math.max(...values)
  const threshold = maxValue * thresholdRatio
  const peaks: number[] = []
  for (let i = 1; i < values.length - 1; i += 1) {
    if (values[i] >= threshold && values[i] >= values[i - 1] && values[i] >= values[i + 1]) {
      peaks.push(i)
    }
  }
  return peaks
}

const median = (values: number[]) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

const estimateCellSize = (image: LoadedImageData, bounds: { left: number; top: number; right: number; bottom: number }) => {
  const columnStrengths: number[] = []
  for (let x = bounds.left + 1; x <= bounds.right; x += 1) {
    let strength = 0
    for (let y = bounds.top; y <= bounds.bottom; y += 2) {
      const current = getPixelRgb(image.data, image.width, x, y)
      const previous = getPixelRgb(image.data, image.width, x - 1, y)
      strength += colorDistance(current, previous)
    }
    columnStrengths.push(strength)
  }

  const rowStrengths: number[] = []
  for (let y = bounds.top + 1; y <= bounds.bottom; y += 1) {
    let strength = 0
    for (let x = bounds.left; x <= bounds.right; x += 2) {
      const current = getPixelRgb(image.data, image.width, x, y)
      const previous = getPixelRgb(image.data, image.width, x, y - 1)
      strength += colorDistance(current, previous)
    }
    rowStrengths.push(strength)
  }

  const columnPeaks = findPeaks(columnStrengths).map((value) => value + bounds.left + 1)
  const rowPeaks = findPeaks(rowStrengths).map((value) => value + bounds.top + 1)
  const xDistances = columnPeaks.slice(1).map((value, index) => value - columnPeaks[index]).filter((gap) => gap >= 3)
  const yDistances = rowPeaks.slice(1).map((value, index) => value - rowPeaks[index]).filter((gap) => gap >= 3)
  const candidates = [...xDistances, ...yDistances]

  const cellSize = median(candidates)
  return cellSize >= 3 ? cellSize : 0
}

const findClosestPaletteColor = (hex: string) => {
  const rgb = hexToRgb(hex)
  let closest = mardFullPalette[0]
  let bestDistance = Number.POSITIVE_INFINITY
  mardFullPalette.forEach((candidate) => {
    const distance = colorDistance(rgb, hexToRgb(candidate))
    if (distance < bestDistance) {
      bestDistance = distance
      closest = candidate
    }
  })
  return closest
}

const sampleCellColor = (
  image: LoadedImageData,
  bounds: { left: number; top: number; right: number; bottom: number },
  gridWidth: number,
  gridHeight: number,
  backgroundColor: string,
) => {
  const pixelData: string[][] = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(backgroundColor))
  const boxWidth = bounds.right - bounds.left + 1
  const boxHeight = bounds.bottom - bounds.top + 1

  for (let row = 0; row < gridHeight; row += 1) {
    for (let col = 0; col < gridWidth; col += 1) {
      const startX = Math.floor(bounds.left + (col * boxWidth) / gridWidth)
      const endX = Math.floor(bounds.left + ((col + 1) * boxWidth) / gridWidth)
      const startY = Math.floor(bounds.top + (row * boxHeight) / gridHeight)
      const endY = Math.floor(bounds.top + ((row + 1) * boxHeight) / gridHeight)
      const frequency: Record<string, number> = {}

      for (let y = startY; y < Math.max(startY + 1, endY); y += 1) {
        for (let x = startX; x < Math.max(startX + 1, endX); x += 1) {
          const index = (y * image.width + x) * 4
          const alpha = image.data[index + 3]
          if (alpha < 100) continue
          const hex = rgbToHex(image.data[index], image.data[index + 1], image.data[index + 2])
          frequency[hex] = (frequency[hex] || 0) + 1
        }
      }

      let dominant = backgroundColor
      let count = 0
      Object.entries(frequency).forEach(([hex, frequencyCount]) => {
        if (frequencyCount > count) {
          dominant = hex
          count = frequencyCount
        }
      })

      pixelData[row][col] = shouldTreatAsBackground(dominant, backgroundColor, 18)
        ? backgroundColor
        : findClosestPaletteColor(dominant)
    }
  }

  return pixelData
}

const drawPreview = (pixelData: string[][], width: number, height: number, backgroundColor: string) => {
  const previewSize = getPreviewBoxSize(width, height, 320)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = false

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      ctx.fillStyle = pixelData[y]?.[x] || backgroundColor
      ctx.fillRect(x, y, 1, 1)
    }
  }

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = previewSize.width
  outputCanvas.height = previewSize.height
  const outputCtx = outputCanvas.getContext('2d')
  if (!outputCtx) return canvas.toDataURL('image/png')

  outputCtx.imageSmoothingEnabled = false
  outputCtx.drawImage(canvas, 0, 0, previewSize.width, previewSize.height)
  return outputCanvas.toDataURL('image/png')
}

export const loadImageFileData = (src: string): Promise<LoadedImageData> => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('读取图片失败'))
        return
      }
      context.drawImage(image, 0, 0)
      const imageData = context.getImageData(0, 0, image.width, image.height)
      resolve({
        width: image.width,
        height: image.height,
        data: imageData.data,
        src,
      })
    }
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = src
  })
}

export const recognizeBlueprintFromImage = async (
  imageSrc: string,
  manualSize?: { width: number; height: number }
): Promise<BlueprintRecognitionResult> => {
  const image = await loadImageFileData(imageSrc)
  const backgroundColor = getCornerBackground(image)
  const bounds = findContentBounds(image, backgroundColor)
  const estimatedCellSize = estimateCellSize(image, bounds)
  const guessedWidth = manualSize?.width || clampGridSize((bounds.right - bounds.left + 1) / (estimatedCellSize || 10))
  const guessedHeight = manualSize?.height || clampGridSize((bounds.bottom - bounds.top + 1) / (estimatedCellSize || 10))
  const pixelData = sampleCellColor(image, bounds, guessedWidth, guessedHeight, backgroundColor)
  const previewUrl = drawPreview(pixelData, guessedWidth, guessedHeight, backgroundColor)

  return {
    width: guessedWidth,
    height: guessedHeight,
    pixelData,
    backgroundColor,
    previewUrl,
    sourceWidth: image.width,
    sourceHeight: image.height,
    estimatedCellSize: estimatedCellSize || Math.max(1, Math.round((bounds.right - bounds.left + 1) / guessedWidth)),
  }
}

export const buildBlueprintTransferFromRecognition = (
  result: BlueprintRecognitionResult,
  sourceName: string,
  recognitionMode: 'auto' | 'manual'
): BlueprintTransferData => {
  return createBlueprintTransferData({
    width: result.width,
    height: result.height,
    backgroundColor: result.backgroundColor,
    showGrid: true,
    gridColor: '#CCCCCC',
    beads: buildBeadsFromPixelData(result.pixelData, result.width, result.height, result.backgroundColor, 18),
    sourceMeta: {
      sourceType: 'blueprint-import',
      sourceName,
      originalWidth: result.sourceWidth,
      originalHeight: result.sourceHeight,
      estimatedCellSize: result.estimatedCellSize,
      recognitionMode,
      backgroundColor: result.backgroundColor,
    },
    showColorCode: true,
  })
}
