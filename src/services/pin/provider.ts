import { PIN_STORAGE_KEYS } from './storage-keys.ts'
import type { CommunityArtwork, FolderRecord, PointsRecord, ProjectRecord, RecentImportRecord, SettingsRecord, UserProfile } from './types.ts'

export interface PinDataProvider {
  getCurrentUser(): Promise<UserProfile | null>
  setCurrentUser(user: UserProfile | null): Promise<void>
  removeCurrentUser(): Promise<void>
  getUserList(): Promise<UserProfile[]>
  setUserList(users: UserProfile[]): Promise<void>
  getPoints(): Promise<number>
  setPoints(points: number): Promise<void>
  getPointsRecords(): Promise<PointsRecord[]>
  setPointsRecords(records: PointsRecord[]): Promise<void>
  getProjects(): Promise<ProjectRecord[]>
  setProjects(projects: ProjectRecord[]): Promise<void>
  getFolders(): Promise<FolderRecord[]>
  setFolders(folders: FolderRecord[]): Promise<void>
  getRecentImports(): Promise<RecentImportRecord[]>
  setRecentImports(records: RecentImportRecord[]): Promise<void>
  getArtworks(): Promise<CommunityArtwork[]>
  setArtworks(artworks: CommunityArtwork[]): Promise<void>
  getArtworksVersion(): Promise<string>
  setArtworksVersion(version: string): Promise<void>
  getLikedArtworkIds(): Promise<string[]>
  setLikedArtworkIds(ids: string[]): Promise<void>
  getFavoritedArtworkIds(): Promise<string[]>
  setFavoritedArtworkIds(ids: string[]): Promise<void>
  getPurchasedArtworkIds(): Promise<string[]>
  setPurchasedArtworkIds(ids: string[]): Promise<void>
  getFollowedCreators(): Promise<string[]>
  setFollowedCreators(creators: string[]): Promise<void>
  getSearchHistory(): Promise<string[]>
  setSearchHistory(history: string[]): Promise<void>
  getSettings(): Promise<Partial<SettingsRecord>>
  setSettings(settings: Partial<SettingsRecord>): Promise<void>
  removeKeys(keys: string[]): Promise<void>
  clearAll(): Promise<void>
}

export const isPinStorageKey = (value: string) => value.startsWith('pin_')

export { PIN_STORAGE_KEYS }
