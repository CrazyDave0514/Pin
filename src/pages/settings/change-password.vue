<template>
  <!-- 修改密码页 V0.2.1 -->
  <view class="change-password-page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @click="goBack">
        <image class="back-icon" src="/static/assets/v015/icons/back.png" mode="aspectFit" />
      </view>
      <text class="nav-title">修改密码</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 表单区域 -->
    <view class="form-section">
      <!-- 旧密码 -->
      <view class="input-group">
        <text class="input-label">当前密码</text>
        <input
          class="input-field"
          v-model="oldPassword"
          type="password"
          placeholder="请输入当前密码"
          placeholder-class="placeholder-text"
          maxlength="32"
          @input="clearError"
        />
      </view>

      <!-- 新密码 -->
      <view class="input-group">
        <text class="input-label">新密码</text>
        <input
          class="input-field"
          v-model="newPassword"
          type="password"
          placeholder="至少6个字符"
          placeholder-class="placeholder-text"
          maxlength="32"
          @input="clearError"
        />
      </view>

      <!-- 确认密码 -->
      <view class="input-group">
        <text class="input-label">确认新密码</text>
        <input
          class="input-field"
          v-model="confirmPassword"
          type="password"
          placeholder="请再次输入新密码"
          placeholder-class="placeholder-text"
          maxlength="32"
          @input="clearError"
        />
      </view>

      <!-- 错误提示 -->
      <view v-if="error" class="error-box">
        <text class="error-text">{{ error }}</text>
      </view>

      <!-- 提交按钮 -->
      <button 
        class="submit-btn" 
        :class="{ loading: loading }"
        :disabled="!isFormValid || loading" 
        @click="handleSubmit"
      >
        <text v-if="loading" class="btn-text">提交中...</text>
        <text v-else class="btn-text">确认修改</text>
      </button>

      <!-- 忘记密码入口 -->
      <view class="forgot-link-row">
        <text class="forgot-link-text">忘记密码？</text>
        <text class="forgot-link" @click="goToForgotPassword">通过邮箱重置</text>
      </view>
    </view>

    <!-- 安全提示 -->
    <view class="tips-section">
      <text class="tips-title">安全提示</text>
      <text class="tips-item">• 密码长度至少6个字符</text>
      <text class="tips-item">• 建议使用字母、数字组合</text>
      <text class="tips-item">• 定期更换密码可提高账号安全性</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { pinDataProvider } from '../../services/pin/index'

// 表单数据
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// 状态
const error = ref('')
const loading = ref(false)

/**
 * 清除错误信息
 */
const clearError = () => {
  error.value = ''
}

/**
 * 表单是否有效
 */
const isFormValid = computed(() => {
  return oldPassword.value.length >= 6 && 
         newPassword.value.length >= 6 && 
         confirmPassword.value.length >= 6
})

/**
 * 验证密码
 */
const validatePassword = (): boolean => {
  if (oldPassword.value.length < 6) {
    error.value = '请输入当前密码'
    return false
  }
  if (newPassword.value.length < 6) {
    error.value = '新密码长度至少6个字符'
    return false
  }
  if (newPassword.value === oldPassword.value) {
    error.value = '新密码不能与旧密码相同'
    return false
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return false
  }
  return true
}

/**
 * 提交修改
 */
const handleSubmit = async () => {
  error.value = ''

  if (!validatePassword()) return

  loading.value = true

  try {
    await pinDataProvider.request('POST', '/auth/change-password', {
      oldPassword: oldPassword.value,
      newPassword: newPassword.value
    })

    uni.showToast({ title: '密码修改成功', icon: 'success' })

    // 返回设置页
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (e: any) {
    if (e.message?.includes('password')) {
      error.value = '当前密码错误'
    } else {
      error.value = e.message || '密码修改失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}

/**
 * 返回上一页
 */
const goBack = () => {
  uni.navigateBack()
}

/**
 * 跳转到忘记密码页
 */
const goToForgotPassword = () => {
  uni.navigateTo({ url: '/pages/forgot-password/index' })
}
</script>

<style scoped>
.change-password-page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
  padding-bottom: 40rpx;
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

/* 表单区域 */
.form-section {
  padding: 40rpx;
}

.input-group {
  margin-bottom: 28rpx;
}

.input-label {
  display: block;
  font-size: 26rpx;
  color: var(--color-text-primary);
  font-weight: 500;
  margin-bottom: 12rpx;
}

.input-field {
  width: 100%;
  height: 88rpx;
  background-color: var(--color-bg-panel);
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: var(--color-text-primary);
  border: 2rpx solid transparent;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.input-field:focus {
  border-color: var(--color-primary);
}

.placeholder-text {
  color: var(--color-text-disabled);
}

/* 错误提示 */
.error-box {
  background-color: rgba(207, 92, 77, 0.1);
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  margin-bottom: 24rpx;
}

.error-text {
  font-size: 24rpx;
  color: var(--color-error);
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  height: 92rpx;
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  font-size: 32rpx;
  font-weight: 500;
  border-radius: 46rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  margin-top: 48rpx;
  transition: all 0.2s ease;
}

.submit-btn:active {
  background-color: var(--color-primary-dark);
  transform: scale(0.98);
}

.submit-btn[disabled] {
  background-color: var(--color-text-disabled);
  color: var(--color-bg-panel);
}

.submit-btn.loading {
  opacity: 0.7;
}

.btn-text {
  color: inherit;
}

/* 忘记密码入口 */
.forgot-link-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 32rpx;
}

.forgot-link-text {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.forgot-link {
  font-size: 26rpx;
  color: var(--color-primary);
  font-weight: 500;
  margin-left: 8rpx;
}

/* 安全提示 */
.tips-section {
  margin: 0 40rpx;
  padding: 32rpx;
  background-color: var(--color-bg-panel);
  border-radius: 16rpx;
}

.tips-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16rpx;
  display: block;
}

.tips-item {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  line-height: 1.8;
  display: block;
}
</style>
