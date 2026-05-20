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
    <scroll-view class="waterfall-container" scroll-y>
      <view class="waterfall-list">
        <view
          v-for="artwork in artworks"
          :key="artwork.id"
          class="artwork-card"
        >
          <!-- 封面区域 - 固定宽高比容器 -->
          <view class="cover-wrapper">
            <image
              v-if="artwork.coverImage"
              class="artwork-cover"
              :src="artwork.coverImage"
              mode="aspectFill"
              @load="onImageLoad($event, artwork.id)"
            />
            <!-- 图片占位层 -->
            <view v-else class="artwork-cover-placeholder">
              <text class="placeholder-text">拼豆图案</text>
            </view>
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

      <view v-if="artworks.length === 0" class="empty-state">
        <text class="empty-text">暂无作品</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const activeTab = ref('recommend')
const artworks = ref<any[]>([])
// 默认封面使用纯色背景（避免外部图片加载失败）
const defaultCover = ''

const tabs = [
  { key: 'recommend', label: '推荐' },
  { key: 'hot', label: '热门' },
  { key: 'latest', label: '最新' },
  { key: 'following', label: '关注' },
]

onMounted(() => {
  // 加载作品数据
  loadArtworks()
})

const loadArtworks = () => {
  // 从本地存储加载
  const data = uni.getStorageSync('pin_artworks') || []
  artworks.value = data
  
  // 如果没有数据，初始化示例数据
  if (data.length === 0) {
    const defaultArtworks = [
      {
        id: 'demo_001',
        name: '可爱的小猫咪拼豆图案',
        coverImage: '',
        creatorId: 'system',
        creatorName: 'Pin官方',
        likes: 128,
        points: 5,
        createdAt: Date.now(),
        tags: ['动物', '可爱', '入门'],
        viewCount: 256,
        useCount: 32,
        isPublic: true,
      },
      {
        id: 'demo_002',
        name: '樱花图案',
        coverImage: '',
        creatorId: 'system',
        creatorName: '小花',
        likes: 86,
        points: 3,
        createdAt: Date.now(),
        tags: ['植物', '粉色'],
        viewCount: 120,
        useCount: 15,
        isPublic: true,
      },
    ]
    uni.setStorageSync('pin_artworks', defaultArtworks)
    artworks.value = defaultArtworks
  }
}

const goToSearch = () => {
  uni.navigateTo({ url: '/pages/search/index' })
}

/**
 * 图片加载完成，检测图片宽高比
 * @param e - 图片加载事件
 * @param artworkId - 作品ID
 */
const onImageLoad = (e: any, artworkId: string) => {
  const { width, height } = e.detail
  const ratio = width / height
  // 可以在这里根据宽高比做特殊处理
  console.log(`图片 ${artworkId} 宽高比: ${ratio}`)
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

/* 封面容器 - 固定 1:1 宽高比 */
.cover-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 100%; /* 1:1 宽高比 */
  overflow: hidden;
  background-color: #F5F5F5;
}

.artwork-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.artwork-cover-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #F0F0F0 0%, #E8E8E8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  font-size: 24rpx;
  color: #999999;
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
