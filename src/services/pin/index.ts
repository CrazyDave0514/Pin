import { normalizeAvatarValue } from '../../utils/avatar-normalize.ts'
import {
  ARTWORKS_VERSION,
  buildProjectThumbnail,
  ensureCommunityArtworks,
  getArtworkById,
  normalizeProjectTags,
  projectTagsToList,
  publishProjectAsArtwork,
  saveCommunityArtworks,
  syncProjectArtwork,
  syncPublishedProjectsWithArtworks,
  unpublishProjectArtwork,
  updateArtwork,
  type CommunityArtwork,
} from '../../utils/community.ts'
import { DELETE_ACCOUNT_KEYS, LOGOUT_KEYS } from './storage-keys.ts'
import { getAliyunPinApiConfig, setAliyunPinApiConfig, type AliyunPinApiConfig } from './aliyun-config.ts'
import { PIN_STORAGE_KEYS } from './provider.ts'
import { safeArray } from '../../utils/array-utils.ts'
import { LocalPinDataProvider } from './local-provider.ts'
import { AliyunPinDataProvider } from './aliyun-provider.ts'
import type { PinDataProvider } from './provider.ts'
import { getStorageAdapter, setStorageAdapter, type StorageAdapter } from './storage-adapter.ts'
import type {
  ArtworkInteractionState,
  ArtworkToggleResult,
  FolderRecord,
  PinAuthService,
  PinCommunityService,
  PinPointsService,
  PinProjectService,
  PinPurchaseService,
  PinServices,
  PointsRecord,
  ProjectRecord,
  ProjectSearchEntry,
  RecentImportRecord,
  SettingsRecord,
  UserProfile,
} from './types.ts'

const DEFAULT_POINTS = 100

const DEFAULT_SETTINGS: SettingsRecord = {
  pushEnabled: true,
  emailEnabled: false,
  followerNotify: true,
  favoriteNotify: true,
  publicWorks: true,
  allowMessage: true,
}

const DEFAULT_POINTS_RECORDS = (): PointsRecord[] => ([
  { id: '1', title: '注册奖励', amount: 100, time: Date.now() - 86400000 * 2 },
  { id: '2', title: '每日签到', amount: 5, time: Date.now() - 86400000 },
  { id: '3', title: '发布作品', amount: 10, time: Date.now() - 3600000 },
])

const normalizeUser = (user: UserProfile | null) => {
  if (!user) return null
  if (!user.avatar) return user
  return {
    ...user,
    avatar: normalizeAvatarValue(user.avatar),
  }
}

const normalizeProject = (item: ProjectRecord): ProjectRecord => ({
  ...item,
  folderId: item.folderId || '',
  tags: normalizeProjectTags(item.tags),
  thumbnail: item.thumbnail || buildProjectThumbnail(item.canvasData),
  updatedAt: item.updatedAt || item.createdAt || Date.now(),
  isOffShelf: !!item.isOffShelf,
})

const normalizeFolder = (item: FolderRecord): FolderRecord => ({
  id: item.id,
  name: item.name || '未命名文件夹',
  parentId: item.parentId || '',
  createdAt: item.createdAt || Date.now(),
  updatedAt: item.updatedAt || item.createdAt || Date.now(),
})

const buildProjectSearchEntries = async (
  provider: PinDataProvider,
  artworks: CommunityArtwork[]
) : Promise<ProjectSearchEntry[]> => {
  const projects = (await provider.getProjects()).map((item) => {
    const tags = [item.tags?.primary, item.tags?.secondary].filter(Boolean).join(' / ')
    return {
      id: item.id,
      type: 'project',
      name: item.name || '未命名作品',
      subtitle: tags || '项目作品',
      folderId: item.folderId || '',
      extra: [tags, item.canvasData?.width, item.canvasData?.height].join(' '),
    }
  })
  const folders = (await provider.getFolders()).map((item) => ({
    id: item.id,
    type: 'folder',
    name: item.name || '未命名文件夹',
    subtitle: '文件夹',
    extra: '',
  }))
  const artworkEntries = artworks.map((item) => ({
    id: item.projectId || item.id,
    type: 'project',
    name: item.name || '未命名作品',
    subtitle: [item.creatorName, ...(item.tags || [])].filter(Boolean).join(' / ') || '社区作品',
    folderId: '',
    extra: [item.creatorName, ...(item.tags || [])].join(' '),
  }))

  return [...projects, ...folders, ...artworkEntries]
    .filter((item, index, array) => array.findIndex((target) => target.type === item.type && target.id === item.id) === index)
}

export const createPinServices = (options: {
  provider?: PinDataProvider
  storageAdapter?: StorageAdapter
  target?: 'local' | 'aliyun'
  aliyunConfig?: Partial<AliyunPinApiConfig>
} = {}) => {
  if (options.storageAdapter) {
    setStorageAdapter(options.storageAdapter)
  }

  if (options.aliyunConfig) {
    setAliyunPinApiConfig(options.aliyunConfig)
  }

  const provider = options.provider
    || (options.target === 'aliyun'
      ? new AliyunPinDataProvider(options.storageAdapter || getStorageAdapter())
      : new LocalPinDataProvider(options.storageAdapter || getStorageAdapter()))

  const authService: PinAuthService = {
    async getCurrentUser() {
      const user = await provider.getCurrentUser()
      const normalized = normalizeUser(user)
      if (normalized && normalized.avatar !== user?.avatar) {
        await provider.setCurrentUser(normalized)
      }
      return normalized
    },
    async getUserList() {
      return safeArray<UserProfile>(await provider.getUserList())
    },
    async getLastUser() {
      const userList = await provider.getUserList()
      return userList.length ? userList[userList.length - 1] : null
    },
    async isLoggedIn() {
      return Boolean(await provider.getCurrentUser())
    },
    async quickLogin(user?: UserProfile) {
      const targetUser = user || await this.getLastUser()
      if (!targetUser) {
        throw new Error('暂无可登录账号')
      }
      await provider.setCurrentUser(targetUser)
      const points = await provider.getPoints()
      if (!points) {
        await provider.setPoints(DEFAULT_POINTS)
      }
      return targetUser
    },
    async register(username: string) {
      const userList = await provider.getUserList()
      if (userList.some((item) => item.username === username)) {
        throw new Error('用户名已被使用')
      }
      const newUser: UserProfile = {
        uid: `U${Date.now().toString(36).toUpperCase()}`,
        username,
        avatar: '',
        createdAt: Date.now(),
        following: [],
      }
      userList.push(newUser)
      await provider.setUserList(userList)
      await provider.setCurrentUser(newUser)
      await provider.setPoints(DEFAULT_POINTS)
      return newUser
    },
    /**
     * 更新当前用户信息
     * 同时同步到后端服务器
     */
    async updateCurrentUser(patch: Partial<UserProfile> | ((user: UserProfile) => UserProfile)) {
      const user = await provider.getCurrentUser()
      if (!user) return null
      const nextUser = typeof patch === 'function'
        ? patch(user)
        : { ...user, ...patch }

      // 先同步到后端服务器
      try {
        await provider.request('PUT', '/users/current', {
          profile: {
            nickname: nextUser.nickname,
            avatar: nextUser.avatar,
            bio: nextUser.bio,
          }
        })
        console.log('用户资料已同步到后端')
      } catch (error) {
        console.error('同步用户资料到后端失败:', error)
        // 后端同步失败不影响本地更新，但应该提示用户
      }

      // 再更新本地存储
      await provider.setCurrentUser(nextUser)
      const userList = await provider.getUserList()
      await provider.setUserList(userList.map((item) => item.uid === nextUser.uid ? nextUser : item))
      return nextUser
    },
    async getSettings() {
      return {
        ...DEFAULT_SETTINGS,
        ...await provider.getSettings(),
      }
    },
    async setSettings(settings: Partial<SettingsRecord>) {
      const nextSettings = {
        ...await this.getSettings(),
        ...settings,
      }
      await provider.setSettings(nextSettings)
      return nextSettings
    },
    async clearCache() {
      await provider.clearAll()
    },
    async logout() {
      await provider.removeKeys([...LOGOUT_KEYS])
    },
    async deleteAccount() {
      // 调用后端注销 API（如果是云端模式）
      try {
        const token = uni.getStorageSync('pin_auth_token')
        if (token) {
          const config = getAliyunPinApiConfig()
          const baseUrl = config.baseUrl
          if (baseUrl) {
            await new Promise<void>((resolve, reject) => {
              uni.request({
                url: `${baseUrl}/auth/unregister?token=${encodeURIComponent(token)}`,
                method: 'POST',
                timeout: 15000,
                success: () => resolve(),
                fail: (err: any) => reject(new Error(err?.errMsg || '注销请求失败')),
              })
            })
          }
        }
      } catch (e) {
        // 后端注销失败时仍清除本地数据
        console.error('Backend unregister failed:', e)
      }

      // 清除本地数据
      await provider.removeKeys([...DELETE_ACCOUNT_KEYS])
    },
  }

  const pointsService: PinPointsService = {
    async getPointsBalance() {
      return await provider.getPoints()
    },
    async setPointsBalance(points: number) {
      await provider.setPoints(points)
    },
    async ensureInitialPoints() {
      const points = await provider.getPoints()
      if (!points) {
        await provider.setPoints(DEFAULT_POINTS)
        return DEFAULT_POINTS
      }
      return points
    },
    async getRecords() {
      return await provider.getPointsRecords()
    },
    /**
     * 获取积分记录（仅返回真实记录，不包含默认数据）
     */
    async getDisplayRecords() {
      return await provider.getPointsRecords()
    },
    async addRecord(title: string, amount: number) {
      const records = await provider.getPointsRecords()
      const nextRecord: PointsRecord = {
        id: `record_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        amount,
        time: Date.now(),
      }
      const nextRecords = [nextRecord, ...records]
      await provider.setPointsRecords(nextRecords)
      return nextRecord
    },
  }

  const communityService: PinCommunityService = {
    async ensureArtworks() {
      // 优先从后端 API 获取作品数据（云端模式）
      try {
        const result = await provider.getArtworks(1, 50)
        if (result && Array.isArray(result.artworks) && result.artworks.length > 0) {
          // 合并本地发布的项目作品
          const merged = syncPublishedProjectsWithArtworks(result.artworks)
          saveCommunityArtworks(merged)
          return merged
        }
      } catch (error) {
        // API 调用失败时 fallback 到本地数据
        console.warn('Failed to fetch artworks from API, fallback to local:', error)
      }
      // Fallback 到本地假数据
      return ensureCommunityArtworks()
    },
    /**
     * 获取作品列表（支持分页）
     * @param page 页码（从1开始）
     * @param size 每页数量
     * @returns 作品列表结果
     */
    async getArtworks(page = 1, size = 20) {
      return await provider.getArtworks(page, size)
    },
    async replaceArtworks(artworks: CommunityArtwork[]) {
      saveCommunityArtworks(artworks)
      return artworks
    },
    async getArtworkById(id: string) {
      return getArtworkById(id) || null
    },
    async updateArtwork(id: string, updater: (artwork: CommunityArtwork) => CommunityArtwork) {
      return updateArtwork(id, updater) || null
    },
    async getLikedArtworkIds() {
      return provider.getLikedArtworkIds()
    },
    async getFavoritedArtworkIds() {
      return provider.getFavoritedArtworkIds()
    },
    async getPurchasedArtworkIds() {
      return provider.getPurchasedArtworkIds()
    },
    async getFollowedCreators() {
      return provider.getFollowedCreators()
    },
    async getBlockedCreators() {
      return provider.getBlockedCreators()
    },
    async getInteractionState(artworkId: string, creatorName: string): Promise<ArtworkInteractionState> {
      const [liked, favorited, purchased, followed] = await Promise.all([
        provider.getLikedArtworkIds(),
        provider.getFavoritedArtworkIds(),
        provider.getPurchasedArtworkIds(),
        provider.getFollowedCreators(),
      ])
      return {
        isLiked: liked.includes(artworkId),
        isFavorited: favorited.includes(artworkId),
        isPurchased: purchased.includes(artworkId),
        isFollowing: followed.includes(creatorName),
      }
    },
    async toggleLike(artworkId: string): Promise<ArtworkToggleResult> {
      const ids = await provider.getLikedArtworkIds()
      const exists = ids.includes(artworkId)
      const nextIds = exists ? ids.filter((item) => item !== artworkId) : [...ids, artworkId]
      await provider.setLikedArtworkIds(nextIds)
      const artwork = updateArtwork(artworkId, (item) => ({
        ...item,
        likes: Math.max(0, item.likes + (exists ? -1 : 1)),
      }))
      return { added: !exists, artwork }
    },
    async toggleFavorite(artworkId: string): Promise<ArtworkToggleResult> {
      const ids = await provider.getFavoritedArtworkIds()
      const exists = ids.includes(artworkId)
      const nextIds = exists ? ids.filter((item) => item !== artworkId) : [...ids, artworkId]
      await provider.setFavoritedArtworkIds(nextIds)
      const artwork = updateArtwork(artworkId, (item) => ({
        ...item,
        favorites: Math.max(0, item.favorites + (exists ? -1 : 1)),
      }))
      return { added: !exists, artwork }
    },
    async toggleFollow(creatorName: string) {
      const creators = await provider.getFollowedCreators()
      const exists = creators.includes(creatorName)
      const nextCreators = exists ? creators.filter((item) => item !== creatorName) : [...creators, creatorName]
      await provider.setFollowedCreators(nextCreators)
      return !exists
    },
    async getCollection(type: 'favorites' | 'likes') {
      const ids = type === 'likes'
        ? await provider.getLikedArtworkIds()
        : await provider.getFavoritedArtworkIds()
      const artworks = ensureCommunityArtworks()
      return ids
        .map((id) => artworks.find((item) => item.id === id && item.isPublic !== false))
        .filter(Boolean) as CommunityArtwork[]
    },
    async publishProjectAsArtwork(project: ProjectRecord, points: number) {
      return publishProjectAsArtwork(project, points)
    },
    /**
     * 发布作品到社区（调用后端 API）
     * @param payload 发布数据
     * @returns 发布的作品
     */
    async publishArtwork(payload) {
      // 调用后端 API 发布作品
      const artwork = await provider.request<CommunityArtwork>('POST', '/artworks', {
        name: payload.name,
        description: payload.description || '',
        points: payload.points,
        tags: payload.tags || [],
        tagMeta: payload.tagMeta,
        canvasData: payload.canvasData,
        thumbnail: payload.thumbnail,
        beadCount: payload.beadCount,
        colorTypeCount: payload.colorTypeCount,
      })
      return artwork
    },
    async syncProjectArtwork(project: ProjectRecord) {
      return syncProjectArtwork(project)
    },
    async unpublishProjectArtwork(projectId: string) {
      return unpublishProjectArtwork(projectId)
    },
  }

  const projectService: PinProjectService = {
    async getProjects() {
      return (await provider.getProjects()).map(normalizeProject)
    },
    async saveProjects(projects: ProjectRecord[]) {
      await provider.setProjects(projects)
      return projects
    },
    async getProjectById(projectId: string) {
      return (await this.getProjects()).find((item) => item.id === projectId)
    },
    async getFolders() {
      return (await provider.getFolders()).map(normalizeFolder)
    },
    async saveFolders(folders: FolderRecord[]) {
      await provider.setFolders(folders)
      return folders
    },
    async getRecentImports(limit = 5) {
      return (await provider.getRecentImports()).slice(0, limit)
    },
    async saveRecentImport(payload: { projectId: string; name: string }) {
      const item: RecentImportRecord = {
        id: payload.projectId,
        projectId: payload.projectId,
        name: payload.name,
        importedAt: Date.now(),
      }
      const saved = await provider.getRecentImports()
      const nextValue = [item, ...saved.filter((entry) => entry.projectId !== item.projectId)].slice(0, 10)
      await provider.setRecentImports(nextValue)
      return nextValue
    },
    async getProjectOwnerName() {
      return (await provider.getCurrentUser())?.username || 'Pin用户'
    },
    async getSearchHistory() {
      return await provider.getSearchHistory()
    },
    async saveSearchHistory(history: string[]) {
      await provider.setSearchHistory(history)
      return history
    },
    async clearSearchHistory() {
      await provider.removeKeys([PIN_STORAGE_KEYS.searchHistory])
    },
    async getProjectSearchEntries() {
      return buildProjectSearchEntries(provider, ensureCommunityArtworks())
    },
  }

  const purchaseService: PinPurchaseService = {
    async purchaseArtwork(artworkId: string) {
      const artwork = getArtworkById(artworkId)
      if (!artwork || artwork.isPublic === false) {
        return { success: false, reason: 'NOT_FOUND', balance: await provider.getPoints() }
      }

      const purchasedIds = await provider.getPurchasedArtworkIds()
      if (purchasedIds.includes(artworkId)) {
        return { success: false, reason: 'ALREADY_PURCHASED', artwork, balance: await provider.getPoints() }
      }

      const currentPoints = await provider.getPoints()
      const points = artwork.points || 0
      if (points > currentPoints) {
        return { success: false, reason: 'INSUFFICIENT_POINTS', artwork, balance: currentPoints }
      }

      if (points > 0) {
        await provider.setPoints(currentPoints - points)
        await pointsService.addRecord(`购买${artwork.name}`, -points)
      }

      await provider.setPurchasedArtworkIds([...purchasedIds, artwork.id])
      const updatedArtwork = updateArtwork(artwork.id, (item) => ({
        ...item,
        useCount: item.useCount + 1,
      }))

      return {
        success: true,
        artwork: updatedArtwork,
        balance: points > 0 ? currentPoints - points : currentPoints,
      }
    },
  }

  const services: PinServices = {
    provider,
    authService,
    pointsService,
    communityService,
    projectService,
    purchaseService,
  }

  return services
}

// 默认使用云端模式（AliyunPinDataProvider）
// 如需本地模式，可调用 createPinServices({ target: 'local' })
export const pinServices = createPinServices({ target: 'aliyun' })
export const {
  provider: pinDataProvider,
  authService,
  pointsService,
  communityService,
  projectService,
  purchaseService,
} = pinServices

export {
  getAliyunPinApiConfig,
  setAliyunPinApiConfig,
}

export type {
  AliyunPinApiConfig,
  ArtworkInteractionState,
  ArtworkToggleResult,
  CommunityArtwork,
  FolderRecord,
  PinAuthService,
  PinCommunityService,
  PinPointsService,
  PinProjectService,
  PinPurchaseService,
  PinServices,
  PointsRecord,
  ProjectSearchEntry,
  ProjectRecord,
  PurchaseArtworkResult,
  RecentImportRecord,
  SettingsRecord,
  UserProfile,
} from './types'
