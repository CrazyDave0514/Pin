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
              :src="formData.avatar || '/static/default-avatar.png'"
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

        <!-- 性别 -->
        <view class="form-item gender-item">
          <text class="form-label">性别</text>
          <view class="gender-options">
            <view
              class="gender-option"
              :class="{ active: formData.gender === 'male' }"
              @click="formData.gender = 'male'"
            >
              <text class="gender-radio" :class="{ checked: formData.gender === 'male' }">
                {{ formData.gender === 'male' ? '●' : '○' }}
              </text>
              <text class="gender-text" :class="{ 'text-male': formData.gender === 'male' }">男</text>
            </view>
            <view
              class="gender-option"
              :class="{ active: formData.gender === 'female' }"
              @click="formData.gender = 'female'"
            >
              <text class="gender-radio" :class="{ checked: formData.gender === 'female' }">
                {{ formData.gender === 'female' ? '●' : '○' }}
              </text>
              <text class="gender-text" :class="{ 'text-female': formData.gender === 'female' }">女</text>
            </view>
            <view
              class="gender-option"
              :class="{ active: formData.gender === 'secret' }"
              @click="formData.gender = 'secret'"
            >
              <text class="gender-radio" :class="{ checked: formData.gender === 'secret' }">
                {{ formData.gender === 'secret' ? '●' : '○' }}
              </text>
              <text class="gender-text" :class="{ 'text-secret': formData.gender === 'secret' }">保密</text>
            </view>
          </view>
        </view>

        <!-- 出生日期 -->
        <view class="form-item">
          <text class="form-label">出生日期</text>
          <picker mode="date" :value="formData.birthday" :start="'1900-01-01'" :end="today" @change="onBirthdayChange">
            <view class="form-value-wrapper">
              <text class="form-value" :class="{ placeholder: !formData.birthday }">
                {{ formData.birthday || '请选择出生日期' }}
              </text>
            </view>
          </picker>
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
  gender: 'secret' as 'male' | 'female' | 'secret',
  birthday: '',
})

/** 状态栏高度 */
const statusBarHeight = ref(44)

/** 今日日期字符串 */
const today = new Date().toISOString().split('T')[0]

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
    formData.gender = userData.gender || 'secret'
    formData.birthday = userData.birthday || ''
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
 * 日期选择变更回调
 * @param e - 日期选择事件
 */
const onBirthdayChange = (e: any) => {
  formData.birthday = e.detail.value
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
    gender: formData.gender,
    birthday: formData.birthday,
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
  background-color: #F5F5F5;
  display: flex;
  flex-direction: column;
}

/* 自定义导航栏 */
.nav-bar {
  background-color: #FFFFFF;
  position: sticky;
  top: 0;
  z-index: 100;
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
  font-size: 40rpx;
  color: #2D2D2D;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2D2D2D;
}

.nav-placeholder {
  width: 64rpx;
}

/* 表单滚动区域 */
.form-scroll {
  flex: 1;
  padding: 24rpx 0;
}

.form-section {
  background-color: #FFFFFF;
  margin-bottom: 24rpx;
}

/* 表单项 */
.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 100rpx;
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid #F0F0F0;
}

.form-item:last-child {
  border-bottom: none;
}

.form-label {
  font-size: 30rpx;
  color: #2D2D2D;
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
  background-color: #F0F0F0;
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
  color: #2D2D2D;
}

.input-placeholder {
  color: #CCCCCC;
  font-size: 28rpx;
}

.char-count {
  font-size: 24rpx;
  color: #999999;
  flex-shrink: 0;
}

/* 性别选择 */
.gender-item {
  flex-wrap: wrap;
}

.gender-options {
  display: flex;
  gap: 32rpx;
}

.gender-option {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 0;
}

.gender-radio {
  font-size: 32rpx;
  color: #CCCCCC;
}

.gender-radio.checked {
  color: #007AFF;
}

.gender-text {
  font-size: 28rpx;
  color: #666666;
}

.gender-text.text-male {
  color: #007AFF;
}

.gender-text.text-female {
  color: #FF6B9D;
}

.gender-text.text-secret {
  color: #999999;
}

/* 右侧值展示 */
.form-value-wrapper {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.form-value {
  font-size: 28rpx;
  color: #2D2D2D;
}

.form-value.placeholder {
  color: #CCCCCC;
}

.form-arrow {
  font-size: 28rpx;
  color: #CCCCCC;
}

/* 保存按钮 */
.save-section {
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: #FFFFFF;
}

.save-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background-color: #007AFF;
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 12rpx;
  border: none;
}

.save-btn.disabled {
  background-color: #CCCCCC;
}

.save-btn::after {
  border: none;
}
</style>
