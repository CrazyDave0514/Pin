export type PresetAvatarKey =
  | 'rat'
  | 'ox'
  | 'tiger'
  | 'rabbit'
  | 'dragon'
  | 'snake'
  | 'horse'
  | 'goat'
  | 'monkey'
  | 'rooster'
  | 'dog'
  | 'pig'

export type PresetAvatarMeta = {
  key: PresetAvatarKey
  label: string
  glyph: string
  image: string
  bg: string
  fg: string
}

export const PRESET_AVATARS: PresetAvatarMeta[] = [
  { key: 'rat', label: '鼠', glyph: '鼠', image: '/static/assets/v017/avatars/avatar-rat.png', bg: '#FFE3DA', fg: '#B56A58' },
  { key: 'ox', label: '牛', glyph: '牛', image: '/static/assets/v017/avatars/avatar-ox.png', bg: '#E8F3E4', fg: '#6F8A63' },
  { key: 'tiger', label: '虎', glyph: '虎', image: '/static/assets/v017/avatars/avatar-tiger.png', bg: '#FFE8C8', fg: '#AF6A1F' },
  { key: 'rabbit', label: '兔', glyph: '兔', image: '/static/assets/v017/avatars/avatar-rabbit.png', bg: '#FCE6F0', fg: '#C06A8F' },
  { key: 'dragon', label: '龙', glyph: '龙', image: '/static/assets/v017/avatars/avatar-dragon.png', bg: '#E8F0FF', fg: '#627EC9' },
  { key: 'snake', label: '蛇', glyph: '蛇', image: '/static/assets/v017/avatars/avatar-snake.png', bg: '#E8F7E7', fg: '#648C63' },
  { key: 'horse', label: '马', glyph: '马', image: '/static/assets/v017/avatars/avatar-horse.png', bg: '#FFF0D9', fg: '#B67B3D' },
  { key: 'goat', label: '羊', glyph: '羊', image: '/static/assets/v017/avatars/avatar-goat.png', bg: '#F6F0E5', fg: '#8F7A5C' },
  { key: 'monkey', label: '猴', glyph: '猴', image: '/static/assets/v017/avatars/avatar-monkey.png', bg: '#F4E1D0', fg: '#9D6B44' },
  { key: 'rooster', label: '鸡', glyph: '鸡', image: '/static/assets/v017/avatars/avatar-rooster.png', bg: '#FFF2DA', fg: '#B47A32' },
  { key: 'dog', label: '狗', glyph: '狗', image: '/static/assets/v017/avatars/avatar-dog.png', bg: '#F6E6DA', fg: '#9B6E4E' },
  { key: 'pig', label: '猪', glyph: '猪', image: '/static/assets/v017/avatars/avatar-pig.png', bg: '#FDE5EC', fg: '#B7748E' },
]

const PRESET_AVATAR_MAP = PRESET_AVATARS.reduce<Record<string, PresetAvatarMeta>>((acc, item) => {
  acc[item.key] = item
  return acc
}, {})

export const DEFAULT_PRESET_AVATAR = 'preset:rat'

export const isPresetAvatarValue = (value?: string) => {
  return typeof value === 'string' && value.startsWith('preset:')
}

export const getPresetAvatarMeta = (value?: string) => {
  if (!isPresetAvatarValue(value)) return null
  return PRESET_AVATAR_MAP[value.replace('preset:', '')] || null
}

export const getPresetAvatarImage = (value?: string) => {
  return getPresetAvatarMeta(value)?.image || ''
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
