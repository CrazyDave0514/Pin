<template>
  <view class="index-page">
    <view class="home-hero">
      <view class="hero-copy">
        <text class="hero-kicker">Pin Studio</text>
        <text class="hero-title">今天做什么</text>
        <text class="hero-subtitle">为你的下一块拼豆板找灵感</text>
      </view>
      <view class="hero-preview">
        <view class="hero-preview-grid">
          <view
            v-for="(bead, index) in heroBeads"
            :key="index"
            class="hero-bead"
            :style="{ backgroundColor: bead }"
          ></view>
        </view>
      </view>
    </view>

    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="tab-list">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-item', activeTab === tab.key ? 'active' : '']"
          @click="activeTab = tab.key"
        >
          <text class="tab-text">{{ tab.label }}</text>
        </view>
      </view>
      <view class="search-btn" @click="goToSearch">
        <image class="search-icon" src="/static/assets/v015/icons/search.png" mode="aspectFit" />
      </view>
    </view>

    <!-- 瀑布流内容区 -->
    <scroll-view class="waterfall-container" scroll-y :show-scrollbar="false" @scrolltolower="onLoadMore">
      <view class="waterfall-list">
        <view
          v-for="artwork in displayArtworks"
          :key="artwork.id"
          class="artwork-card"
          @click="goToArtworkDetail(artwork)"
        >
          <!-- 封面区域 - Canvas 动态渲染拼豆图案 -->
          <view class="cover-wrapper">
            <canvas
              :canvas-id="'cover-' + artwork.id"
              :id="'cover-' + artwork.id"
              class="artwork-cover-canvas"
              :style="{ height: artwork._coverHeight ? artwork._coverHeight + 'rpx' : '340rpx' }"
            />
            <!-- 积分显示在封面右上角 -->
            <view class="points-badge">
              <image class="points-icon" src="/static/assets/v015/icons/points-active.png" mode="aspectFit" />
              <text class="points-value">{{ artwork.points > 0 ? artwork.points : '免费' }}</text>
            </view>
          </view>

          <view class="artwork-info">
            <text class="artwork-name">{{ artwork.name }}</text>
            <view class="artwork-meta">
              <view class="creator">
                <view class="creator-avatar"></view>
                <text class="creator-name">{{ artwork.creatorName }}</text>
              </view>
              <view class="likes">
                <image class="like-icon" src="/static/assets/v015/icons/favorite.png" mode="aspectFit" />
                <text class="like-count">{{ artwork.likes }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="displayArtworks.length < artworks.length" class="load-more">
        <text class="load-more-text">加载更多...</text>
      </view>

      <view v-if="displayArtworks.length >= artworks.length && artworks.length > 0" class="load-more">
        <text class="load-more-text">已经到底啦～</text>
      </view>

      <view v-if="artworks.length === 0" class="empty-state">
        <text class="empty-text">暂无作品</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, getCurrentInstance } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ensureCommunityArtworks } from '../../utils/community'

const instance = getCurrentInstance()

/** 当前激活的标签 */
const activeTab = ref('recommend')

/** 全部作品数据 */
const artworks = ref<any[]>([])
const followedCreators = ref<string[]>([])

/** 当前展示的作品数量（分页加载） */
const pageSize = 20
const displayCount = ref(pageSize)

/** 当前展示的作品列表 - 按 tab 排序后分页 */
const displayArtworks = computed(() => {
  const now = Date.now()
  const DAY = 24 * 3600 * 1000

  let sorted: any[]

  if (activeTab.value === 'hot') {
    /** 热门：按点赞数降序 */
    sorted = [...artworks.value].sort((a, b) => b.likes - a.likes)
  } else if (activeTab.value === 'latest') {
    /** 最新：按创建时间降序 */
    sorted = [...artworks.value].sort((a, b) => b.createdAt - a.createdAt)
  } else if (activeTab.value === 'following') {
    /** 关注：展示已关注创作者的公开作品 */
    sorted = [...artworks.value]
      .filter((item) => followedCreators.value.includes(item.creatorName))
      .sort((a, b) => b.createdAt - a.createdAt)
  } else {
    /** 推荐：综合评分 = 点赞数 * 2 + 浏览量 * 0.3 + 新鲜度奖励 */
    sorted = [...artworks.value].sort((a, b) => {
      const scoreA = a.likes * 2 + a.viewCount * 0.3 + Math.max(0, 1 - (now - a.createdAt) / (7 * DAY)) * 50
      const scoreB = b.likes * 2 + b.viewCount * 0.3 + Math.max(0, 1 - (now - b.createdAt) / (7 * DAY)) * 50
      return scoreB - scoreA
    })
  }

  return sorted.slice(0, displayCount.value)
})

/** 切换 tab 时重置加载数量 */
watch(activeTab, () => {
  displayCount.value = pageSize
  nextTick(() => {
    setTimeout(() => renderVisibleCovers(), 100)
  })
})

/** 标签配置 */
const tabs = [
  { key: 'recommend', label: '推荐' },
  { key: 'hot', label: '热门' },
  { key: 'latest', label: '最新' },
  { key: 'following', label: '关注' },
]

const heroBeads = [
  '#f7b733', '#f7b733', '#fffdfa', '#fffdfa', '#cf5c4d', '#cf5c4d', '#fffdfa', '#fffdfa', '#f7b733', '#f7b733',
  '#f7b733', '#fffdfa', '#5f9b73', '#5f9b73', '#fffdfa', '#fffdfa', '#4c7f9f', '#4c7f9f', '#fffdfa', '#f7b733',
  '#fffdfa', '#5f9b73', '#5f9b73', '#5f9b73', '#8b6fad', '#8b6fad', '#4c7f9f', '#4c7f9f', '#4c7f9f', '#fffdfa',
  '#fffdfa', '#fffdfa', '#5f9b73', '#8b6fad', '#8b6fad', '#8b6fad', '#4c7f9f', '#fffdfa', '#fffdfa', '#fffdfa',
  '#f7b733', '#fffdfa', '#fffdfa', '#cf5c4d', '#cf5c4d', '#cf5c4d', '#fffdfa', '#fffdfa', '#f7b733', '#f7b733'
]

onMounted(() => {
  loadArtworks()
})

onShow(() => {
  loadArtworks()
})

/**
 * 加载作品数据
 * 优先从本地存储读取，版本不匹配或无数据时使用预生成的 100 条假数据
 */
const loadArtworks = () => {
  followedCreators.value = uni.getStorageSync('pin_followed_creators') || []
  artworks.value = ensureCommunityArtworks().filter((item: any) => item.isPublic !== false)
  artworks.value.forEach((item) => { item._rendered = false })

  /** 首次加载后渲染可见区域的封面 */
  nextTick(() => {
    setTimeout(() => {
      renderVisibleCovers()
    }, 300)
  })
}

/**
 * 加载更多作品
 */
const onLoadMore = () => {
  if (displayCount.value < artworks.value.length) {
    displayCount.value = Math.min(displayCount.value + pageSize, artworks.value.length)
    nextTick(() => {
      setTimeout(() => {
        renderVisibleCovers()
      }, 100)
    })
  }
}

/**
 * 渲染当前可见区域的拼豆封面
 * 使用 Canvas 2D API 绘制拼豆圆形图案
 */
const renderVisibleCovers = () => {
  const items = displayArtworks.value
  items.forEach((artwork) => {
    if (artwork._rendered) return
    renderBeadCover(artwork)
  })
}

/**
 * 为单个作品渲染拼豆封面
 * @param artwork - 作品数据，包含 cover.palette / cover.pattern / cover.seed
 */
const renderBeadCover = (artwork: any) => {
  if (!artwork.cover) return

  const { palette, pattern, seed } = artwork.cover
  const canvasId = 'cover-' + artwork.id

  /** 使用 uni.createSelectorQuery 获取 Canvas 尺寸 */
  const query = uni.createSelectorQuery().in(instance)
  query
    .select('#' + canvasId)
    .fields({ node: true, size: true })
    .exec((res) => {
      if (!res || !res[0] || !res[0].width) {
        /** 降级：使用 boundingClientRect */
        const query2 = uni.createSelectorQuery().in(instance)
        query2
          .select('.cover-wrapper')
          .boundingClientRect((rect: any) => {
            if (rect && rect.width > 0) {
              doRender(artwork, canvasId, rect.width, rect.width)
            }
          })
          .exec()
        return
      }

      const { width, height } = res[0]
      doRender(artwork, canvasId, width, height)
    })
}

/**
 * 执行 Canvas 绘制
 * @param artwork - 作品数据
 * @param canvasId - Canvas ID
 * @param width - 画布宽度
 * @param height - 画布高度
 */
const doRender = (artwork: any, canvasId: string, width: number, height: number) => {
  if (artwork._rendered) return

  const ctx = uni.createCanvasContext(canvasId, instance)
  const { palette, pattern, seed } = artwork.cover

  /** 伪随机数生成器 */
  let s = seed
  const random = () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }

  /** 绘制参数 */
  const gridSize = 8
  const cellSize = Math.floor(Math.min(width, height) / gridSize)
  const beadRadius = Math.floor(cellSize * 0.4)
  const offsetX = Math.floor((width - gridSize * cellSize) / 2)
  const offsetY = Math.floor((height - gridSize * cellSize) / 2)

  /** 背景 - 使用 CSS 变量适配深色主题 */
  ctx.setFillStyle('#F5F5F5')
  ctx.fillRect(0, 0, width, height)

  /** 生成拼豆位置 */
  const beads: { x: number; y: number; color: string }[] = []

  if (pattern === 'random') {
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (random() > 0.35) {
          beads.push({ x, y, color: palette[Math.floor(random() * palette.length)] })
        }
      }
    }
  } else if (pattern === 'symmetric') {
    const halfGrid = Math.ceil(gridSize / 2)
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < halfGrid; x++) {
        if (random() > 0.3) {
          const c = palette[Math.floor(random() * palette.length)]
          beads.push({ x, y, color: c })
          beads.push({ x: gridSize - 1 - x, y, color: c })
        }
      }
    }
  } else if (pattern === 'circle') {
    const cx = gridSize / 2 - 0.5
    const cy = gridSize / 2 - 0.5
    const maxR = gridSize / 2
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        if (dist <= maxR && random() > 0.2) {
          beads.push({ x, y, color: palette[Math.floor(random() * palette.length)] })
        }
      }
    }
  } else if (pattern === 'stripe') {
    const stripeDir = random() > 0.5 ? 'h' : 'v'
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const stripe = stripeDir === 'h' ? y : x
        if (stripe % 2 === 0 || random() > 0.5) {
          beads.push({ x, y, color: palette[stripe % palette.length] })
        }
      }
    }
  } else {
    /** diamond 菱形图案 */
    const cx = gridSize / 2 - 0.5
    const cy = gridSize / 2 - 0.5
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const nx = (x - cx) / (gridSize / 2)
        const ny = (y - cy) / (gridSize / 2)
        if (nx * nx + ny * ny < 0.8 && random() > 0.15) {
          beads.push({ x, y, color: palette[Math.floor(random() * palette.length)] })
        }
      }
    }
  }

  /** 绘制每个拼豆 */
  beads.forEach((b) => {
    const cx = offsetX + b.x * cellSize + cellSize / 2
    const cy = offsetY + b.y * cellSize + cellSize / 2

    /** 拼豆主体 */
    ctx.beginPath()
    ctx.arc(cx, cy, beadRadius, 0, Math.PI * 2)
    ctx.setFillStyle(b.color)
    ctx.fill()

    /** 拼豆中心孔（特征） */
    ctx.beginPath()
    ctx.arc(cx, cy, beadRadius * 0.2, 0, Math.PI * 2)
    ctx.setFillStyle('rgba(0,0,0,0.08)')
    ctx.fill()

    /** 高光效果 */
    ctx.beginPath()
    ctx.arc(cx - beadRadius * 0.2, cy - beadRadius * 0.25, beadRadius * 0.35, 0, Math.PI * 2)
    ctx.setFillStyle('rgba(255,255,255,0.3)')
    ctx.fill()
  })

  ctx.draw(false, () => {
    artwork._rendered = true
  })
}

/**
 * 跳转到搜索页
 */
const goToSearch = () => {
  uni.navigateTo({ url: '/pages/search/index' })
}

const goToArtworkDetail = (artwork: any) => {
  uni.navigateTo({ url: `/pages/artwork-detail/index?id=${artwork.id}` })
}
</script>

<style scoped>
/* ==================== 首页样式 - 基于 Pin 统一设计系统 ==================== */

/** 页面容器 */
.index-page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
  max-width: 100vw;
  overflow-x: hidden;
  box-sizing: border-box;
  padding-bottom: 24rpx;
}

.home-hero {
  position: relative;
  min-height: 252rpx;
  margin: 16rpx 24rpx 0;
  padding: 24rpx;
  border: 2rpx solid var(--color-border);
  border-radius: 28rpx;
  overflow: hidden;
  background-color: var(--color-bg-panel);
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  gap: 14rpx;
  box-sizing: border-box;
}

.hero-copy {
  position: relative;
  z-index: 1;
  padding: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.hero-kicker {
  align-self: flex-start;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  border: 2rpx solid var(--color-border);
  background-color: rgba(255, 253, 250, .82);
  color: var(--color-primary-dark);
  font-size: 22rpx;
  font-weight: 700;
  margin-bottom: 12rpx;
}

.hero-title {
  font-size: 36rpx;
  line-height: 1.1;
  font-weight: 800;
  color: var(--color-text-primary);
}

.hero-subtitle {
  margin-top: 10rpx;
  font-size: 23rpx;
  line-height: 1.35;
  color: var(--color-text-secondary);
}

.hero-preview {
  width: 248rpx;
  height: 156rpx;
  margin: 0;
  border: 2rpx solid var(--color-border-light);
  border-radius: 22rpx;
  background:
    linear-gradient(90deg, rgba(35,31,26,.05) 1px, transparent 1px),
    linear-gradient(180deg, rgba(35,31,26,.05) 1px, transparent 1px),
    var(--color-primary-soft);
  background-size: 22rpx 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero-preview-grid {
  display: grid;
  grid-template-columns: repeat(10, 17rpx);
  gap: 8rpx;
  padding: 12rpx;
  border-radius: 18rpx;
  background-color: rgba(255,253,250,.72);
}

.hero-bead {
  width: 17rpx;
  height: 17rpx;
  border-radius: 50%;
  box-shadow: inset 0 -1rpx 0 rgba(0,0,0,.16), inset 0 1rpx 0 rgba(255,255,255,.5);
}

/** 顶部导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80rpx;
  margin: 14rpx 24rpx 0;
  padding: 8rpx;
  background-color: rgba(255, 253, 250, .9);
  border: 2rpx solid var(--color-border);
  border-radius: 24rpx;
  position: sticky;
  top: 0;
  z-index: 100;
  max-width: 100%;
  box-sizing: border-box;
}

/** Tab 列表容器 */
.tab-list {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
}

/** 单个 Tab 项 */
.tab-item {
  position: relative;
  margin-right: 8rpx;
  padding: 16rpx 24rpx;
  border-radius: 18rpx;
  flex-shrink: 0;
}

/** Tab 激活态文字 - 使用品牌主色 */
.tab-item.active .tab-text {
  color: var(--color-text-inverse);
  font-weight: 600;
}

.tab-item.active {
  background-color: var(--color-text-primary);
}

/** Tab 文字默认态 */
.tab-text {
  font-size: 28rpx;
  color: var(--color-text-secondary);
}

/** 搜索按钮 */
.search-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 20rpx;
  background-color: var(--color-primary-light);
}

/** 搜索图标 */
.search-icon {
  width: 34rpx;
  height: 34rpx;
  display: block;
}

/** 瀑布流滚动容器 */
.waterfall-container {
  height: calc(100vh - 424rpx);
  padding: 18rpx 24rpx;
  box-sizing: border-box;
}

/** 瀑布流列表 - 双列布局 */
.waterfall-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

/** 作品卡片 - 统一圆角 12px + 标准阴影 */
.artwork-card {
  width: calc(50% - 10rpx);
  margin-bottom: 20rpx;
  background-color: var(--color-bg-panel);
  border: 2rpx solid var(--color-border);
  border-radius: 22rpx;
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

/** 封面容器 - 等比例正方形 */
.cover-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  overflow: hidden;
  background-color: #F1E7DA;
}

/** Canvas 封面画布 - 绝对定位铺满容器 */
.artwork-cover-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/** 积分徽章 - 封面右上角半透明背景，使用 CSS 变量适配深色主题 */
.points-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  display: flex;
  align-items: center;
  background: rgba(255, 253, 250, .9);
  padding: 8rpx 12rpx;
  border-radius: 999rpx;
  border: 1rpx solid var(--color-border);
  z-index: 1;
}

/** 积分图标 */
.points-icon {
  width: 24rpx;
  height: 24rpx;
  margin-right: 6rpx;
}

/** 积分数值 */
.points-value {
  font-size: 20rpx;
  color: var(--color-primary-dark);
  font-weight: 700;
}

/** 作品信息区域 */
.artwork-info {
  padding: 16rpx;
}

/** 作品名称 - 主文字色，最多两行截断 */
.artwork-name {
  font-size: 26rpx;
  color: var(--color-text-primary);
  line-height: 1.4;
  margin-bottom: 12rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/** 作品元信息行 - 创作者与点赞 */
.artwork-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

/** 创作者信息 */
.creator {
  display: flex;
  align-items: center;
}

/** 创作者头像占位 */
.creator-avatar {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background-color: var(--color-border);
  margin-right: 8rpx;
}

/** 创作者名称 - 次要文字色 */
.creator-name {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}

/** 点赞信息 */
.likes {
  display: flex;
  align-items: center;
}

/** 点赞图标 */
.like-icon {
  width: 22rpx;
  height: 22rpx;
  margin-right: 6rpx;
}

/** 点赞数量 - 辅助文字色 */
.like-count {
  font-size: 22rpx;
  color: var(--color-text-tertiary);
}

/** 加载更多区域 */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0;
}

/** 加载更多文字 */
.load-more-text {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

/** 空状态容器 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400rpx;
}

/** 空状态提示文字 */
.empty-text {
  font-size: 28rpx;
  color: var(--color-text-tertiary);
}
</style>
