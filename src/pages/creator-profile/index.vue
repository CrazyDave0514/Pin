<template>
  <!-- 创作者主页 V0.2.1 -->
  <view class="creator-profile-page" v-if="creator">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @click="goBack">
        <image class="back-icon" src="/static/assets/v015/icons/back.png" mode="aspectFit" />
      </view>
      <text class="nav-title">创作者主页</text>
      <view class="nav-placeholder"></view>
    </view>

    <scroll-view class="profile-scroll" scroll-y :show-scrollbar="false" @scrolltolower="loadMoreArtworks">
      <!-- 创作者信息卡片 -->
      <view class="creator-card">
        <view class="creator-header">
          <image v-if="showAvatarImage" class="creator-avatar" :src="creator.avatar" mode="aspectFill" />
          <image v-else-if="presetAvatarImage" class="creator-avatar" :src="presetAvatarImage" mode="aspectFill" />
          <view v-else class="creator-avatar preset" :style="presetAvatarStyle">
            <text class="avatar-text">{{ presetAvatarGlyph }}</text>
          </view>
          <view class="creator-info">
            <text class="creator-name">@{{ creator.nickname || creator.username }}</text>
            <text class="creator-uid">UID: {{ creator.uid }}</text>
          </view>
        </view>

        <text v-if="creator.bio" class="creator-bio">{{ creator.bio }}</text>

        <!-- 统计信息 -->
        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-value">{{ creator.artworkCount || 0 }}</text>
            <text class="stat-label">作品</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value">{{ creator.followerCount || 0 }}</text>
            <text class="stat-label">粉丝</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value">{{ creator.followingCount || 0 }}</text>
            <text class="stat-label">关注</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="action-row">
          <view :class="['action-btn', 'follow-btn', isFollowing ? 'followed' : '']" @click="toggleFollow">
            <text>{{ isFollowing ? '已关注' : '关注' }}</text>
          </view>
          <view :class="['action-btn', 'block-btn', isBlocked ? 'blocked' : '']" @click="toggleBlock">
            <text>{{ isBlocked ? '已拉黑' : '拉黑' }}</text>
          </view>
        </view>
      </view>

      <!-- 作品列表 -->
      <view class="artworks-section">
        <view class="section-header">
          <text class="section-title">作品列表</text>
          <text class="section-count">{{ artworks.length }} 个作品</text>
        </view>

        <view v-if="artworks.length > 0" class="artworks-grid">
          <view 
            v-for="artwork in artworks" 
            :key="artwork.id" 
            class="artwork-card"
            @click="goToArtwork(artwork.id)"
          >
            <image 
              v-if="artwork.thumbnail" 
              class="artwork-thumb" 
              :src="artwork.thumbnail" 
              mode="aspectFill"
            />
            <view v-else class="artwork-thumb placeholder">
              <text class="placeholder-text">{{ artwork.name?.[0] || '?' }}</text>
            </view>
            <view class="artwork-overlay">
              <text class="artwork-name">{{ artwork.name }}</text>
              <view class="artwork-stats">
                <text class="stat">♥ {{ artwork.likes || 0 }}</text>
                <text class="stat">★ {{ artwork.favorites || 0 }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-else-if="!loading" class="empty-state">
          <text class="empty-icon">🎨</text>
          <text class="empty-text">暂无作品</text>
        </view>

        <!-- 加载更多 -->
        <view v-if="loading" class="loading-more">
          <text class="loading-text">加载中...</text>
        </view>
        <view v-else-if="hasMore" class="load-more" @click="loadMoreArtworks">
          <text class="load-more-text">加载更多</text>
        </view>
      </view>
    </scroll-view>
  </view>

  <!-- 加载中/错误状态 -->
  <view class="creator-profile-page loading" v-else-if="loading">
    <text class="loading-text">加载中...</text>
  </view>
  <view class="creator-profile-page error" v-else>
    <text class="error-icon">😕</text>
    <text class="error-text">创作者不存在</text>
    <view class="back-btn-large" @click="goBack">
      <text>返回</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getPresetAvatarImage, getPresetAvatarMeta, isPresetAvatarValue } from '@/utils/avatar-presets'
import { pinDataProvider, communityService } from '../../services/pin/index'
import type { CommunityArtwork, UserProfile } from '../../services/pin/types'
import { checkLogin } from '@/utils/auth-guard'

// 创作者信息
const creator = ref<UserProfile | null>(null)
const artworks = ref<CommunityArtwork[]>([])
const isFollowing = ref(false)
const isBlocked = ref(false)
const loading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const pageSize = 12

// 头像相关计算属性
const showAvatarImage = computed(() => !!creator.value?.avatar && !isPresetAvatarValue(creator.value.avatar))
const presetAvatarImage = computed(() => getPresetAvatarImage(creator.value?.avatar))
const presetAvatarMeta = computed(() => getPresetAvatarMeta(creator.value?.avatar))
const presetAvatarStyle = computed(() => ({
  backgroundColor: presetAvatarMeta.value?.bg || '#FFE3DA',
  color: presetAvatarMeta.value?.fg || '#B56A58',
}))
const presetAvatarGlyph = computed(() => presetAvatarMeta.value?.glyph || '鼠')

/**
 * 页面加载
 */
onLoad((options: any) => {
  const uid = options?.uid || options?.id
  if (uid) {
    loadCreatorProfile(uid)
    loadCreatorArtworks(uid)
  }
})

/**
 * 加载创作者信息
 */
const loadCreatorProfile = async (uid: string) => {
  loading.value = true
  try {
    const profile = await pinDataProvider.request<UserProfile>('GET', `/users/${uid}/profile`)
    creator.value = profile
    
    // 检查关注状态
    const currentUser = await pinDataProvider.getCurrentUserByToken()
    if (currentUser) {
      const followState = await communityService.isFollowing(profile.username)
      isFollowing.value = followState
      
      // 检查拉黑状态
      const blockedCreators = await communityService.getBlockedCreators()
      isBlocked.value = blockedCreators.includes(profile.username)
    }
  } catch (e) {
    console.error('加载创作者信息失败:', e)
  } finally {
    loading.value = false
  }
}

/**
 * 加载创作者作品
 */
const loadCreatorArtworks = async (uid: string) => {
  if (!hasMore.value || loading.value) return
  
  loading.value = true
  try {
    const result = await pinDataProvider.request<{ artworks: CommunityArtwork[]; hasMore: boolean }>(
      'GET', 
      `/users/${uid}/artworks?page=${currentPage.value}&size=${pageSize}`
    )
    
    if (currentPage.value === 1) {
      artworks.value = result.artworks
    } else {
      artworks.value.push(...result.artworks)
    }
    
    hasMore.value = result.hasMore
    currentPage.value++
  } catch (e) {
    console.error('加载作品失败:', e)
  } finally {
    loading.value = false
  }
}

/**
 * 加载更多作品
 */
const loadMoreArtworks = () => {
  if (creator.value?.uid) {
    loadCreatorArtworks(creator.value.uid)
  }
}

/**
 * 切换关注状态
 */
const toggleFollow = async () => {
  if (!creator.value) return
  
  try {
    isFollowing.value = await communityService.toggleFollow(creator.value.username)
    uni.showToast({ title: isFollowing.value ? '已关注' : '已取消关注', icon: 'none' })
    
    // 更新粉丝数
    if (isFollowing.value) {
      creator.value.followerCount = (creator.value.followerCount || 0) + 1
    } else {
      creator.value.followerCount = Math.max(0, (creator.value.followerCount || 0) - 1)
    }
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

/**
 * 切换拉黑状态
 */
const toggleBlock = async () => {
  if (!creator.value) return

  // 检查登录状态
  if (!checkLogin({ message: '拉黑需要登录后才能操作' })) return

  if (isBlocked.value) {
    // 取消拉黑
    uni.showModal({
      title: '确认移除',
      content: `确定将 ${creator.value.nickname || creator.value.username} 从黑名单移除吗？`,
      confirmText: '移除',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            await pinDataProvider.request('DELETE', `/relations/block/${creator.value!.username}`)
            isBlocked.value = false
            uni.showToast({ title: '已移除黑名单', icon: 'success' })
          } catch (e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  } else {
    // 拉黑
    uni.showModal({
      title: '确认拉黑',
      content: `拉黑后将不再看到 ${creator.value.nickname || creator.value.username} 的作品，确定继续吗？`,
      confirmText: '拉黑',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            await pinDataProvider.request('POST', '/relations/block', {
              creatorUid: creator.value!.uid,
              creatorName: creator.value!.username
            })
            isBlocked.value = true
            isFollowing.value = false // 拉黑自动取消关注
            uni.showToast({ title: '已拉黑', icon: 'success' })
          } catch (e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  }
}

/**
 * 跳转到作品详情
 */
const goToArtwork = (artworkId: string) => {
  uni.navigateTo({ url: `/pages/artwork-detail/index?id=${artworkId}` })
}

/**
 * 返回上一页
 */
const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.creator-profile-page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
}

.creator-profile-page.loading,
.creator-profile-page.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

/* 顶部导航 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background-color: var(--color-bg-panel);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  width: 40rpx;
  height: 40rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.nav-placeholder {
  width: 64rpx;
}

/* 滚动区域 */
.profile-scroll {
  height: calc(100vh - 112rpx);
}

/* 创作者卡片 */
.creator-card {
  background-color: var(--color-bg-panel);
  margin: 24rpx;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: var(--shadow-sm);
}

.creator-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.creator-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  margin-right: 24rpx;
  background-color: var(--color-bg-page);
}

.creator-avatar.preset {
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 48rpx;
}

.creator-info {
  flex: 1;
}

.creator-name {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 8rpx;
}

.creator-uid {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

.creator-bio {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 24rpx;
  display: block;
}

/* 统计信息 */
.stats-row {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
  border-top: 2rpx solid var(--color-bg-page);
  border-bottom: 2rpx solid var(--color-bg-page);
  margin-bottom: 24rpx;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 40rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4rpx;
}

.stat-label {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

.stat-divider {
  width: 2rpx;
  height: 60rpx;
  background-color: var(--color-bg-page);
}

/* 操作按钮 */
.action-row {
  display: flex;
  gap: 24rpx;
}

.action-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 500;
}

.follow-btn {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.follow-btn.followed {
  background-color: var(--color-bg-page);
  color: var(--color-text-secondary);
  border: 2rpx solid var(--color-border);
}

.block-btn {
  background-color: var(--color-bg-page);
  color: var(--color-text-secondary);
  border: 2rpx solid var(--color-border);
}

.block-btn.blocked {
  background-color: var(--color-error);
  color: var(--color-text-inverse);
  border-color: var(--color-error);
}

/* 作品区域 */
.artworks-section {
  padding: 0 24rpx 40rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-count {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

/* 作品网格 */
.artworks-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.artwork-card {
  aspect-ratio: 1;
  border-radius: 16rpx;
  overflow: hidden;
  position: relative;
  background-color: var(--color-bg-panel);
}

.artwork-thumb {
  width: 100%;
  height: 100%;
}

.artwork-thumb.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary-soft) 100%);
}

.placeholder-text {
  font-size: 72rpx;
  color: var(--color-text-inverse);
  font-weight: 600;
}

.artwork-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
}

.artwork-name {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
  margin-bottom: 8rpx;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artwork-stats {
  display: flex;
  gap: 16rpx;
}

.artwork-stats .stat {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: var(--color-text-tertiary);
}

/* 加载更多 */
.loading-more,
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.loading-text,
.load-more-text {
  font-size: 26rpx;
  color: var(--color-text-tertiary);
}

/* 错误状态 */
.error-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.error-text {
  font-size: 32rpx;
  color: var(--color-text-secondary);
  margin-bottom: 40rpx;
}

.back-btn-large {
  padding: 24rpx 48rpx;
  background-color: var(--color-primary);
  border-radius: 40rpx;
}

.back-btn-large text {
  font-size: 28rpx;
  color: var(--color-text-inverse);
}
</style>
