/**
 * 生成300条假数据，封面通过颜色方案+种子在客户端动态生成
 * 数据量极小，封面由前端 Canvas 实时渲染
 */

const fs = require('fs')
const path = require('path')

/** 拼豆主题色板（16套） */
const colorPalettes = [
  ['#FF6B6B', '#FF8E8E', '#FFB4B4', '#FFD4D4', '#FFF0F0'],
  ['#4ECDC4', '#6ED5CE', '#8EDED8', '#AEE7E2', '#D0F0EC'],
  ['#45B7D1', '#65C3D9', '#85CFE1', '#A5DBE9', '#C5E7F1'],
  ['#96CEB4', '#A6D6BE', '#B6DEC8', '#C6E6D2', '#D6EEDC'],
  ['#FFEAA7', '#FFEDBA', '#FFF0CD', '#FFF4E0', '#FFF8F0'],
  ['#DDA0DD', '#E3B0E3', '#E9C0E9', '#EFD0EF', '#F5E0F5'],
  ['#F39C12', '#F5AD2E', '#F7BE4A', '#F9CF66', '#FBE082'],
  ['#E74C3C', '#EC6356', '#F17A70', '#F6918A', '#FBA8A4'],
  ['#3498DB', '#52A3DE', '#70AEE1', '#8EB9E4', '#ACC4E7'],
  ['#2ECC71', '#4DD485', '#6CDC99', '#8BE4AD', '#AAECC1'],
  ['#E91E63', '#EC407A', '#EF6291', '#F284A8', '#F5A6BF'],
  ['#9B59B6', '#A96DC0', '#B781CA', '#C595D4', '#D3A9DE'],
  ['#1ABC9C', '#3AB8A8', '#5AC4B4', '#7AD0C0', '#9ADCCC'],
  ['#F1C40F', '#F3CD3B', '#F5D667', '#F7DF93', '#F9E8BF'],
  ['#E67E22', '#EA903A', '#EEA252', '#F2B46A', '#F6C682'],
  ['#8E44AD', '#9D56B8', '#AC68C3', '#BB7ACE', '#CA8CD9'],
]

/** 图案类型 */
const patternTypes = ['random', 'symmetric', 'circle', 'stripe', 'diamond']

/** 作品名称模板 */
const nameTemplates = [
  '可爱的{emoji}{subject}拼豆图案',
  '梦幻{subject}拼豆作品',
  '{emoji}{subject}拼豆图',
  '精美的{subject}拼豆画',
  '{subject}{emoji}拼豆创作',
  '创意{subject}拼豆设计',
  '{emoji}超萌{subject}拼豆',
  '卡通{subject}拼豆图案',
  '迷你{subject}{emoji}拼豆',
  '{subject}拼豆{emoji}系列',
]

const subjects = [
  '小猫咪', '小狗狗', '小兔子', '小熊', '小企鹅',
  '樱花', '向日葵', '玫瑰花', '郁金香', '薰衣草',
  '独角兽', '小鲸鱼', '小海豚', '蝴蝶', '小瓢虫',
  '小恐龙', '小狮子', '小熊猫', '小考拉', '小狐狸',
  '草莓', '西瓜', '冰淇淋', '蛋糕', '甜甜圈',
  '小星星', '月亮', '彩虹', '云朵', '雪花',
  '小汽车', '小飞机', '火箭', '小船', '自行车',
  '爱心', '小房子', '小树', '蘑菇', '小花朵',
  '皮卡丘', '马里奥', '小黄人', '龙猫', 'HelloKitty',
  '小金鱼', '小乌龟', '小青蛙', '小蜜蜂', '小蜗牛',
]

const emojis = ['', '🌟', '💖', '🌈', '✨', '🎀', '🌸', '⭐', '💝', '🎨']

/** 创作者名称 */
const creators = [
  '豆豆工坊', '手作达人', '拼豆爱好者', '小花', 'Pin官方',
  '拼图小天才', '创意手工坊', '彩虹豆豆', '拼豆大师', '小艺术家',
  '手工达人', '拼拼乐', '豆豆乐园', '像素艺术家', '创意拼豆',
  '手工小铺', '拼豆世界', '豆豆工坊', '彩虹拼豆', '快乐拼豆',
]

/**
 * 生成300条假数据
 */
function generateArtworks() {
  const artworks = []
  const now = Date.now()

  for (let i = 0; i < 300; i++) {
    const seed = (i + 1) * 7919
    const paletteIdx = i % colorPalettes.length
    const patternType = patternTypes[i % patternTypes.length]

    const nameTemplate = nameTemplates[i % nameTemplates.length]
    const subject = subjects[i % subjects.length]
    const emoji = emojis[i % emojis.length]
    const name = nameTemplate.replace('{emoji}', emoji).replace('{subject}', subject)

    const creator = creators[i % creators.length]
    const likes = Math.floor(Math.random() * 5000) + 10
    const points = Math.floor(Math.random() * 50) + 10
    const createdAt = now - Math.floor(Math.random() * 30 * 24 * 3600 * 1000)
    const viewCount = likes * (2 + Math.floor(Math.random() * 3))
    const useCount = Math.floor(likes * (0.05 + Math.random() * 0.15))

    const tagList = ['卡通', '可爱', '动物', '植物', '食物', '人物', '风景', '抽象', '节日', '创意']
    const tags = []
    const tagCount = 1 + Math.floor(Math.random() * 3)
    for (let t = 0; t < tagCount; t++) {
      const tag = tagList[(seed + t * 31) % tagList.length]
      if (!tags.includes(tag)) tags.push(tag)
    }

    artworks.push({
      id: `artwork_${String(i + 1).padStart(3, '0')}`,
      name,
      creatorName: creator,
      creatorAvatar: '',
      likes,
      points,
      createdAt,
      tags,
      viewCount,
      useCount,
      isPublic: true,
      description: '',
      /** 封面渲染参数：由前端 Canvas 动态生成 */
      cover: {
        palette: colorPalettes[paletteIdx],
        pattern: patternType,
        seed: seed,
      },
    })
  }

  return artworks
}

// 生成数据
const artworks = generateArtworks()

// 输出为 JS 模块
const output = `/**
 * 首页假数据 - 300条作品
 * 封面由前端 Canvas 根据 cover 参数动态生成拼豆图案
 * 自动生成，请勿手动修改
 */
export const defaultArtworks = ${JSON.stringify(artworks, null, 2)}
`

const outputPath = path.join(__dirname, '..', 'src', 'utils', 'artworks.js')
fs.writeFileSync(outputPath, output, 'utf-8')
console.log(`✅ 已生成 ${artworks.length} 条假数据到 ${outputPath}`)
