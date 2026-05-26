export const PIN_STORAGE_KEYS = {
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
  recentImports: 'pin_recent_imports',
  searchHistory: 'pin_search_history',
  settings: 'pin_settings',
  favoriteColors: 'pin_favorite_colors',
} as const

export const DELETE_ACCOUNT_KEYS = [
  PIN_STORAGE_KEYS.user,
  PIN_STORAGE_KEYS.projects,
  PIN_STORAGE_KEYS.folders,
  PIN_STORAGE_KEYS.searchHistory,
  PIN_STORAGE_KEYS.favoriteColors,
  PIN_STORAGE_KEYS.recentImports,
  PIN_STORAGE_KEYS.settings,
] as const

export const LOGOUT_KEYS = [
  PIN_STORAGE_KEYS.user,
  PIN_STORAGE_KEYS.points,
] as const
