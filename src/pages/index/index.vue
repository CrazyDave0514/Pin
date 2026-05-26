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
            <image
              v-if="artwork.thumbnail"
              class="artwork-cover-image"
              :src="artwork.thumbnail"
              mode="aspectFit"
            />
            <view v-else class="artwork-cover-placeholder">
              <text class="placeholder-initial">{{ (artwork.name || 'P').slice(0, 1) }}</text>
            </view>
            <!-- 积分显示在封面右上角 -->
            <view class="points-badge">
              <text class="points-value">{{ artwork.points > 0 ? `${artwork.points} 积分` : '免费' }}</text>
            </view>
          </view>

          <view class="artwork-info">
            <text class="artwork-name">{{ artwork.name }}</text>
            <view class="artwork-meta">
              <view class="creator">
                <image
                  v-if="!isPresetAvatarValue(artwork.creatorAvatar) && artwork.creatorAvatar"
                  class="creator-avatar"
                  :src="artwork.creatorAvatar"
                  mode="aspectFill"
                />
                <image
                  v-else-if="getPresetAvatarImage(artwork.creatorAvatar)"
                  class="creator-avatar"
                  :src="getPresetAvatarImage(artwork.creatorAvatar)"
                  mode="aspectFill"
                />
                <view
                  v-else
                  class="creator-avatar preset"
                  :style="getPresetAvatarStyle(artwork.creatorAvatar)"
                >
                  <text class="creator-avatar-text">{{ getPresetAvatarGlyph(artwork.creatorAvatar) }}</text>
                </view>
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
import { ref, computed, watch, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPresetAvatarImage as resolvePresetAvatarImage, getPresetAvatarMeta, isPresetAvatarValue } from '../../utils/avatar-presets'
import { communityService } from '../../services/pin/index'

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
})

/** 标签配置 */
const tabs = [
  { key: 'recommend', label: '推荐' },
  { key: 'hot', label: '热门' },
  { key: 'latest', label: '最新' },
  { key: 'following', label: '关注' },
]

onMounted(() => {
  void loadArtworks()
})

onShow(() => {
  void loadArtworks()
})

/**
 * 加载作品数据
 * 优先从本地存储读取，版本不匹配或无数据时使用预生成的 100 条假数据
 */
const loadArtworks = async () => {
  followedCreators.value = await communityService.getFollowedCreators()
  artworks.value = (await communityService.ensureArtworks()).filter((item: any) => item.isPublic !== false)
}

const getPresetAvatarGlyph = (value?: string) => {
  return getPresetAvatarMeta(value)?.glyph || '豆'
}

const getPresetAvatarImage = (value?: string) => {
  return resolvePresetAvatarImage(value)
}

const getPresetAvatarStyle = (value?: string) => {
  const meta = getPresetAvatarMeta(value)
  return meta ? { backgroundColor: meta.bg, color: meta.fg } : {}
}

/**
 * 加载更多作品
 */
const onLoadMore = () => {
  if (displayCount.value < artworks.value.length) {
    displayCount.value = Math.min(displayCount.value + pageSize, artworks.value.length)
  }
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

/** 顶部导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80rpx;
  margin: 16rpx 24rpx 0;
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
  height: calc(100vh - 156rpx);
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
.artwork-cover-image,
.artwork-cover-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.artwork-cover-image {
  padding: 24rpx;
  box-sizing: border-box;
}

.artwork-cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(90deg, rgba(35,31,26,.05) 1px, transparent 1px),
    linear-gradient(180deg, rgba(35,31,26,.05) 1px, transparent 1px),
    #F8F1E5;
  background-size: 24rpx 24rpx;
}

.placeholder-initial {
  font-size: 72rpx;
  font-weight: 800;
  color: rgba(35, 31, 26, 0.42);
}

/** 积分徽章 - 封面右上角半透明背景，使用 CSS 变量适配深色主题 */
.points-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  display: flex;
  align-items: center;
  background: rgba(29, 39, 65, .92);
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(255,255,255,.14);
  z-index: 1;
}

/** 积分数值 */
.points-value {
  font-size: 20rpx;
  color: #FFFFFF;
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
  margin-right: 8rpx;
  overflow: hidden;
  flex-shrink: 0;
}

.creator-avatar.preset {
  display: flex;
  align-items: center;
  justify-content: center;
}

.creator-avatar-text {
  font-size: 18rpx;
  font-weight: 700;
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
