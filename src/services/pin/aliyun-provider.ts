import { getAliyunPinApiConfig, type AliyunPinApiConfig } from './aliyun-config.ts'
import { h5Request } from './h5-adapter.ts'
import { LocalPinDataProvider } from './local-provider.ts'
import type { PinDataProvider } from './provider.ts'
import { setCurrentUserUid } from './storage-keys.ts'
import { getStorageAdapter, type StorageAdapter } from './storage-adapter.ts'
import type { CommunityArtwork, FolderRecord, PointsRecord, ProjectRecord, RecentImportRecord, SettingsRecord, UserProfile } from './types.ts'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface AliyunApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}

/**
 * 认证响应数据结构
 */
interface AuthResponse {
  user: UserProfile
  token: string
}

/**
 * 标准化 baseUrl
 */
const normalizeBaseUrl = (value?: string) => {
  const normalized = String(value || '').trim().replace(/\/+$/, '')
  return normalized
}

export class AliyunPinDataProvider implements PinDataProvider {
  private readonly localProvider: PinDataProvider
  private readonly storageAdapter: StorageAdapter
  private readonly configResolver: () => AliyunPinApiConfig
  private _token: string | null = null

  constructor(
    storageAdapter: StorageAdapter = getStorageAdapter(),
    configResolver: () => AliyunPinApiConfig = getAliyunPinApiConfig
  ) {
    this.storageAdapter = storageAdapter
    this.configResolver = configResolver
    this.localProvider = new LocalPinDataProvider(this.storageAdapter)

    // 从存储恢复 Token
    this.loadToken()
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

  /**
   * 加载存储的 Token
   */
  private loadToken() {
    try {
      const token = this.storageAdapter.getItem('pin_auth_token')
      if (token && typeof token === 'string') {
        this._token = token
      }
    } catch (e) {
      console.warn('Failed to load token:', e)
    }
  }

  /**
   * 保存 Token 到存储
   */
  private saveToken(token: string | null) {
    this._token = token
    try {
      if (token) {
        this.storageAdapter.setItem('pin_auth_token', token)
      } else {
        this.storageAdapter.removeItem('pin_auth_token')
      }
    } catch (e) {
      console.warn('Failed to save token:', e)
    }
  }

  /**
   * 获取当前 Token
   */
  getToken(): string | null {
    return this._token
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return !!this._token
  }

  /**
   * 构建请求头
   */
  private buildHeaders() {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    }

    if (this.config.apiKey) {
      headers['x-pin-api-key'] = this.config.apiKey
    }

    // 添加认证 Token
    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`
    }

    return headers
  }

  /**
   * 发起请求
   * 使用 h5Request 兼容 H5 生产构建环境
   */
  private async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    if (!this.baseUrl) {
      throw new Error('AliyunPinDataProvider baseUrl is not configured')
    }

    const url = `${this.baseUrl}${path}`

    return await new Promise<T>((resolve, reject) => {
      h5Request({
        url,
        method,
        data: body,
        timeout: this.config.timeoutMs || 10000,
        header: this.buildHeaders(),
        success: (response: { statusCode: number; data: unknown }) => {
          const statusCode = Number(response?.statusCode || 0)
          const payload = response?.data

          if (statusCode >= 200 && statusCode < 300) {
            if (payload && typeof payload === 'object' && 'success' in (payload as Record<string, unknown>)) {
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
        fail: (error: { errMsg: string }) => {
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

  // ============================================
  // 认证相关方法
  // ============================================

  /**
   * 用户注册
   * @param username 用户名
   * @param password 密码
   * @param email 邮箱
   * @param nickname 昵称（可选）
   */
  async register(username: string, password: string, email: string, nickname?: string): Promise<UserProfile> {
    const response = await this.request<AuthResponse>('POST', '/auth/register', {
      username,
      password,
      email,
      nickname,
    })

    // 保存 Token
    this.saveToken(response.token)

    // 设置当前用户到本地存储（兼容本地模式）
    await this.localProvider.setCurrentUser(response.user)

    // 设置用户 UID 用于存储隔离
    if (response.user?.uid) {
      setCurrentUserUid(response.user.uid)
    }

    return response.user
  }

  /**
   * 用户登录
   * @param username 用户名
   * @param password 密码
   */
  async login(username: string, password: string): Promise<UserProfile> {
    const response = await this.request<AuthResponse>('POST', '/auth/login', {
      username,
      password,
    })

    // 保存 Token
    this.saveToken(response.token)

    // 设置当前用户到本地存储（兼容本地模式）
    await this.localProvider.setCurrentUser(response.user)

    // 设置用户 UID 用于存储隔离
    if (response.user?.uid) {
      setCurrentUserUid(response.user.uid)
    }

    return response.user
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    this.saveToken(null)
    await this.localProvider.removeCurrentUser()
    // 清除用户 UID，恢复未登录状态的存储键
    setCurrentUserUid(null)
  }

  /**
   * 获取当前用户（通过 Token 验证）
   */
  async getCurrentUserByToken(): Promise<UserProfile | null> {
    if (!this._token) {
      return null
    }

    try {
      const response = await this.request<{ user: UserProfile }>('GET', '/auth/me')
      return response.user
    } catch (error) {
      // Token 无效或过期
      this.saveToken(null)
      return null
    }
  }

  // ============================================
  // 数据操作方法（原有）
  // ============================================

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
