import { defaultArtworks } from './artworks.js'

export interface CommunityArtwork {
  id: string
  name: string
  creatorName: string
  creatorAvatar: string
  likes: number
  favorites: number
  points: number
  createdAt: number
  updatedAt: number
  tags: string[]
  viewCount: number
  useCount: number
  isPublic: boolean
  description: string
  cover?: {
    palette: string[]
    pattern: string
    seed: number
  }
  canvasData?: {
    width: number
    height: number
    backgroundColor?: string
    beads?: { x: number; y: number; color: string }[]
  }
  projectId?: string
  thumbnail?: string
}

export const ARTWORKS_VERSION = 'v016-local-100'

const tagPool = ['卡通', '可爱', '动物', '植物', '食物', '人物', '风景', '原创', '像素', '手作']

const safeArray = <T>(value: T[] | unknown): T[] => Array.isArray(value) ? value as T[] : []

export const normalizeArtwork = (item: any, index = 0): CommunityArtwork => {
  const width = item.canvasData?.width || 29
  const height = item.canvasData?.height || 29
  return {
    id: item.id || `artwork_${String(index + 1).padStart(3, '0')}`,
    name: item.name || '未命名作品',
    creatorName: item.creatorName || 'Pin用户',
    creatorAvatar: item.creatorAvatar || '',
    likes: Number(item.likes || 0),
    favorites: Number(item.favorites ?? Math.floor(Number(item.likes || 0) * 0.45)),
    points: Number(item.points || 0),
    createdAt: Number(item.createdAt || Date.now()),
    updatedAt: Number(item.updatedAt || item.createdAt || Date.now()),
    tags: safeArray<string>(item.tags).map((tag) => String(tag).slice(0, 5)).slice(0, 3),
    viewCount: Number(item.viewCount || 0),
    useCount: Number(item.useCount || 0),
    isPublic: item.isPublic !== false,
    description: item.description || '',
    cover: item.cover,
    canvasData: item.canvasData || { width, height, backgroundColor: '#FFFFFF', beads: [] },
    projectId: item.projectId,
    thumbnail: item.thumbnail || '',
  }
}

const buildDefaultArtworks = (): CommunityArtwork[] => {
  return defaultArtworks.slice(0, 100).map((item: any, index: number) => {
    const normalized = normalizeArtwork(item, index)
    const width = 18 + (index % 8) * 2
    const height = 18 + (index % 6) * 3
    normalized.points = index % 5 === 0 ? 0 : (index * 7) % 100 + 1
    normalized.updatedAt = normalized.createdAt + (index % 72) * 3600 * 1000
    normalized.canvasData = {
      width,
      height,
      backgroundColor: '#FFFDFA',
      beads: [],
    }
    return normalized
  })
}

export const ensureCommunityArtworks = (): CommunityArtwork[] => {
  const cached = uni.getStorageSync('pin_artworks')
  const cachedVersion = uni.getStorageSync('pin_artworks_version')

  if (!Array.isArray(cached) || cached.length === 0 || cachedVersion !== ARTWORKS_VERSION) {
    const defaults = buildDefaultArtworks()
    uni.setStorageSync('pin_artworks', defaults)
    uni.setStorageSync('pin_artworks_version', ARTWORKS_VERSION)
    return defaults
  }

  const normalized = cached.map((item: any, index: number) => normalizeArtwork(item, index))
  if (normalized.length !== cached.length) {
    uni.setStorageSync('pin_artworks', normalized)
  }
  return normalized
}

export const saveCommunityArtworks = (artworks: CommunityArtwork[]) => {
  uni.setStorageSync('pin_artworks', artworks)
  uni.setStorageSync('pin_artworks_version', ARTWORKS_VERSION)
}

export const getArtworkById = (id: string): CommunityArtwork | undefined => {
  return ensureCommunityArtworks().find((item) => item.id === id)
}

export const updateArtwork = (id: string, updater: (artwork: CommunityArtwork) => CommunityArtwork) => {
  const artworks = ensureCommunityArtworks()
  const index = artworks.findIndex((item) => item.id === id)
  if (index < 0) return undefined
  artworks[index] = updater({ ...artworks[index] })
  saveCommunityArtworks(artworks)
  return artworks[index]
}

export const getIdList = (key: string): string[] => safeArray<string>(uni.getStorageSync(key))

export const setIdList = (key: string, ids: string[]) => {
  uni.setStorageSync(key, Array.from(new Set(ids)))
}

export const toggleId = (key: string, id: string) => {
  const ids = getIdList(key)
  const exists = ids.includes(id)
  const next = exists ? ids.filter((item) => item !== id) : [...ids, id]
  setIdList(key, next)
  return !exists
}

export const generateProjectTags = (project: any): string[] => {
  const title = String(project.name || '')
  const tags: string[] = []
  const add = (tag: string) => {
    const safe = tag.slice(0, 5)
    if (safe && !tags.includes(safe) && tags.length < 3) tags.push(safe)
  }

  if (/猫|狗|兔|熊|鱼|鸟/.test(title)) add('动物')
  if (/花|树|草|叶/.test(title)) add('植物')
  if (/爱心|星|月|云/.test(title)) add('可爱')
  if (/人|头像|角色/.test(title)) add('人物')
  const beadCount = project.canvasData?.beads?.length || 0
  if (beadCount > 120) add('精细')
  if ((project.canvasData?.width || 0) <= 20) add('迷你')
  add('原创')
  add('拼豆')
  return tags
}

export const publishProjectAsArtwork = (project: any, points: number): CommunityArtwork => {
  const user = uni.getStorageSync('pin_user') || {}
  const now = Date.now()
  const artworks = ensureCommunityArtworks()
  const existedIndex = artworks.findIndex((item) => item.projectId === project.id)
  const artwork: CommunityArtwork = normalizeArtwork({
    id: existedIndex >= 0 ? artworks[existedIndex].id : `local_${project.id}`,
    name: project.name || '未命名作品',
    creatorName: user.username || 'Pin用户',
    creatorAvatar: user.avatar || '',
    likes: existedIndex >= 0 ? artworks[existedIndex].likes : 0,
    favorites: existedIndex >= 0 ? artworks[existedIndex].favorites : 0,
    points,
    createdAt: existedIndex >= 0 ? artworks[existedIndex].createdAt : now,
    updatedAt: now,
    tags: generateProjectTags(project),
    viewCount: existedIndex >= 0 ? artworks[existedIndex].viewCount : 0,
    useCount: existedIndex >= 0 ? artworks[existedIndex].useCount : 0,
    isPublic: true,
    canvasData: project.canvasData,
    projectId: project.id,
    thumbnail: project.thumbnail || '',
  })

  if (existedIndex >= 0) artworks[existedIndex] = artwork
  else artworks.unshift(artwork)
  saveCommunityArtworks(artworks)
  return artwork
}

export const unpublishProjectArtwork = (projectId: string) => {
  const artworks = ensureCommunityArtworks().map((item) => (
    item.projectId === projectId ? { ...item, isPublic: false, updatedAt: Date.now() } : item
  ))
  saveCommunityArtworks(artworks)
}

export const addPointsRecord = (title: string, amount: number) => {
  const records = safeArray<any>(uni.getStorageSync('pin_points_records'))
  records.unshift({
    id: `record_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    amount,
    time: Date.now(),
  })
  uni.setStorageSync('pin_points_records', records)
}
