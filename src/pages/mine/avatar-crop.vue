<template>
  <view class="avatar-crop-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <text class="back-icon">←</text>
        </view>
        <text class="nav-title">更换头像</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <!-- 上传选项 -->
    <view class="upload-options">
      <text class="section-title">选择头像</text>
      <view class="preset-grid">
        <view
          class="preset-item upload-tile"
          :class="{ selected: selectedPreset === -1 && avatarUrl && !isPresetAvatar }"
          @click="chooseImage"
        >
          <image class="upload-icon" src="/static/assets/v015/icons/image-import-active.png" mode="aspectFit" />
          <text class="upload-label">自定义</text>
        </view>
        <view
          v-for="(preset, index) in presetAvatars"
          :key="index"
          class="preset-item"
          :class="{ selected: selectedPreset === index }"
          @click="selectPreset(index)"
        >
          <image class="preset-image" :src="preset" mode="aspectFill" />
        </view>
      </view>
    </view>

    <view class="save-section">
      <button class="save-btn" @click="saveAvatar">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

/** 状态栏高度 */
const statusBarHeight = ref(44)

/** 头像预览URL */
const avatarUrl = ref('')

/** 选中的预设头像索引 */
const selectedPreset = ref(-1)

/** 预设头像列表 */
const presetAvatars = [
  '/static/assets/v017/avatars/avatar-rat.svg',
  '/static/assets/v017/avatars/avatar-ox.svg',
  '/static/assets/v017/avatars/avatar-tiger.svg',
  '/static/assets/v017/avatars/avatar-rabbit.svg',
  '/static/assets/v017/avatars/avatar-dragon.svg',
  '/static/assets/v017/avatars/avatar-snake.svg',
  '/static/assets/v017/avatars/avatar-horse.svg',
  '/static/assets/v017/avatars/avatar-goat.svg',
  '/static/assets/v017/avatars/avatar-monkey.svg',
  '/static/assets/v017/avatars/avatar-rooster.svg',
  '/static/assets/v017/avatars/avatar-dog.svg',
  '/static/assets/v017/avatars/avatar-pig.svg',
]

const isPresetAvatar = computed(() => presetAvatars.includes(avatarUrl.value))

onMounted(() => {
  /** 获取系统状态栏高度 */
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 44

  /** 从本地存储加载当前头像 */
  const userData = uni.getStorageSync('pin_user')
  if (userData && userData.avatar) {
    avatarUrl.value = userData.avatar
    selectedPreset.value = presetAvatars.indexOf(userData.avatar)
  } else {
    avatarUrl.value = presetAvatars[0]
    selectedPreset.value = 0
  }
})

/**
 * 选择预设头像
 */
const selectPreset = (index: number) => {
  selectedPreset.value = index
  avatarUrl.value = presetAvatars[index]
}

/**
 * 从相册选择图片（使用 uni API）
 */
const chooseImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album'],
    success: (res) => {
      // 优先使用本地临时文件路径
      const tempPath = res.tempFilePaths?.[0]
      if (tempPath) {
        avatarUrl.value = tempPath
        selectedPreset.value = -1
      }
    },
    fail: (err) => {
      console.error('选择图片失败:', err)
      uni.showToast({ title: '选择失败，请重试', icon: 'none' })
    },
  })
}

/**
 * 保存头像
 */
const saveAvatar = () => {
  /** 获取当前用户数据 */
  const userData = uni.getStorageSync('pin_user') || {}
  userData.avatar = avatarUrl.value
  uni.setStorageSync('pin_user', userData)

  /** 发送全局事件通知头像已更新 */
  uni.$emit('avatarUpdated', { avatar: avatarUrl.value })

  uni.showToast({ title: '头像已保存', icon: 'success' })

  /** 返回上一页 */
  setTimeout(() => {
    uni.navigateBack()
  }, 1000)
}

/**
 * 返回上一页
 */
const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.avatar-crop-page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
  padding-bottom: 160rpx;
}

.nav-bar {
  background-color: var(--color-bg-panel);
  border-bottom: 2rpx solid var(--color-border);
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}

.nav-back,
.nav-placeholder {
  width: 120rpx;
}

.back-icon {
  font-size: 36rpx;
  color: var(--color-text-primary);
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.upload-options {
  margin: 24rpx;
  padding: 28rpx;
  background-color: var(--color-bg-panel);
  border: 2rpx solid var(--color-border);
  border-radius: 24rpx;
  box-shadow: var(--shadow-md);
}

.section-title {
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 700;
  margin-bottom: 24rpx;
  display: block;
}

.preset-grid {
  display: flex;
  gap: 18rpx;
  flex-wrap: wrap;
  align-items: center;
}

.preset-item {
  width: calc((100% - 72rpx) / 5);
  aspect-ratio: 1;
  border-radius: 50%;
  overflow: hidden;
  border: 4rpx solid var(--color-border);
  transition: all 0.2s;
  box-sizing: border-box;
}

.preset-item.selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 6rpx var(--color-primary-light);
  transform: scale(1.05);
}

.preset-image {
  width: 100%;
  height: 100%;
}

.upload-tile {
  background-color: var(--color-primary-light);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-color: var(--color-primary);
  gap: 4rpx;
}

.upload-icon {
  width: 34rpx;
  height: 34rpx;
}

.upload-label {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--color-primary-dark);
}

.save-section {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: rgba(255,253,250,.96);
  border-top: 2rpx solid var(--color-border);
}

.save-btn {
  width: 100%;
  height: 88rpx;
  background-color: var(--color-primary);
  color: var(--color-text-primary);
  font-size: 30rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.save-btn:active {
  background-color: var(--color-primary-dark);
}
</style>
