/**
 * 新手引导配置
 * 5步引导流程
 */

export interface GuideStep {
  target?: string
  title: string
  description: string
  image?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

// 5步引导配置
export const GUIDE_STEPS: GuideStep[] = [
  {
    title: '欢迎来到 Pin',
    description: 'Pin 是一款拼豆创作应用，帮助你将创意转化为精美的拼豆作品。',
    image: '/static/guide/welcome.png',
  },
  {
    target: '.tabbar-home',
    title: '发现灵感',
    description: '在首页浏览社区作品，发现创作灵感，学习他人的拼豆技巧。',
    position: 'top',
  },
  {
    target: '.tabbar-project',
    title: '开始创作',
    description: '点击这里创建新项目，使用网格画板设计你的拼豆图案。',
    position: 'top',
  },
  {
    target: '.fab-create',
    title: '快速创建',
    description: '随时点击右下角的 + 按钮，快速开始新的拼豆创作。',
    position: 'left',
  },
  {
    target: '.tabbar-mine',
    title: '个人中心',
    description: '管理你的作品、收藏和账号设置，查看创作统计。',
    position: 'top',
  },
]

// 存储键
export const GUIDE_STORAGE_KEY = 'pin_guide_completed'

// 检查是否已完成引导
export function hasCompletedGuide(): boolean {
  try {
    return uni.getStorageSync(GUIDE_STORAGE_KEY) === true
  } catch {
    return false
  }
}

// 标记引导完成
export function markGuideCompleted(): void {
  uni.setStorageSync(GUIDE_STORAGE_KEY, true)
}

// 重置引导状态（用于测试或重新查看）
export function resetGuideStatus(): void {
  uni.removeStorageSync(GUIDE_STORAGE_KEY)
}
