import { PIN_STORAGE_KEYS, setCurrentUserUid } from './storage-keys.ts'
import type { PinDataProvider } from './provider.ts'
import type { CommunityArtwork, FolderRecord, PointsRecord, ProjectRecord, RecentImportRecord, SettingsRecord, UserProfile } from './types.ts'
import type { StorageAdapter } from './storage-adapter.ts'
import { safeArray } from '../../utils/array-utils.ts'

const safeObject = <T extends object>(value: unknown): T | undefined => value && typeof value === 'object' ? (value as T) : undefined

export class LocalPinDataProvider implements PinDataProvider {
  private readonly storageAdapter: StorageAdapter

  constructor(storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
    // 初始化时恢复用户 UID（如果已登录）
    this.restoreUserUid()
  }

  /**
   * 从存储中恢复用户 UID
   */
  private restoreUserUid(): void {
    const user = this.storageAdapter.getSync<UserProfile>(PIN_STORAGE_KEYS.user)
    if (user?.uid) {
      setCurrentUserUid(user.uid)
    }
  }

  private getValue<T>(key: string, fallback: T): T {
    const value = this.storageAdapter.getSync<T>(key)
    return value === undefined ? fallback : value
  }

  private setValue<T>(key: string, value: T) {
    this.storageAdapter.setSync(key, value)
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    return this.getValue<UserProfile | null>(PIN_STORAGE_KEYS.user, null)
  }

  async setCurrentUser(user: UserProfile | null): Promise<void> {
    if (!user) {
      this.storageAdapter.removeSync(PIN_STORAGE_KEYS.user)
      // 清除用户 UID
      setCurrentUserUid(null)
      return
    }
    this.setValue(PIN_STORAGE_KEYS.user, user)
    // 设置用户 UID 用于存储隔离
    if (user.uid) {
      setCurrentUserUid(user.uid)
    }
  }

  async removeCurrentUser(): Promise<void> {
    this.storageAdapter.removeSync(PIN_STORAGE_KEYS.user)
    // 清除用户 UID
    setCurrentUserUid(null)
  }

  async getUserList(): Promise<UserProfile[]> {
    return safeArray<UserProfile>(this.getValue(PIN_STORAGE_KEYS.userList, []))
  }

  async setUserList(users: UserProfile[]): Promise<void> {
    this.setValue(PIN_STORAGE_KEYS.userList, users)
  }

  async getPoints(): Promise<number> {
    return Number(this.getValue(PIN_STORAGE_KEYS.points, 0) || 0)
  }

  async setPoints(points: number): Promise<void> {
    this.setValue(PIN_STORAGE_KEYS.points, Number(points || 0))
  }

  async getPointsRecords(): Promise<PointsRecord[]> {
    return safeArray<PointsRecord>(this.getValue(PIN_STORAGE_KEYS.pointsRecords, []))
  }

  async setPointsRecords(records: PointsRecord[]): Promise<void> {
    this.setValue(PIN_STORAGE_KEYS.pointsRecords, records)
  }

  async getProjects(): Promise<ProjectRecord[]> {
    return safeArray<ProjectRecord>(this.getValue(PIN_STORAGE_KEYS.projects, []))
  }

  async setProjects(projects: ProjectRecord[]): Promise<void> {
    this.setValue(PIN_STORAGE_KEYS.projects, projects)
  }

  async getFolders(): Promise<FolderRecord[]> {
    return safeArray<FolderRecord>(this.getValue(PIN_STORAGE_KEYS.folders, []))
  }

  async setFolders(folders: FolderRecord[]): Promise<void> {
    this.setValue(PIN_STORAGE_KEYS.folders, folders)
  }

  async getRecentImports(): Promise<RecentImportRecord[]> {
    return safeArray<RecentImportRecord>(this.getValue(PIN_STORAGE_KEYS.recentImports, []))
  }

  async setRecentImports(records: RecentImportRecord[]): Promise<void> {
    this.setValue(PIN_STORAGE_KEYS.recentImports, records)
  }

  async getArtworks(): Promise<CommunityArtwork[]> {
    return safeArray<CommunityArtwork>(this.getValue(PIN_STORAGE_KEYS.artworks, []))
  }

  async setArtworks(artworks: CommunityArtwork[]): Promise<void> {
    this.setValue(PIN_STORAGE_KEYS.artworks, artworks)
  }

  async getArtworksVersion(): Promise<string> {
    return String(this.getValue(PIN_STORAGE_KEYS.artworksVersion, '') || '')
  }

  async setArtworksVersion(version: string): Promise<void> {
    this.setValue(PIN_STORAGE_KEYS.artworksVersion, version)
  }

  async getLikedArtworkIds(): Promise<string[]> {
    return safeArray<string>(this.getValue(PIN_STORAGE_KEYS.likedArtworks, []))
  }

  async setLikedArtworkIds(ids: string[]): Promise<void> {
    this.setValue(PIN_STORAGE_KEYS.likedArtworks, Array.from(new Set(ids)))
  }

  async getFavoritedArtworkIds(): Promise<string[]> {
    return safeArray<string>(this.getValue(PIN_STORAGE_KEYS.favoritedArtworks, []))
  }

  async setFavoritedArtworkIds(ids: string[]): Promise<void> {
    this.setValue(PIN_STORAGE_KEYS.favoritedArtworks, Array.from(new Set(ids)))
  }

  async getPurchasedArtworkIds(): Promise<string[]> {
    return safeArray<string>(this.getValue(PIN_STORAGE_KEYS.purchasedArtworks, []))
  }

  async setPurchasedArtworkIds(ids: string[]): Promise<void> {
    this.setValue(PIN_STORAGE_KEYS.purchasedArtworks, Array.from(new Set(ids)))
  }

  async getFollowedCreators(): Promise<string[]> {
    return safeArray<string>(this.getValue(PIN_STORAGE_KEYS.followedCreators, []))
  }

  async setFollowedCreators(creators: string[]): Promise<void> {
    this.setValue(PIN_STORAGE_KEYS.followedCreators, Array.from(new Set(creators)))
  }

  async getSearchHistory(): Promise<string[]> {
    return safeArray<string>(this.getValue(PIN_STORAGE_KEYS.searchHistory, []))
  }

  async setSearchHistory(history: string[]): Promise<void> {
    this.setValue(PIN_STORAGE_KEYS.searchHistory, history)
  }

  async getSettings(): Promise<Partial<SettingsRecord>> {
    return safeObject<SettingsRecord>(this.getValue(PIN_STORAGE_KEYS.settings, {})) || {}
  }

  async setSettings(settings: Partial<SettingsRecord>): Promise<void> {
    this.setValue(PIN_STORAGE_KEYS.settings, settings)
  }

  async removeKeys(keys: string[]): Promise<void> {
    keys.forEach((key) => this.storageAdapter.removeSync(key))
  }

  async clearAll(): Promise<void> {
    this.storageAdapter.clearSync()
  }
}
