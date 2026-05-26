<template>
  <!-- 登录/创建账号页面 -->
  <view class="login-page">
    <!-- 顶部标题区 -->
    <view class="header-section">
      <text class="title">创建账号</text>
      <text class="subtitle">开启你的拼豆创作之旅</text>
    </view>

    <!-- 上次登录账号（如果存在） -->
    <view v-if="lastUser" class="last-user-section">
      <text class="section-label">上次登录</text>
      <view class="last-user-card" @click="quickLogin">
        <view class="user-avatar">
          <text class="avatar-text">{{ lastUser.username.charAt(0) }}</text>
        </view>
        <view class="user-info">
          <text class="user-name">{{ lastUser.username }}</text>
          <text class="user-id">{{ lastUser.uid }}</text>
        </view>
        <text class="login-arrow">→</text>
      </view>
      <view class="divider">
        <view class="divider-line"></view>
        <text class="divider-text">或</text>
        <view class="divider-line"></view>
      </view>
    </view>

    <!-- 创建新账号表单 -->
    <view class="form-section">
      <text class="section-label">创建新账号</text>
      
      <view class="input-group">
        <text class="input-label">用户名</text>
        <input
          class="input-field"
          v-model="username"
          placeholder="请输入用户名（2-16个字符）"
          placeholder-class="placeholder-text"
          maxlength="16"
        />
      </view>

      <!-- 错误提示 -->
      <text v-if="error" class="error-text">{{ error }}</text>

      <!-- 提示信息 -->
      <view class="tips">
        <text class="tip-item">• 支持中文、英文、数字</text>
        <text class="tip-item">• 长度 2-16 个字符</text>
        <text class="tip-item">• 创建后可在"我的"页面修改</text>
      </view>

      <!-- 创建按钮 -->
      <button class="submit-btn" :disabled="!username" @click="handleCreate">
        创建账号
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { authService } from '../../services/pin/index'

// 用户名输入
const username = ref('')
// 错误信息
const error = ref('')
// 上次登录的用户
const lastUser = ref<any>(null)

/**
 * 页面加载时检查是否有上次登录的用户
 */
onMounted(async () => {
  const userList = await authService.getUserList()
  if (userList.length > 0) {
    // 获取最后一个登录的用户
    lastUser.value = userList[userList.length - 1]
  }
})

/**
 * 验证用户名
 * @param name 用户名
 * @returns 是否有效
 */
const validateUsername = (name: string): boolean => {
  if (name.length < 2 || name.length > 16) {
    error.value = '用户名长度需在 2-16 个字符之间'
    return false
  }
  const pattern = /^[\u4e00-\u9fa5a-zA-Z0-9]+$/
  if (!pattern.test(name)) {
    error.value = '用户名只能包含中文、英文、数字'
    return false
  }
  return true
}

/**
 * 快速登录（使用上次登录的账号）
 */
const quickLogin = async () => {
  if (!lastUser.value) return
  
  await authService.quickLogin(lastUser.value)
  
  uni.showToast({ title: '登录成功', icon: 'success' })
  setTimeout(() => {
    uni.switchTab({ url: '/pages/mine/index' })
  }, 1500)
}

/**
 * 创建新账号
 */
const handleCreate = async () => {
  error.value = ''
  
  if (!validateUsername(username.value)) return
  
  // 检查用户名是否已存在
  const userList = await authService.getUserList()
  if (userList.some((u: any) => u.username === username.value)) {
    error.value = '用户名已被使用'
    return
  }

  await authService.register(username.value)
  
  uni.showToast({ title: '创建成功', icon: 'success' })
  setTimeout(() => {
    uni.switchTab({ url: '/pages/mine/index' })
  }, 1500)
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background-color: var(--color-bg-panel);
  padding: 48rpx 40rpx;
}

/* 顶部标题区 */
.header-section {
  margin-bottom: 64rpx;
  padding-top: 40rpx;
}

.title {
  display: block;
  font-size: 48rpx;
  color: var(--color-text-primary);
  font-weight: 600;
  margin-bottom: 16rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: var(--color-text-tertiary);
}

/* 上次登录区域 */
.last-user-section {
  margin-bottom: 48rpx;
}

.section-label {
  display: block;
  font-size: 26rpx;
  color: var(--color-text-secondary);
  margin-bottom: 24rpx;
}

.last-user-card {
  display: flex;
  align-items: center;
  background-color: var(--color-bg-page);
  border-radius: var(--radius-lg);
  padding: 28rpx 32rpx;
  box-shadow: var(--shadow-md);
}

.user-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 44rpx;
  background-color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.avatar-text {
  font-size: 36rpx;
  color: var(--color-bg-panel);
  font-weight: 500;
}

.user-info {
  flex: 1;
}

.user-name {
  display: block;
  font-size: 30rpx;
  color: var(--color-text-primary);
  font-weight: 500;
  margin-bottom: 4rpx;
}

.user-id {
  display: block;
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

.login-arrow {
  font-size: 36rpx;
  color: var(--color-text-disabled);
}

/* 分隔线 */
.divider {
  display: flex;
  align-items: center;
  margin-top: 40rpx;
}

.divider-line {
  flex: 1;
  height: 2rpx;
  background-color: var(--color-border);
}

.divider-text {
  font-size: 24rpx;
  color: var(--color-text-disabled);
  padding: 0 24rpx;
}

/* 表单区域 */
.form-section {
  margin-top: 16rpx;
}

.input-group {
  margin-bottom: 24rpx;
}

.input-label {
  display: block;
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 500;
  margin-bottom: 16rpx;
}

.input-field {
  width: 100%;
  height: 96rpx;
  background-color: var(--color-bg-page);
  border-radius: 20rpx;
  padding: 0 32rpx;
  font-size: 30rpx;
  color: var(--color-text-primary);
  border: 2rpx solid transparent;
  box-sizing: border-box;
}

.input-field:focus {
  border-color: var(--color-text-primary);
  background-color: var(--color-bg-panel);
}

.placeholder-text {
  color: var(--color-text-disabled);
}

.error-text {
  display: block;
  font-size: 26rpx;
  color: var(--color-error);
  margin-bottom: 24rpx;
}

/* 提示信息 */
.tips {
  margin-bottom: 48rpx;
}

.tip-item {
  display: block;
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  line-height: 1.8;
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  height: 96rpx;
  background-color: var(--color-primary);
  color: var(--color-bg-panel);
  font-size: 32rpx;
  font-weight: 500;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.submit-btn[disabled] {
  background-color: var(--color-text-disabled);
}
</style>
