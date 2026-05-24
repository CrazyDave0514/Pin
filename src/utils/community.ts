import { defaultArtworks } from './artworks.js'
import { normalizeAvatarValue } from './avatar-presets'

export interface ProjectTags {
  primary?: string
  secondary?: string
}

export interface CanvasBead {
  x: number
  y: number
  color: string
}

export interface CanvasDataLike {
  width: number
  height: number
  backgroundColor?: string
  beads?: CanvasBead[]
  beadStyle?: 'square' | 'round'
  showColorCode?: boolean
}

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
  tagMeta?: ProjectTags
  viewCount: number
  useCount: number
  isPublic: boolean
  description: string
  beadCount: number
  colorTypeCount: number
  cover?: {
    palette: string[]
    pattern: string
    seed: number
  }
  canvasData?: CanvasDataLike
  projectId?: string
  thumbnail?: string
}

export const ARTWORKS_VERSION = 'v017-local-100'

export const TAG_OPTIONS = [
  { primary: '动物', secondary: ['猫咪', '狗狗', '兔子', '小鸟', '鱼类', '恐龙', '熊猫', '其他'] },
  { primary: '植物', secondary: ['花朵', '向日葵', '仙人掌', '树木', '多肉', '其他'] },
  { primary: '人物', secondary: ['美食家', '运动健将', '音乐家', '其他'] },
  { primary: '食物', secondary: ['蛋糕', '冰淇淋', '水果', '饮料', '快餐', '其他'] },
  { primary: '交通', secondary: ['汽车', '飞机', '轮船', '火车', '火箭', '其他'] },
  { primary: '建筑', secondary: ['房屋', '城堡', '桥梁', '其他'] },
  { primary: '节日', secondary: ['圣诞节', '春节', '万圣节', '情人节', '生日', '其他'] },
  { primary: '字母', secondary: ['A-Z', '0-9', '其他'] },
  { primary: '卡通', secondary: ['皮卡丘', '龙猫', '小黄人', '迪士尼', '其他'] },
  { primary: '抽象', secondary: ['几何图形', '像素艺术', '棋盘格', '其他'] },
] as const

const safeArray = <T>(value: T[] | unknown): T[] => Array.isArray(value) ? (value as T[]) : []

const safeCanvasData = (value: any): CanvasDataLike => ({
  width: Number(value?.width || 29),
  height: Number(value?.height || 29),
  backgroundColor: value?.backgroundColor || '#FFFFFF',
  beads: safeArray<CanvasBead>(value?.beads).map((bead: any) => ({
    x: Number(bead.x || 0),
    y: Number(bead.y || 0),
    color: String(bead.color || '#FFFFFF'),
  })),
  beadStyle: value?.beadStyle === 'round' ? 'round' : 'square',
  showColorCode: value?.showColorCode === true,
})

export const normalizeProjectTags = (value: any): ProjectTags => {
  if (!value || typeof value !== 'object') return {}
  const primary = typeof value.primary === 'string' ? value.primary.trim() : ''
  const secondary = typeof value.secondary === 'string' ? value.secondary.trim() : ''
  return {
    primary: primary || undefined,
    secondary: secondary || undefined,
  }
}

export const projectTagsToList = (tags: ProjectTags | undefined): string[] => {
  const result = [tags?.primary, tags?.secondary].filter(Boolean) as string[]
  return result.slice(0, 5).map((item) => item.slice(0, 8))
}

export const getBeadCount = (canvasData?: CanvasDataLike) => {
  return safeArray(canvasData?.beads).length
}

export const getColorTypeCount = (canvasData?: CanvasDataLike) => {
  const set = new Set(safeArray(canvasData?.beads).map((bead) => bead.color))
  return set.size
}

export const buildProjectThumbnail = (canvasData?: CanvasDataLike) => {
  const data = safeCanvasData(canvasData)
  if (!data.beads?.length) return ''

  const colorMap: Record<string, { x: number; y: number }[]> = {}
  data.beads.forEach((bead) => {
    if (!colorMap[bead.color]) colorMap[bead.color] = []
    colorMap[bead.color].push({ x: bead.x, y: bead.y })
  })

  let rects = ''
  Object.entries(colorMap).forEach(([color, positions]) => {
    positions.forEach((position) => {
      rects += `<rect x="${position.x}" y="${position.y}" width="1" height="1" fill="${color}"/>`
    })
  })

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${data.width}" height="${data.height}" viewBox="0 0 ${data.width} ${data.height}"><rect width="${data.width}" height="${data.height}" fill="${data.backgroundColor || '#FFFFFF'}"/>${rects}</svg>`
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

export const normalizeArtwork = (item: any, index = 0): CommunityArtwork => {
  const canvasData = safeCanvasData(item.canvasData)
  const tagMeta = normalizeProjectTags(item.tagMeta)
  const tags = safeArray<string>(item.tags)
    .map((tag) => String(tag).slice(0, 8))
    .filter(Boolean)
    .slice(0, 5)

  return {
    id: item.id || `artwork_${String(index + 1).padStart(3, '0')}`,
    name: item.name || '未命名作品',
    creatorName: item.creatorName || 'Pin用户',
    creatorAvatar: normalizeAvatarValue(item.creatorAvatar || ''),
    likes: Number(item.likes || 0),
    favorites: Number(item.favorites ?? Math.floor(Number(item.likes || 0) * 0.45)),
    points: Number(item.points || 0),
    createdAt: Number(item.createdAt || Date.now()),
    updatedAt: Number(item.updatedAt || item.createdAt || Date.now()),
    tags: tags.length ? tags : projectTagsToList(tagMeta),
    tagMeta,
    viewCount: Number(item.viewCount || 0),
    useCount: Number(item.useCount || 0),
    isPublic: item.isPublic !== false,
    description: item.description || '',
    beadCount: Number(item.beadCount || getBeadCount(canvasData)),
    colorTypeCount: Number(item.colorTypeCount || getColorTypeCount(canvasData)),
    cover: item.cover,
    canvasData,
    projectId: item.projectId,
    thumbnail: item.thumbnail || buildProjectThumbnail(canvasData),
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
      beadStyle: 'round',
      showColorCode: false,
    }
    normalized.beadCount = 0
    normalized.colorTypeCount = 0
    return normalized
  })
}

const getStoredProjects = () => safeArray<any>(uni.getStorageSync('pin_projects'))

const getPublishedProjectArtworkId = (project: any) => {
  return String(project?.publishedArtworkId || '')
}

export const createArtworkFromProject = (
  project: any,
  options: {
    existing?: CommunityArtwork
    forcePublic?: boolean
  } = {}
): CommunityArtwork => {
  const user = uni.getStorageSync('pin_user') || {}
  const existing = options.existing
  const canvasData = safeCanvasData(project.canvasData)
  const tagMeta = normalizeProjectTags(project.tags)
  const thumbnail = project.thumbnail || buildProjectThumbnail(canvasData)
  const createdAt = Number(existing?.createdAt || project.createdAt || Date.now())
  const updatedAt = Number(project.updatedAt || Date.now())

  return normalizeArtwork({
    id: existing?.id || getPublishedProjectArtworkId(project) || `local_${project.id}`,
    name: project.name || '未命名作品',
    creatorName: user.username || existing?.creatorName || 'Pin用户',
    creatorAvatar: normalizeAvatarValue(user.avatar || existing?.creatorAvatar || ''),
    likes: existing?.likes || 0,
    favorites: existing?.favorites || 0,
    points: Number(project.publishPoints ?? existing?.points ?? 0),
    createdAt,
    updatedAt,
    tags: projectTagsToList(tagMeta),
    tagMeta,
    viewCount: existing?.viewCount || 0,
    useCount: existing?.useCount || 0,
    isPublic: options.forcePublic !== false,
    description: existing?.description || '',
    canvasData,
    projectId: project.id,
    thumbnail,
    beadCount: getBeadCount(canvasData),
    colorTypeCount: getColorTypeCount(canvasData),
  })
}

export const saveCommunityArtworks = (artworks: CommunityArtwork[]) => {
  uni.setStorageSync('pin_artworks', artworks)
  uni.setStorageSync('pin_artworks_version', ARTWORKS_VERSION)
}

export const syncPublishedProjectsWithArtworks = (artworksInput?: CommunityArtwork[]) => {
  const artworkMap = new Map((artworksInput || []).map((item) => [item.id, normalizeArtwork(item)]))
  const projectArtworksByProjectId = new Map(
    Array.from(artworkMap.values())
      .filter((item) => item.projectId)
      .map((item) => [String(item.projectId), item])
  )

  getStoredProjects().forEach((project) => {
    const publishedArtworkId = getPublishedProjectArtworkId(project)
    const existing = artworkMap.get(publishedArtworkId) || projectArtworksByProjectId.get(String(project.id))
    if (project.isPublished) {
      const synced = createArtworkFromProject(project, { existing, forcePublic: true })
      artworkMap.set(synced.id, synced)
    } else if (existing) {
      artworkMap.set(existing.id, normalizeArtwork({ ...existing, isPublic: false, updatedAt: Date.now() }))
    }
  })

  return Array.from(artworkMap.values())
}

export const ensureCommunityArtworks = (): CommunityArtwork[] => {
  const cached = uni.getStorageSync('pin_artworks')
  const cachedVersion = uni.getStorageSync('pin_artworks_version')

  let artworks = !Array.isArray(cached) || cached.length === 0 || cachedVersion !== ARTWORKS_VERSION
    ? buildDefaultArtworks()
    : cached.map((item: any, index: number) => normalizeArtwork(item, index))

  artworks = syncPublishedProjectsWithArtworks(artworks)
  saveCommunityArtworks(artworks)
  return artworks
}

export const getArtworkById = (id: string): CommunityArtwork | undefined => {
  return ensureCommunityArtworks().find((item) => item.id === id)
}

export const updateArtwork = (id: string, updater: (artwork: CommunityArtwork) => CommunityArtwork) => {
  const artworks = ensureCommunityArtworks()
  const index = artworks.findIndex((item) => item.id === id)
  if (index < 0) return undefined
  artworks[index] = normalizeArtwork(updater({ ...artworks[index] }))
  saveCommunityArtworks(artworks)
  return artworks[index]
}

export const publishProjectAsArtwork = (project: any, points: number) => {
  const artworks = ensureCommunityArtworks()
  const existing = artworks.find((item) => item.id === getPublishedProjectArtworkId(project) || item.projectId === project.id)
  const normalizedProject = {
    ...project,
    publishPoints: points,
    thumbnail: project.thumbnail || buildProjectThumbnail(project.canvasData),
  }
  const artwork = createArtworkFromProject(normalizedProject, {
    existing,
    forcePublic: true,
  })
  const next = existing
    ? artworks.map((item) => (item.id === existing.id ? artwork : item))
    : [artwork, ...artworks]
  saveCommunityArtworks(next)
  return artwork
}

export const syncProjectArtwork = (project: any) => {
  if (!project?.isPublished) return undefined
  return publishProjectAsArtwork(project, Number(project.publishPoints || 0))
}

export const unpublishProjectArtwork = (projectId: string) => {
  const artworks = ensureCommunityArtworks().map((item) => (
    item.projectId === projectId ? normalizeArtwork({ ...item, isPublic: false, updatedAt: Date.now() }) : item
  ))
  saveCommunityArtworks(artworks)
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
