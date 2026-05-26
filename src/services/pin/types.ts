import type { PinDataProvider } from './provider.ts'

export interface ProjectTags {
  primary?: string
  secondary?: string
}

export type BeadStyle = 'square' | 'round'

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
  beadStyle?: BeadStyle
  showColorCode?: boolean
  extensions?: Record<string, unknown>
}

export interface UserProfile {
  uid: string
  username: string
  avatar: string
  createdAt: number
  following?: string[]
  bio?: string
  extensions?: Record<string, unknown>
}

export interface ProjectRecord {
  id: string
  name: string
  canvasData: CanvasDataLike
  createdAt: number
  updatedAt: number
  thumbnail: string
  folderId?: string
  tags?: ProjectTags
  isPublished?: boolean
  isOffShelf?: boolean
  publishedArtworkId?: string
  publishPoints?: number
  extensions?: Record<string, unknown>
}

export interface FolderRecord {
  id: string
  name: string
  parentId?: string
  createdAt: number
  updatedAt: number
  extensions?: Record<string, unknown>
}

export interface PointsRecord {
  id: string
  title: string
  amount: number
  time: number
}

export interface RecentImportRecord {
  id: string
  projectId: string
  name: string
  importedAt: number
}

export interface SettingsRecord {
  pushEnabled: boolean
  emailEnabled: boolean
  followerNotify: boolean
  favoriteNotify: boolean
  publicWorks: boolean
  allowMessage: boolean
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
  extensions?: Record<string, unknown>
}

export type SearchEntryType = 'project' | 'folder'

export interface ProjectSearchEntry {
  id: string
  type: SearchEntryType
  name: string
  subtitle: string
  folderId?: string
  extra: string
}

export interface ArtworkInteractionState {
  isLiked: boolean
  isFavorited: boolean
  isPurchased: boolean
  isFollowing: boolean
}

export interface ArtworkToggleResult {
  added: boolean
  artwork: CommunityArtwork | null
}

export type PurchaseFailureReason = 'NOT_FOUND' | 'ALREADY_PURCHASED' | 'INSUFFICIENT_POINTS'

export interface PurchaseArtworkSuccess {
  success: true
  artwork: CommunityArtwork
  balance: number
}

export interface PurchaseArtworkFailure {
  success: false
  reason: PurchaseFailureReason
  artwork?: CommunityArtwork
  balance: number
}

export type PurchaseArtworkResult = PurchaseArtworkSuccess | PurchaseArtworkFailure

export interface PinAuthService {
  getCurrentUser(): Promise<UserProfile | null>
  getUserList(): Promise<UserProfile[]>
  getLastUser(): Promise<UserProfile | null>
  isLoggedIn(): Promise<boolean>
  quickLogin(user?: UserProfile): Promise<UserProfile>
  register(username: string): Promise<UserProfile>
  updateCurrentUser(
    patch: Partial<UserProfile> | ((user: UserProfile) => UserProfile)
  ): Promise<UserProfile | null>
  getSettings(): Promise<SettingsRecord>
  setSettings(settings: Partial<SettingsRecord>): Promise<SettingsRecord>
  clearCache(): Promise<void>
  logout(): Promise<void>
  deleteAccount(): Promise<void>
}

export interface PinPointsService {
  getPointsBalance(): Promise<number>
  setPointsBalance(points: number): Promise<void>
  ensureInitialPoints(): Promise<number>
  getRecords(): Promise<PointsRecord[]>
  getDisplayRecords(): Promise<PointsRecord[]>
  addRecord(title: string, amount: number): Promise<PointsRecord>
}

export interface PinCommunityService {
  ensureArtworks(): Promise<CommunityArtwork[]>
  replaceArtworks(artworks: CommunityArtwork[]): Promise<CommunityArtwork[]>
  getArtworkById(id: string): Promise<CommunityArtwork | null>
  updateArtwork(
    id: string,
    updater: (artwork: CommunityArtwork) => CommunityArtwork
  ): Promise<CommunityArtwork | null>
  getLikedArtworkIds(): Promise<string[]>
  getFavoritedArtworkIds(): Promise<string[]>
  getPurchasedArtworkIds(): Promise<string[]>
  getFollowedCreators(): Promise<string[]>
  getInteractionState(artworkId: string, creatorName: string): Promise<ArtworkInteractionState>
  toggleLike(artworkId: string): Promise<ArtworkToggleResult>
  toggleFavorite(artworkId: string): Promise<ArtworkToggleResult>
  toggleFollow(creatorName: string): Promise<boolean>
  getCollection(type: 'favorites' | 'likes'): Promise<CommunityArtwork[]>
  publishProjectAsArtwork(project: ProjectRecord, points: number): Promise<CommunityArtwork>
  syncProjectArtwork(project: ProjectRecord): Promise<CommunityArtwork | null>
  unpublishProjectArtwork(projectId: string): Promise<CommunityArtwork | null>
}

export interface PinProjectService {
  getProjects(): Promise<ProjectRecord[]>
  saveProjects(projects: ProjectRecord[]): Promise<ProjectRecord[]>
  getProjectById(projectId: string): Promise<ProjectRecord | undefined>
  getFolders(): Promise<FolderRecord[]>
  saveFolders(folders: FolderRecord[]): Promise<FolderRecord[]>
  getRecentImports(limit?: number): Promise<RecentImportRecord[]>
  saveRecentImport(payload: { projectId: string; name: string }): Promise<RecentImportRecord[]>
  getProjectOwnerName(): Promise<string>
  getSearchHistory(): Promise<string[]>
  saveSearchHistory(history: string[]): Promise<string[]>
  clearSearchHistory(): Promise<void>
  getProjectSearchEntries(): Promise<ProjectSearchEntry[]>
}

export interface PinPurchaseService {
  purchaseArtwork(artworkId: string): Promise<PurchaseArtworkResult>
}

export interface PinServices {
  provider: PinDataProvider
  authService: PinAuthService
  pointsService: PinPointsService
  communityService: PinCommunityService
  projectService: PinProjectService
  purchaseService: PinPurchaseService
}
