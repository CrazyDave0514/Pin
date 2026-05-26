export const DEFAULT_PRESET_AVATAR = 'preset:rat'

export const isPresetAvatarValue = (value?: string) => {
  return typeof value === 'string' && value.startsWith('preset:')
}

export const normalizeAvatarValue = (value?: string) => {
  if (!value) return DEFAULT_PRESET_AVATAR
  if (isPresetAvatarValue(value)) return value
  if (value.includes('/static/assets/v017/avatars/avatar-rat.png')) return DEFAULT_PRESET_AVATAR
  if (value.includes('/static/assets/v017/avatars/avatar-ox.png')) return 'preset:ox'
  if (value.includes('/static/assets/v017/avatars/avatar-tiger.png')) return 'preset:tiger'
  if (value.includes('/static/assets/v017/avatars/avatar-rabbit.png')) return 'preset:rabbit'
  if (value.includes('/static/assets/v017/avatars/avatar-dragon.png')) return 'preset:dragon'
  if (value.includes('/static/assets/v017/avatars/avatar-snake.png')) return 'preset:snake'
  if (value.includes('/static/assets/v017/avatars/avatar-horse.png')) return 'preset:horse'
  if (value.includes('/static/assets/v017/avatars/avatar-goat.png')) return 'preset:goat'
  if (value.includes('/static/assets/v017/avatars/avatar-monkey.png')) return 'preset:monkey'
  if (value.includes('/static/assets/v017/avatars/avatar-rooster.png')) return 'preset:rooster'
  if (value.includes('/static/assets/v017/avatars/avatar-dog.png')) return 'preset:dog'
  if (value.includes('/static/assets/v017/avatars/avatar-pig.png')) return 'preset:pig'
  if (value.includes('/static/assets/v017/avatars/avatar-rat.svg')) return DEFAULT_PRESET_AVATAR
  if (value.includes('/static/assets/v017/avatars/avatar-ox.svg')) return 'preset:ox'
  if (value.includes('/static/assets/v017/avatars/avatar-tiger.svg')) return 'preset:tiger'
  if (value.includes('/static/assets/v017/avatars/avatar-rabbit.svg')) return 'preset:rabbit'
  if (value.includes('/static/assets/v017/avatars/avatar-dragon.svg')) return 'preset:dragon'
  if (value.includes('/static/assets/v017/avatars/avatar-snake.svg')) return 'preset:snake'
  if (value.includes('/static/assets/v017/avatars/avatar-horse.svg')) return 'preset:horse'
  if (value.includes('/static/assets/v017/avatars/avatar-goat.svg')) return 'preset:goat'
  if (value.includes('/static/assets/v017/avatars/avatar-monkey.svg')) return 'preset:monkey'
  if (value.includes('/static/assets/v017/avatars/avatar-rooster.svg')) return 'preset:rooster'
  if (value.includes('/static/assets/v017/avatars/avatar-dog.svg')) return 'preset:dog'
  if (value.includes('/static/assets/v017/avatars/avatar-pig.svg')) return 'preset:pig'
  return value
}
