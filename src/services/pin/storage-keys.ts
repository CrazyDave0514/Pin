/**
 * 存储键常量定义
 */

/**
 * 基础存储键（无用户前缀）
 */
export const PIN_STORAGE_BASE_KEYS = {
  user: 'pin_user',
  userList: 'pin_user_list',
  points: 'pin_points',
  pointsRecords: 'pin_points_records',
  projects: 'pin_projects',
  folders: 'pin_folders',
  artworks: 'pin_artworks',
  artworksVersion: 'pin_artworks_version',
  likedArtworks: 'pin_liked_artworks',
  favoritedArtworks: 'pin_favorited_artworks',
  purchasedArtworks: 'pin_purchased_artworks',
  followedCreators: 'pin_followed_creators',
  blockedCreators: 'pin_blocked_creators',
  recentImports: 'pin_recent_imports',
  searchHistory: 'pin_search_history',
  settings: 'pin_settings',
  favoriteColors: 'pin_favorite_colors',
} as const

/**
 * 当前用户 UID（用于生成用户隔离的存储键）
 */
let currentUserUid: string | null = null

/**
 * 设置当前用户 UID
 */
export const setCurrentUserUid = (uid: string | null) => {
  currentUserUid = uid
}

/**
 * 获取当前用户 UID
 */
export const getCurrentUserUid = (): string | null => currentUserUid

/**
 * 生成用户隔离的存储键
 * 已登录用户：pin_projects:{uid}
 * 未登录用户：pin_projects
 */
const createUserScopedKey = (baseKey: string): string => {
  if (currentUserUid) {
    return `${baseKey}:${currentUserUid}`
  }
  return baseKey
}

/**
 * 用户隔离的存储键
 * 根据当前登录状态自动添加用户前缀
 */
export const PIN_STORAGE_KEYS = {
  get user() { return PIN_STORAGE_BASE_KEYS.user },
  get userList() { return PIN_STORAGE_BASE_KEYS.userList },
  get points() { return createUserScopedKey(PIN_STORAGE_BASE_KEYS.points) },
  get pointsRecords() { return createUserScopedKey(PIN_STORAGE_BASE_KEYS.pointsRecords) },
  get projects() { return createUserScopedKey(PIN_STORAGE_BASE_KEYS.projects) },
  get folders() { return createUserScopedKey(PIN_STORAGE_BASE_KEYS.folders) },
  get artworks() { return createUserScopedKey(PIN_STORAGE_BASE_KEYS.artworks) },
  get artworksVersion() { return createUserScopedKey(PIN_STORAGE_BASE_KEYS.artworksVersion) },
  get likedArtworks() { return createUserScopedKey(PIN_STORAGE_BASE_KEYS.likedArtworks) },
  get favoritedArtworks() { return createUserScopedKey(PIN_STORAGE_BASE_KEYS.favoritedArtworks) },
  get purchasedArtworks() { return createUserScopedKey(PIN_STORAGE_BASE_KEYS.purchasedArtworks) },
  get followedCreators() { return createUserScopedKey(PIN_STORAGE_BASE_KEYS.followedCreators) },
  get blockedCreators() { return createUserScopedKey(PIN_STORAGE_BASE_KEYS.blockedCreators) },
  get recentImports() { return createUserScopedKey(PIN_STORAGE_BASE_KEYS.recentImports) },
  get searchHistory() { return createUserScopedKey(PIN_STORAGE_BASE_KEYS.searchHistory) },
  get settings() { return createUserScopedKey(PIN_STORAGE_BASE_KEYS.settings) },
  get favoriteColors() { return createUserScopedKey(PIN_STORAGE_BASE_KEYS.favoriteColors) },
} as const

/**
 * 注销账号时需要删除的键
 */
export const DELETE_ACCOUNT_KEYS = [
  PIN_STORAGE_BASE_KEYS.user,
  PIN_STORAGE_BASE_KEYS.projects,
  PIN_STORAGE_BASE_KEYS.folders,
  PIN_STORAGE_BASE_KEYS.searchHistory,
  PIN_STORAGE_BASE_KEYS.favoriteColors,
  PIN_STORAGE_BASE_KEYS.recentImports,
  PIN_STORAGE_BASE_KEYS.settings,
] as const

/**
 * 退出登录时需要删除的键
 */
export const LOGOUT_KEYS = [
  PIN_STORAGE_BASE_KEYS.user,
  PIN_STORAGE_BASE_KEYS.points,
] as const

/**
 * 获取所有用户隔离的存储键模式（用于清理）
 * 返回形如 ['pin_projects:', 'pin_folders:'] 的前缀数组
 */
export const getUserScopedKeyPrefixes = (): string[] => {
  const userScopedBaseKeys = [
    PIN_STORAGE_BASE_KEYS.projects,
    PIN_STORAGE_BASE_KEYS.folders,
    PIN_STORAGE_BASE_KEYS.points,
    PIN_STORAGE_BASE_KEYS.pointsRecords,
    PIN_STORAGE_BASE_KEYS.likedArtworks,
    PIN_STORAGE_BASE_KEYS.favoritedArtworks,
    PIN_STORAGE_BASE_KEYS.purchasedArtworks,
    PIN_STORAGE_BASE_KEYS.followedCreators,
    PIN_STORAGE_BASE_KEYS.blockedCreators,
    PIN_STORAGE_BASE_KEYS.recentImports,
    PIN_STORAGE_BASE_KEYS.searchHistory,
    PIN_STORAGE_BASE_KEYS.settings,
    PIN_STORAGE_BASE_KEYS.favoriteColors,
  ]
  return userScopedBaseKeys.map(key => `${key}:`)
}
