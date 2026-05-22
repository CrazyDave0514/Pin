<template>
  <view class="avatar-crop-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <text class="back-icon">←</text>
        </view>
        <text class="nav-title">更换头像</text>
        <view class="nav-save" @click="saveAvatar">
          <text class="save-text">保存</text>
        </view>
      </view>
    </view>

    <!-- 头像预览 -->
    <view class="preview-section">
      <view class="preview-wrapper">
        <image
          class="avatar-preview"
          :src="avatarUrl || '/static/default-avatar.png'"
          mode="aspectFill"
        />
      </view>
      <text class="preview-hint">点击下方按钮选择新头像</text>
    </view>

    <!-- 上传选项 -->
    <view class="upload-options">
      <!-- 预设头像 -->
      <view class="preset-section">
        <text class="section-title">选择预设头像</text>
        <view class="preset-grid">
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

      <!-- 自定义上传 -->
      <view class="custom-upload">
        <button class="upload-btn" @click="chooseImage">从相册选择</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

/** 状态栏高度 */
const statusBarHeight = ref(44)

/** 头像预览URL */
const avatarUrl = ref('')

/** 选中的预设头像索引 */
const selectedPreset = ref(-1)

/** 预设头像列表 */
const presetAvatars = [
  '/static/default-avatar.png',
  '/static/default-avatar-male.png',
  '/static/default-avatar-female.png',
]

onMounted(() => {
  /** 获取系统状态栏高度 */
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 44

  /** 从本地存储加载当前头像 */
  const userData = uni.getStorageSync('pin_user')
  if (userData && userData.avatar) {
    avatarUrl.value = userData.avatar
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
  background-color: #f5f5f5;
}

.nav-bar {
  background-color: #fff;
  border-bottom: 1rpx solid #e8e8e8;
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}

.nav-back {
  width: 120rpx;
}

.back-icon {
  font-size: 36rpx;
  color: #333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.nav-save {
  width: 120rpx;
  text-align: right;
}

.save-text {
  font-size: 28rpx;
  color: #007aff;
  font-weight: 500;
}

.preview-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
  background-color: #fff;
}

.preview-wrapper {
  width: 240rpx;
  height: 240rpx;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
}

.avatar-preview {
  width: 100%;
  height: 100%;
}

.preview-hint {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #999;
}

.upload-options {
  padding: 32rpx 24rpx;
}

.preset-section {
  margin-bottom: 40rpx;
}

.section-title {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 24rpx;
  display: block;
}

.preset-grid {
  display: flex;
  gap: 24rpx;
  flex-wrap: wrap;
}

.preset-item {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 4rpx solid transparent;
  transition: all 0.2s;
}

.preset-item.selected {
  border-color: #007aff;
  transform: scale(1.05);
}

.preset-image {
  width: 100%;
  height: 100%;
}

.custom-upload {
  margin-top: 32rpx;
}

.upload-btn {
  width: 100%;
  height: 88rpx;
  background-color: #007aff;
  color: #fff;
  font-size: 30rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.upload-btn:active {
  background-color: #005bb5;
}
</style>
