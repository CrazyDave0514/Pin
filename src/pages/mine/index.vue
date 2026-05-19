<template>
  <view class="mine-page">
    <!-- 用户信息区 -->
    <view class="user-section">
      <view class="user-info" @click="handleLogin">
        <template v-if="user">
          <image class="user-avatar" :src="user.avatar || defaultAvatar" />
          <text class="user-name">{{ user.username }}</text>
          <text class="user-uid">UID: {{ user.uid }}</text>
        </template>
        <template v-else>
          <view class="user-avatar default" />
          <text class="login-text">点击登录</text>
        </template>
      </view>
    </view>

    <!-- 数据概览 -->
    <view class="stats-section">
      <view class="stat-item">
        <text class="stat-value">{{ stats.artworks }}</text>
        <text class="stat-label">我的作品</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.favorites }}</text>
        <text class="stat-label">我的收藏</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.likes }}</text>
        <text class="stat-label">我的获赞</text>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="function-section">
      <view
        v-for="(item, index) in functionList"
        :key="index"
        class="function-item"
        @click="handleFunctionClick(item.path)"
      >
        <text class="function-icon">{{ item.icon }}</text>
        <text class="function-name">{{ item.name }}</text>
        <text class="function-arrow">→</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const user = ref<any>(null)
const defaultAvatar = ''
const stats = ref({
  artworks: 0,
  favorites: 0,
  likes: 0,
})

const functionList = [
  { icon: '💰', name: '积分中心', path: '/pages/points/index' },
  { icon: '🫘', name: '豆仓管理', path: '/pages/bead-inventory/index' },
  { icon: '📞', name: '联系作者', path: '/pages/contact/index' },
  { icon: '⚙️', name: '更多设置', path: '/pages/settings/index' },
]

onMounted(() => {
  loadUser()
})

onShow(() => {
  loadUser()
})

const loadUser = () => {
  const userData = uni.getStorageSync('pin_user')
  user.value = userData
}

const handleLogin = () => {
  if (!user.value) {
    uni.navigateTo({ url: '/pages/login/index' })
  }
}

const handleFunctionClick = (path: string) => {
  uni.navigateTo({ url: path })
}
</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 40rpx;
}

.user-section {
  background-color: #FFFFFF;
  padding: 96rpx 64rpx;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.user-avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  border: 4rpx solid #FFFFFF;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
  margin-bottom: 24rpx;
}

.user-avatar.default {
  background-color: #E8E8E8;
}

.user-name {
  font-size: 36rpx;
  color: #2D2D2D;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.user-uid {
  font-size: 24rpx;
  color: #999999;
}

.login-text {
  font-size: 28rpx;
  color: #666666;
}

.stats-section {
  display: flex;
  background-color: #FFFFFF;
  padding: 32rpx 0;
  margin-bottom: 16rpx;
  border-top: 2rpx solid #E8E8E8;
  border-bottom: 2rpx solid #E8E8E8;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 2rpx solid #E8E8E8;
}

.stat-item:last-child {
  border-right: none;
}

.stat-value {
  font-size: 36rpx;
  color: #2D2D2D;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #666666;
}

.function-section {
  background-color: #FFFFFF;
}

.function-item {
  display: flex;
  align-items: center;
  height: 104rpx;
  padding: 0 32rpx;
  border-bottom: 2rpx solid #E8E8E8;
}

.function-item:last-child {
  border-bottom: none;
}

.function-item:active {
  background-color: #F5F5F5;
}

.function-icon {
  font-size: 40rpx;
  margin-right: 24rpx;
}

.function-name {
  flex: 1;
  font-size: 28rpx;
  color: #2D2D2D;
}

.function-arrow {
  font-size: 32rpx;
  color: #CCCCCC;
}
</style>
