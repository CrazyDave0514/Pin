<template>
  <view class="index-page">
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
        <text class="search-icon">🔍</text>
      </view>
    </view>

    <!-- 瀑布流内容区 -->
    <scroll-view class="waterfall-container" scroll-y @scrolltolower="onLoadMore">
      <view class="waterfall-list">
        <view
          v-for="artwork in displayArtworks"
          :key="artwork.id"
          class="artwork-card"
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
              <text class="points-icon">💰</text>
              <text class="points-value">{{ artwork.points }}</text>
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
                <text class="like-icon">♥</text>
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
import { defaultArtworks } from '../../utils/artworks.js'

const instance = getCurrentInstance()

/** 当前激活的标签 */
const activeTab = ref('recommend')

/** 全部作品数据 */
const artworks = ref<any[]>([])

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
    /** 关注：展示前 50 条作为"已关注创作者"的作品 */
    sorted = [...artworks.value]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50)
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

onMounted(() => {
  loadArtworks()
})

/** 数据版本号，数据结构变更时递增以强制刷新本地缓存 */
const ARTWORKS_VERSION = 'v2'

/**
 * 加载作品数据
 * 优先从本地存储读取，版本不匹配或无数据时使用预生成的 300 条假数据
 */
const loadArtworks = () => {
  const cached = uni.getStorageSync('pin_artworks')
  const cachedVersion = uni.getStorageSync('pin_artworks_version')

  /** 版本不匹配或无数据时，使用最新假数据覆盖 */
  if (!cached || cached.length === 0 || cachedVersion !== ARTWORKS_VERSION) {
    uni.setStorageSync('pin_artworks', defaultArtworks)
    uni.setStorageSync('pin_artworks_version', ARTWORKS_VERSION)
    artworks.value = defaultArtworks
  } else {
    artworks.value = cached
  }

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

  /** 背景 */
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
</script>

<style scoped>
.index-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  max-width: 100vw;
  overflow-x: hidden;
  box-sizing: border-box;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
  background-color: #FFFFFF;
  border-bottom: 2rpx solid #E8E8E8;
  position: sticky;
  top: 0;
  z-index: 100;
  max-width: 100%;
  box-sizing: border-box;
}

.tab-list {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
}

.tab-item {
  position: relative;
  margin-right: 48rpx;
  padding: 24rpx 0;
  flex-shrink: 0;
}

.tab-item.active .tab-text {
  color: #2D2D2D;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 8rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 32rpx;
  height: 4rpx;
  background-color: #2D2D2D;
  border-radius: 2rpx;
}

.tab-text {
  font-size: 28rpx;
  color: #666666;
}

.search-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.search-icon {
  font-size: 36rpx;
}

.waterfall-container {
  height: calc(100vh - 188rpx);
  padding: 16rpx;
  box-sizing: border-box;
}

.waterfall-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.artwork-card {
  width: calc(50% - 8rpx);
  margin-bottom: 16rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.08);
}

/* 封面容器 */
.cover-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  overflow: hidden;
  background-color: #F5F5F5;
}

.artwork-cover-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* 积分徽章 - 封面右上角 */
.points-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.6);
  padding: 6rpx 12rpx;
  border-radius: 20rpx;
  z-index: 1;
}

.points-icon {
  font-size: 20rpx;
  margin-right: 4rpx;
}

.points-value {
  font-size: 20rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.artwork-info {
  padding: 16rpx;
}

.artwork-name {
  font-size: 26rpx;
  color: #2D2D2D;
  line-height: 1.4;
  margin-bottom: 12rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.artwork-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.creator {
  display: flex;
  align-items: center;
}

.creator-avatar {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background-color: #E8E8E8;
  margin-right: 8rpx;
}

.creator-name {
  font-size: 22rpx;
  color: #666666;
}

.likes {
  display: flex;
  align-items: center;
}

.like-icon {
  font-size: 22rpx;
  color: #FF4D4D;
  margin-right: 4rpx;
}

.like-count {
  font-size: 22rpx;
  color: #999999;
}

/* 加载更多 */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0;
}

.load-more-text {
  font-size: 24rpx;
  color: #999999;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}
</style>
