import { getAliyunPinApiConfig, type AliyunPinApiConfig } from './aliyun-config.ts'
import { LocalPinDataProvider } from './local-provider.ts'
import type { PinDataProvider } from './provider.ts'
import { getStorageAdapter, type StorageAdapter } from './storage-adapter.ts'
import type { CommunityArtwork, FolderRecord, PointsRecord, ProjectRecord, RecentImportRecord, SettingsRecord, UserProfile } from './types.ts'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface AliyunApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}

const getUni = () => {
  const uniInstance = (globalThis as { uni?: {
    request: (options: Record<string, unknown>) => void
  } }).uni

  if (!uniInstance?.request) {
    throw new Error('uni.request is not available in the current runtime')
  }

  return uniInstance
}

const normalizeBaseUrl = (value?: string) => {
  const normalized = String(value || '').trim().replace(/\/+$/, '')
  return normalized
}

export class AliyunPinDataProvider implements PinDataProvider {
  private readonly localProvider: PinDataProvider
  private readonly storageAdapter: StorageAdapter
  private readonly configResolver: () => AliyunPinApiConfig

  constructor(
    storageAdapter: StorageAdapter = getStorageAdapter(),
    configResolver: () => AliyunPinApiConfig = getAliyunPinApiConfig
  ) {
    this.storageAdapter = storageAdapter
    this.configResolver = configResolver
    this.localProvider = new LocalPinDataProvider(this.storageAdapter)
  }

  private get config() {
    return this.configResolver()
  }

  private get shouldFallbackToLocal() {
    return this.config.fallbackToLocal !== false
  }

  private get baseUrl() {
    return normalizeBaseUrl(this.config.baseUrl)
  }

  private buildHeaders() {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    }

    if (this.config.apiKey) {
      headers['x-pin-api-key'] = this.config.apiKey
    }

    return headers
  }

  private async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    if (!this.baseUrl) {
      throw new Error('AliyunPinDataProvider baseUrl is not configured')
    }

    const url = `${this.baseUrl}${path}`
    const uni = getUni()

    return await new Promise<T>((resolve, reject) => {
      uni.request({
        url,
        method,
        data: body,
        timeout: this.config.timeoutMs || 10000,
        header: this.buildHeaders(),
        success: (response: { statusCode?: number; data?: AliyunApiResponse<T> | T }) => {
          const statusCode = Number(response?.statusCode || 0)
          const payload = response?.data

          if (statusCode >= 200 && statusCode < 300) {
            if (payload && typeof payload === 'object' && 'success' in payload) {
              const apiPayload = payload as AliyunApiResponse<T>
              if (apiPayload.success === false) {
                reject(new Error(apiPayload.message || `Aliyun API request failed: ${path}`))
                return
              }
              resolve(apiPayload.data as T)
              return
            }

            resolve(payload as T)
            return
          }

          reject(new Error(`Aliyun API request failed with status ${statusCode}: ${path}`))
        },
        fail: (error: { errMsg?: string }) => {
          reject(new Error(error?.errMsg || `Aliyun API request failed: ${path}`))
        },
      })
    })
  }

  private async withFallback<T>(
    remoteTask: () => Promise<T>,
    localTask: () => Promise<T>
  ): Promise<T> {
    try {
      return await remoteTask()
    } catch (error) {
      if (!this.shouldFallbackToLocal) {
        throw error
      }
      return await localTask()
    }
  }

  getCurrentUser(): Promise<UserProfile | null> {
    return this.withFallback(
      () => this.request<UserProfile | null>('GET', '/users/current'),
      () => this.localProvider.getCurrentUser()
    )
  }

  setCurrentUser(user: UserProfile | null): Promise<void> {
    return this.withFallback(
      () => this.request<void>('PUT', '/users/current', { user }),
      () => this.localProvider.setCurrentUser(user)
    )
  }

  removeCurrentUser(): Promise<void> {
    return this.withFallback(
      () => this.request<void>('DELETE', '/users/current'),
      () => this.localProvider.removeCurrentUser()
    )
  }

  getUserList(): Promise<UserProfile[]> {
    return this.withFallback(
      () => this.request<UserProfile[]>('GET', '/users'),
      () => this.localProvider.getUserList()
    )
  }

  setUserList(users: UserProfile[]): Promise<void> {
    return this.withFallback(
      () => this.request<void>('PUT', '/users', { users }),
      () => this.localProvider.setUserList(users)
    )
  }

  getPoints(): Promise<number> {
    return this.withFallback(
      () => this.request<number>('GET', '/points/balance'),
      () => this.localProvider.getPoints()
    )
  }

  setPoints(points: number): Promise<void> {
    return this.withFallback(
      () => this.request<void>('PUT', '/points/balance', { points }),
      () => this.localProvider.setPoints(points)
    )
  }

  getPointsRecords(): Promise<PointsRecord[]> {
    return this.withFallback(
      () => this.request<PointsRecord[]>('GET', '/points/records'),
      () => this.localProvider.getPointsRecords()
    )
  }

  setPointsRecords(records: PointsRecord[]): Promise<void> {
    return this.withFallback(
      () => this.request<void>('PUT', '/points/records', { records }),
      () => this.localProvider.setPointsRecords(records)
    )
  }

  getProjects(): Promise<ProjectRecord[]> {
    return this.withFallback(
      () => this.request<ProjectRecord[]>('GET', '/projects'),
      () => this.localProvider.getProjects()
    )
  }

  setProjects(projects: ProjectRecord[]): Promise<void> {
    return this.withFallback(
      () => this.request<void>('PUT', '/projects', { projects }),
      () => this.localProvider.setProjects(projects)
    )
  }

  getFolders(): Promise<FolderRecord[]> {
    return this.withFallback(
      () => this.request<FolderRecord[]>('GET', '/folders'),
      () => this.localProvider.getFolders()
    )
  }

  setFolders(folders: FolderRecord[]): Promise<void> {
    return this.withFallback(
      () => this.request<void>('PUT', '/folders', { folders }),
      () => this.localProvider.setFolders(folders)
    )
  }

  getRecentImports(): Promise<RecentImportRecord[]> {
    return this.withFallback(
      () => this.request<RecentImportRecord[]>('GET', '/recent-imports'),
      () => this.localProvider.getRecentImports()
    )
  }

  setRecentImports(records: RecentImportRecord[]): Promise<void> {
    return this.withFallback(
      () => this.request<void>('PUT', '/recent-imports', { records }),
      () => this.localProvider.setRecentImports(records)
    )
  }

  getArtworks(): Promise<CommunityArtwork[]> {
    return this.withFallback(
      () => this.request<CommunityArtwork[]>('GET', '/artworks'),
      () => this.localProvider.getArtworks()
    )
  }

  setArtworks(artworks: CommunityArtwork[]): Promise<void> {
    return this.withFallback(
      () => this.request<void>('PUT', '/artworks', { artworks }),
      () => this.localProvider.setArtworks(artworks)
    )
  }

  getArtworksVersion(): Promise<string> {
    return this.withFallback(
      () => this.request<string>('GET', '/artworks/version'),
      () => this.localProvider.getArtworksVersion()
    )
  }

  setArtworksVersion(version: string): Promise<void> {
    return this.withFallback(
      () => this.request<void>('PUT', '/artworks/version', { version }),
      () => this.localProvider.setArtworksVersion(version)
    )
  }

  getLikedArtworkIds(): Promise<string[]> {
    return this.withFallback(
      () => this.request<string[]>('GET', '/relations/liked-artworks'),
      () => this.localProvider.getLikedArtworkIds()
    )
  }

  setLikedArtworkIds(ids: string[]): Promise<void> {
    return this.withFallback(
      () => this.request<void>('PUT', '/relations/liked-artworks', { ids }),
      () => this.localProvider.setLikedArtworkIds(ids)
    )
  }

  getFavoritedArtworkIds(): Promise<string[]> {
    return this.withFallback(
      () => this.request<string[]>('GET', '/relations/favorited-artworks'),
      () => this.localProvider.getFavoritedArtworkIds()
    )
  }

  setFavoritedArtworkIds(ids: string[]): Promise<void> {
    return this.withFallback(
      () => this.request<void>('PUT', '/relations/favorited-artworks', { ids }),
      () => this.localProvider.setFavoritedArtworkIds(ids)
    )
  }

  getPurchasedArtworkIds(): Promise<string[]> {
    return this.withFallback(
      () => this.request<string[]>('GET', '/relations/purchased-artworks'),
      () => this.localProvider.getPurchasedArtworkIds()
    )
  }

  setPurchasedArtworkIds(ids: string[]): Promise<void> {
    return this.withFallback(
      () => this.request<void>('PUT', '/relations/purchased-artworks', { ids }),
      () => this.localProvider.setPurchasedArtworkIds(ids)
    )
  }

  getFollowedCreators(): Promise<string[]> {
    return this.withFallback(
      () => this.request<string[]>('GET', '/relations/followed-creators'),
      () => this.localProvider.getFollowedCreators()
    )
  }

  setFollowedCreators(creators: string[]): Promise<void> {
    return this.withFallback(
      () => this.request<void>('PUT', '/relations/followed-creators', { creators }),
      () => this.localProvider.setFollowedCreators(creators)
    )
  }

  getSearchHistory(): Promise<string[]> {
    return this.withFallback(
      () => this.request<string[]>('GET', '/search-history'),
      () => this.localProvider.getSearchHistory()
    )
  }

  setSearchHistory(history: string[]): Promise<void> {
    return this.withFallback(
      () => this.request<void>('PUT', '/search-history', { history }),
      () => this.localProvider.setSearchHistory(history)
    )
  }

  getSettings(): Promise<Partial<SettingsRecord>> {
    return this.withFallback(
      () => this.request<Partial<SettingsRecord>>('GET', '/settings'),
      () => this.localProvider.getSettings()
    )
  }

  setSettings(settings: Partial<SettingsRecord>): Promise<void> {
    return this.withFallback(
      () => this.request<void>('PUT', '/settings', { settings }),
      () => this.localProvider.setSettings(settings)
    )
  }

  removeKeys(keys: string[]): Promise<void> {
    return this.withFallback(
      () => this.request<void>('POST', '/storage/remove-keys', { keys }),
      () => this.localProvider.removeKeys(keys)
    )
  }

  clearAll(): Promise<void> {
    return this.withFallback(
      () => this.request<void>('POST', '/storage/clear-all'),
      () => this.localProvider.clearAll()
    )
  }
}
