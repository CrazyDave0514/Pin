<template>
  <view class="edit-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <text class="back-icon">←</text>
        </view>
        <text class="nav-title">编辑资料</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <!-- 表单内容 -->
    <scroll-view class="form-scroll" scroll-y>
      <!-- 头像 -->
      <view class="form-section">
        <view class="form-item avatar-item" @click="changeAvatar">
          <text class="form-label">头像</text>
          <view class="avatar-right">
            <image
              class="avatar-preview"
              :src="formData.avatar || '/static/assets/v017/avatars/avatar-rat.svg'"
              mode="aspectFill"
            />
          </view>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="form-section">
        <!-- 昵称 -->
        <view class="form-item">
          <text class="form-label">昵称</text>
          <view class="form-input-wrapper">
            <input
              class="form-input"
              type="text"
              v-model="formData.username"
              placeholder="请输入昵称"
              :maxlength="20"
              placeholder-class="input-placeholder"
            />
            <text class="char-count">{{ formData.username.length }}/20</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 保存按钮 -->
    <view class="save-section">
      <button class="save-btn" :class="{ disabled: !canSave }" @click="saveProfile">
        保存
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'

/** 表单数据 */
const formData = reactive({
  username: '',
  avatar: '',
})

/** 状态栏高度 */
const statusBarHeight = ref(44)

/** 是否可以保存 */
const canSave = computed(() => {
  return formData.username.trim().length >= 2
})

onMounted(() => {
  /** 获取系统状态栏高度 */
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 44

  /** 监听头像更新事件 */
  uni.$on('avatarUpdated', handleAvatarUpdate)
})

onUnmounted(() => {
  /** 移除事件监听 */
  uni.$off('avatarUpdated', handleAvatarUpdate)
})

/** 页面显示时刷新数据 */
onShow(() => {
  loadUserData()
})

/**
 * 处理头像更新事件
 * @param data - 头像数据
 */
const handleAvatarUpdate = (data: { avatar: string }) => {
  if (data && data.avatar) {
    formData.avatar = data.avatar
  }
}

/**
 * 加载用户数据到表单
 */
const loadUserData = () => {
  const userData = uni.getStorageSync('pin_user')
  if (userData) {
    formData.username = userData.username || ''
    formData.avatar = userData.avatar || ''
  }
}

/**
 * 跳转到头像裁切页面
 */
const changeAvatar = () => {
  uni.navigateTo({
    url: '/pages/mine/avatar-crop',
    events: {
      /** 监听头像裁切完成事件 */
      avatarCropped: (data: { avatar: string }) => {
        if (data && data.avatar) {
          formData.avatar = data.avatar
        }
      }
    },
    success: () => {
      console.log('跳转成功')
    },
    fail: (err) => {
      console.error('跳转失败:', err)
      /** 降级：提示用户 */
      uni.showToast({ title: '头像功能暂不可用', icon: 'none' })
    }
  })
}

/**
 * 保存用户资料
 */
const saveProfile = () => {
  /** 校验昵称 */
  const username = formData.username.trim()
  if (username.length < 2) {
    uni.showToast({ title: '昵称至少2个字符', icon: 'none' })
    return
  }
  if (username.length > 20) {
    uni.showToast({ title: '昵称最多20个字符', icon: 'none' })
    return
  }

  /** 读取现有用户数据并合并更新 */
  const userData = uni.getStorageSync('pin_user') || {}
  const updatedUser = {
    ...userData,
    username: formData.username.trim(),
    avatar: formData.avatar,
  }

  /** 写入本地存储 */
  uni.setStorageSync('pin_user', updatedUser)

  uni.showToast({ title: '保存成功', icon: 'success' })

  /** 延迟返回上一页 */
  setTimeout(() => {
    uni.navigateBack()
  }, 1500)
}

/**
 * 返回上一页
 */
const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.edit-page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
  display: flex;
  flex-direction: column;
}

/* 自定义导航栏 */
.nav-bar {
  background-color: var(--color-bg-panel);
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 2rpx solid var(--color-border);
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}

.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 36rpx;
  color: var(--color-text-primary);
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.nav-placeholder {
  width: 64rpx;
}

/* 表单滚动区域 */
.form-scroll {
  flex: 1;
  padding: 24rpx;
  box-sizing: border-box;
}

.form-section {
  background-color: var(--color-bg-panel);
  margin-bottom: 24rpx;
  border: 2rpx solid var(--color-border);
  border-radius: 24rpx;
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

/* 表单项 */
.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 100rpx;
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid var(--color-divider);
}

.form-item:last-child {
  border-bottom: none;
}

.form-label {
  font-size: 30rpx;
  color: var(--color-text-primary);
  flex-shrink: 0;
  width: 160rpx;
}

/* 头像项 */
.avatar-item {
  padding: 24rpx 32rpx;
}

.avatar-right {
  display: flex;
  align-items: center;
}

.avatar-preview {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: var(--color-primary-soft);
  border: 4rpx solid var(--color-bg-panel);
  box-shadow: var(--shadow-sm);
}

/* 输入框 */
.form-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16rpx;
}

.form-input {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: var(--color-text-primary);
}

.input-placeholder {
  color: var(--color-text-disabled);
  font-size: 28rpx;
}

.char-count {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

/* 性别选择 */
.gender-item {
  flex-wrap: wrap;
}

.gender-options {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.gender-option {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background-color: var(--color-bg-page);
  border: 2rpx solid transparent;
}

.gender-option.active {
  background-color: var(--color-primary-light);
  border-color: var(--color-primary);
}

.gender-radio {
  font-size: 32rpx;
  color: var(--color-text-disabled);
}

.gender-radio.checked {
  color: var(--color-primary);
}

.gender-text {
  font-size: 28rpx;
  color: var(--color-text-secondary);
}

.gender-text.text-male {
  color: var(--color-primary);
}

.gender-text.text-female {
  color: #FF6B9D;
}

.gender-text.text-secret {
  color: var(--color-text-tertiary);
}

/* 右侧值展示 */
.form-value-wrapper {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.form-value {
  font-size: 28rpx;
  color: var(--color-text-primary);
}

.form-value.placeholder {
  color: var(--color-text-disabled);
}

.form-arrow {
  font-size: 28rpx;
  color: var(--color-text-disabled);
}

/* 保存按钮 */
.save-section {
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: rgba(255,253,250,.96);
  border-top: 2rpx solid var(--color-border);
}

.save-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background-color: var(--color-primary);
  color: var(--color-text-primary);
  font-size: 32rpx;
  font-weight: 600;
  border-radius: var(--radius-lg);
  border: none;
}

.save-btn.disabled {
  background-color: var(--color-bg-disabled);
  color: var(--color-text-disabled);
}

.save-btn::after {
  border: none;
}
</style>
