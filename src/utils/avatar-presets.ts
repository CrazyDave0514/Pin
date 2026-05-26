import avatarRat from '../../static/assets/v017/avatars/avatar-rat.png'
import avatarOx from '../../static/assets/v017/avatars/avatar-ox.png'
import avatarTiger from '../../static/assets/v017/avatars/avatar-tiger.png'
import avatarRabbit from '../../static/assets/v017/avatars/avatar-rabbit.png'
import avatarDragon from '../../static/assets/v017/avatars/avatar-dragon.png'
import avatarSnake from '../../static/assets/v017/avatars/avatar-snake.png'
import avatarHorse from '../../static/assets/v017/avatars/avatar-horse.png'
import avatarGoat from '../../static/assets/v017/avatars/avatar-goat.png'
import avatarMonkey from '../../static/assets/v017/avatars/avatar-monkey.png'
import avatarRooster from '../../static/assets/v017/avatars/avatar-rooster.png'
import avatarDog from '../../static/assets/v017/avatars/avatar-dog.png'
import avatarPig from '../../static/assets/v017/avatars/avatar-pig.png'
import { isPresetAvatarValue } from './avatar-normalize'

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
  { key: 'rat', label: '鼠', glyph: '鼠', image: avatarRat, bg: '#FFE3DA', fg: '#B56A58' },
  { key: 'ox', label: '牛', glyph: '牛', image: avatarOx, bg: '#E8F3E4', fg: '#6F8A63' },
  { key: 'tiger', label: '虎', glyph: '虎', image: avatarTiger, bg: '#FFE8C8', fg: '#AF6A1F' },
  { key: 'rabbit', label: '兔', glyph: '兔', image: avatarRabbit, bg: '#FCE6F0', fg: '#C06A8F' },
  { key: 'dragon', label: '龙', glyph: '龙', image: avatarDragon, bg: '#E8F0FF', fg: '#627EC9' },
  { key: 'snake', label: '蛇', glyph: '蛇', image: avatarSnake, bg: '#E8F7E7', fg: '#648C63' },
  { key: 'horse', label: '马', glyph: '马', image: avatarHorse, bg: '#FFF0D9', fg: '#B67B3D' },
  { key: 'goat', label: '羊', glyph: '羊', image: avatarGoat, bg: '#F6F0E5', fg: '#8F7A5C' },
  { key: 'monkey', label: '猴', glyph: '猴', image: avatarMonkey, bg: '#F4E1D0', fg: '#9D6B44' },
  { key: 'rooster', label: '鸡', glyph: '鸡', image: avatarRooster, bg: '#FFF2DA', fg: '#B47A32' },
  { key: 'dog', label: '狗', glyph: '狗', image: avatarDog, bg: '#F6E6DA', fg: '#9B6E4E' },
  { key: 'pig', label: '猪', glyph: '猪', image: avatarPig, bg: '#FDE5EC', fg: '#B7748E' },
]

const PRESET_AVATAR_MAP = PRESET_AVATARS.reduce<Record<string, PresetAvatarMeta>>((acc, item) => {
  acc[item.key] = item
  return acc
}, {})

export { DEFAULT_PRESET_AVATAR, isPresetAvatarValue, normalizeAvatarValue } from './avatar-normalize'

export const getPresetAvatarMeta = (value?: string) => {
  if (!isPresetAvatarValue(value)) return null
  return PRESET_AVATAR_MAP[value.replace('preset:', '')] || null
}

export const getPresetAvatarImage = (value?: string) => {
  return getPresetAvatarMeta(value)?.image || ''
}
