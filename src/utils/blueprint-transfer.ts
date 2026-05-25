export interface BlueprintTransferBead {
  x: number
  y: number
  color: string
}

export interface BlueprintTransferSourceMeta {
  sourceType?: 'image-import' | 'blueprint-import' | 'project-import'
  sourceName?: string
  originalWidth?: number
  originalHeight?: number
  estimatedCellSize?: number
  recognitionMode?: 'auto' | 'manual'
  backgroundColor?: string
}

export interface BlueprintTransferData {
  width: number
  height: number
  backgroundColor: string
  showGrid: boolean
  gridColor: string
  beads: BlueprintTransferBead[]
  createdAt?: number
  updatedAt?: number
  sourceMeta?: BlueprintTransferSourceMeta
  beadStyle?: 'square' | 'round'
  showColorCode?: boolean
}

let blueprintData: BlueprintTransferData | null = null

export function setBlueprintData(data: BlueprintTransferData) {
  blueprintData = data
}

export function consumeBlueprintData(): BlueprintTransferData | null {
  const data = blueprintData
  blueprintData = null
  return data
}
