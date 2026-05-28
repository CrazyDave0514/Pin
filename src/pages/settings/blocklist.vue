<template>
  <!-- 黑名单管理页 V0.2.1 -->
  <view class="blocklist-page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @click="goBack">
        <image class="back-icon" src="/static/assets/v015/icons/back.png" mode="aspectFit" />
      </view>
      <text class="nav-title">黑名单管理</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 说明文字 -->
    <view class="info-section">
      <text class="info-text">拉黑后，您将不会看到该创作者的作品，该创作者也无法关注您。</text>
    </view>

    <!-- 黑名单列表 -->
    <scroll-view class="blocklist-scroll" scroll-y :show-scrollbar="false" v-if="blockedCreators.length > 0">
      <view class="creator-list">
        <view v-for="creator in blockedCreators" :key="creator.username" class="creator-item">
          <image v-if="creator.avatar && !isPresetAvatar(creator.avatar)" class="creator-avatar" :src="creator.avatar" mode="aspectFill" />
          <view v-else class="creator-avatar preset" :style="getPresetAvatarStyle(creator.avatar)">
            <text class="avatar-text">{{ getPresetAvatarGlyph(creator.avatar) }}</text>
          </view>
          <view class="creator-info">
            <text class="creator-name">{{ creator.nickname || creator.username }}</text>
            <text class="creator-username">@{{ creator.username }}</text>
          </view>
          <view class="unblock-btn" @click="unblockCreator(creator)">
            <text>移除</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <text class="empty-icon">🛡️</text>
      <text class="empty-title">黑名单为空</text>
      <text class="empty-desc">您还没有拉黑任何创作者</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { communityService } from '../../services/pin/index'
import { getPresetAvatarImage, getPresetAvatarMeta, isPresetAvatarValue } from '@/utils/avatar-presets'

interface BlockedCreator {
  username: string
  nickname?: string
  avatar?: string
}

const blockedCreators = ref<BlockedCreator[]>([])
const loading = ref(false)

/**
 * 页面加载时获取黑名单
 */
onMounted(() => {
  loadBlocklist()
})

/**
 * 加载黑名单列表
 */
const loadBlocklist = async () => {
  loading.value = true
  try {
    // 获取拉黑的用户名列表
    const usernames = await communityService.getBlockedCreators()
    
    // 获取每个创作者的详细信息
    const creators: BlockedCreator[] = []
    for (const username of usernames) {
      try {
        const profile = await communityService.getCreatorProfile(username)
        creators.push({
          username,
          nickname: profile.nickname,
          avatar: profile.avatar
        })
      } catch (e) {
        // 如果获取失败，至少显示用户名
        creators.push({ username })
      }
    }
    
    blockedCreators.value = creators
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 移除黑名单
 */
const unblockCreator = async (creator: BlockedCreator) => {
  uni.showModal({
    title: '确认移除',
    content: `确定将 ${creator.nickname || creator.username} 从黑名单移除吗？`,
    confirmText: '移除',
    cancelText: '取消',
    success: async (res) => {
      if (res.confirm) {
        try {
          await communityService.unblockCreator(creator.username)
          // 从列表中移除
          blockedCreators.value = blockedCreators.value.filter(c => c.username !== creator.username)
          uni.showToast({ title: '已移除', icon: 'success' })
        } catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    }
  })
}

/**
 * 检查是否为预设头像
 */
const isPresetAvatar = (avatar?: string): boolean => {
  return !avatar || isPresetAvatarValue(avatar)
}

/**
 * 获取预设头像样式
 */
const getPresetAvatarStyle = (avatar?: string) => {
  const meta = getPresetAvatarMeta(avatar)
  return {
    backgroundColor: meta?.bg || '#FFE3DA',
    color: meta?.fg || '#B56A58'
  }
}

/**
 * 获取预设头像文字
 */
const getPresetAvatarGlyph = (avatar?: string): string => {
  return getPresetAvatarMeta(avatar)?.glyph || '用'
}

/**
 * 返回上一页
 */
const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.blocklist-page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
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

/* 说明区域 */
.info-section {
  padding: 24rpx 32rpx;
  background-color: rgba(206, 123, 29, 0.08);
}

.info-text {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* 列表区域 */
.blocklist-scroll {
  height: calc(100vh - 200rpx);
}

.creator-list {
  padding: 24rpx;
}

.creator-item {
  display: flex;
  align-items: center;
  background-color: var(--color-bg-panel);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.creator-avatar {
  width: 80rpx;
  height: 80rpx;
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
  font-size: 36rpx;
}

.creator-info {
  flex: 1;
}

.creator-name {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 4rpx;
}

.creator-username {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

.unblock-btn {
  padding: 16rpx 32rpx;
  background-color: var(--color-bg-page);
  border-radius: 32rpx;
  border: 2rpx solid var(--color-border);
}

.unblock-btn text {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 40rpx;
}

.empty-icon {
  font-size: 100rpx;
  margin-bottom: 32rpx;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: var(--color-text-tertiary);
}
</style>
