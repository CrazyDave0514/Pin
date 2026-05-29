<template>
  <!-- 忘记密码页面 V0.2.1 -->
  <view class="forgot-password-page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @click="goBack">
        <image class="back-icon" src="/static/assets/v015/icons/back.png" mode="aspectFit" />
      </view>
      <text class="nav-title">忘记密码</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 步骤指示器 -->
    <view class="step-indicator">
      <view class="step-item" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
        <view class="step-circle">1</view>
        <text class="step-text">验证邮箱</text>
      </view>
      <view class="step-line" :class="{ active: currentStep > 1 }"></view>
      <view class="step-item" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
        <view class="step-circle">2</view>
        <text class="step-text">重置密码</text>
      </view>
      <view class="step-line" :class="{ active: currentStep > 2 }"></view>
      <view class="step-item" :class="{ active: currentStep >= 3 }">
        <view class="step-circle">3</view>
        <text class="step-text">完成</text>
      </view>
    </view>

    <!-- 步骤1：验证邮箱 -->
    <view v-if="currentStep === 1" class="form-section">
      <view class="step-title">验证您的邮箱</view>
      <view class="step-desc">请输入注册时使用的邮箱地址，我们将发送验证码</view>

      <!-- 邮箱 -->
      <view class="input-group">
        <text class="input-label">邮箱地址</text>
        <input
          class="input-field"
          v-model="email"
          type="text"
          placeholder="请输入注册邮箱"
          placeholder-class="placeholder-text"
          maxlength="64"
          @input="clearError"
        />
      </view>

      <!-- 验证码 -->
      <view class="input-group">
        <text class="input-label">验证码</text>
        <view class="code-input-wrapper">
          <input
            class="input-field code-field"
            v-model="verifyCode"
            placeholder="请输入验证码"
            placeholder-class="placeholder-text"
            maxlength="6"
            @input="clearError"
          />
          <button 
            class="code-btn" 
            :disabled="!isEmailValid || codeCountdown > 0 || sendingCode"
            @click="sendVerifyCode"
          >
            <text v-if="sendingCode" class="code-btn-text">发送中...</text>
            <text v-else-if="codeCountdown > 0" class="code-btn-text">{{ codeCountdown }}s</text>
            <text v-else class="code-btn-text">获取验证码</text>
          </button>
        </view>
      </view>

      <!-- 错误提示 -->
      <view v-if="error" class="error-box">
        <text class="error-text">{{ error }}</text>
      </view>

      <!-- 下一步按钮 -->
      <button 
        class="submit-btn" 
        :disabled="!canProceedStep1 || loading"
        @click="verifyCodeAndProceed"
      >
        <text class="btn-text">下一步</text>
      </button>
    </view>

    <!-- 步骤2：重置密码 -->
    <view v-if="currentStep === 2" class="form-section">
      <view class="step-title">设置新密码</view>
      <view class="step-desc">请设置您的新密码，至少6个字符</view>

      <!-- 新密码 -->
      <view class="input-group">
        <text class="input-label">新密码</text>
        <input
          class="input-field"
          v-model="newPassword"
          type="password"
          placeholder="请输入新密码"
          placeholder-class="placeholder-text"
          maxlength="32"
          @input="clearError"
        />
      </view>

      <!-- 确认密码 -->
      <view class="input-group">
        <text class="input-label">确认密码</text>
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
        :disabled="!canProceedStep2 || loading"
        @click="resetPassword"
      >
        <text v-if="loading" class="btn-text">提交中...</text>
        <text v-else class="btn-text">重置密码</text>
      </button>
    </view>

    <!-- 步骤3：完成 -->
    <view v-if="currentStep === 3" class="success-section">
      <view class="success-icon">✓</view>
      <view class="success-title">密码重置成功</view>
      <view class="success-desc">您可以使用新密码登录了</view>
      <button class="submit-btn" @click="goToLogin">
        <text class="btn-text">去登录</text>
      </button>
    </view>

    <!-- 返回登录 -->
    <view v-if="currentStep !== 3" class="back-to-login">
      <text class="back-text">想起密码了？</text>
      <text class="back-link" @click="goToLogin">返回登录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { pinDataProvider } from '../../services/pin/index'

// 当前步骤：1-验证邮箱，2-重置密码，3-完成
const currentStep = ref(1)

// 表单数据
const email = ref('')
const verifyCode = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// 状态
const error = ref('')
const loading = ref(false)
const sendingCode = ref(false)
const codeCountdown = ref(0)

/**
 * 清除错误信息
 */
const clearError = () => {
  error.value = ''
}

/**
 * 邮箱是否有效
 */
const isEmailValid = computed(() => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return pattern.test(email.value)
})

/**
 * 步骤1是否可以继续
 */
const canProceedStep1 = computed(() => {
  return isEmailValid.value && verifyCode.value.length >= 4
})

/**
 * 步骤2是否可以继续
 */
const canProceedStep2 = computed(() => {
  return newPassword.value.length >= 6 && newPassword.value === confirmPassword.value
})

/**
 * 发送验证码
 */
const sendVerifyCode = async () => {
  if (!isEmailValid.value || codeCountdown.value > 0 || sendingCode.value) return

  sendingCode.value = true
  error.value = ''

  try {
    await pinDataProvider.request('POST', '/auth/send-code', { 
      email: email.value,
      purpose: 'reset-password'
    })
    
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    
    // 开始倒计时
    codeCountdown.value = 60
    const timer = setInterval(() => {
      codeCountdown.value--
      if (codeCountdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (e: any) {
    error.value = e.message || '验证码发送失败，请稍后重试'
  } finally {
    sendingCode.value = false
  }
}

/**
 * 验证验证码并进入下一步
 */
const verifyCodeAndProceed = async () => {
  if (!canProceedStep1.value) return

  loading.value = true
  error.value = ''

  try {
    // 验证验证码（重置密码场景）
    await pinDataProvider.request('POST', '/auth/verify-code', {
      email: email.value,
      code: verifyCode.value,
      purpose: 'reset-password',
    })

    // 验证通过，进入下一步
    currentStep.value = 2
  } catch (e: any) {
    error.value = e.message || '验证码错误，请重新输入'
  } finally {
    loading.value = false
  }
}

/**
 * 重置密码
 */
const resetPassword = async () => {
  if (!canProceedStep2.value) return

  // 验证密码
  if (newPassword.value.length < 6) {
    error.value = '密码长度至少 6 个字符'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await pinDataProvider.request('POST', '/auth/reset-password', {
      email: email.value,
      code: verifyCode.value,
      newPassword: newPassword.value
    })

    // 重置成功，进入完成步骤
    currentStep.value = 3
  } catch (e: any) {
    error.value = e.message || '密码重置失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

/**
 * 返回上一页
 */
const goBack = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  } else {
    uni.navigateBack()
  }
}

/**
 * 跳转到登录页
 */
const goToLogin = () => {
  uni.redirectTo({ url: '/pages/login/index' })
}
</script>

<style scoped>
.forgot-password-page {
  min-height: 100vh;
  background-color: var(--color-bg-panel);
  padding-bottom: 40rpx;
}

/* 顶部导航 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background-color: var(--color-bg-panel);
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

/* 步骤指示器 */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx 60rpx;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.step-circle {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background-color: var(--color-bg-page);
  border: 2rpx solid var(--color-text-disabled);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: var(--color-text-disabled);
  font-weight: 500;
}

.step-item.active .step-circle {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.step-item.completed .step-circle {
  background-color: var(--color-success);
  border-color: var(--color-success);
  color: var(--color-text-inverse);
}

.step-text {
  font-size: 22rpx;
  color: var(--color-text-tertiary);
  margin-top: 8rpx;
}

.step-item.active .step-text {
  color: var(--color-primary);
}

.step-line {
  flex: 1;
  height: 2rpx;
  background-color: var(--color-text-disabled);
  margin: 0 16rpx;
  margin-bottom: 32rpx;
}

.step-line.active {
  background-color: var(--color-primary);
}

/* 表单区域 */
.form-section {
  padding: 0 40rpx;
}

.step-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
  margin-bottom: 16rpx;
}

.step-desc {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  text-align: center;
  margin-bottom: 48rpx;
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
  background-color: var(--color-bg-page);
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
  background-color: var(--color-bg-panel);
}

.placeholder-text {
  color: var(--color-text-disabled);
}

/* 验证码输入区域 */
.code-input-wrapper {
  display: flex;
  gap: 16rpx;
}

.code-field {
  flex: 1;
}

.code-btn {
  width: 200rpx;
  height: 88rpx;
  background-color: var(--color-primary);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;
}

.code-btn[disabled] {
  background-color: var(--color-text-disabled);
}

.code-btn-text {
  font-size: 24rpx;
  color: var(--color-text-inverse);
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

.btn-text {
  color: inherit;
}

/* 成功页面 */
.success-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx;
}

.success-icon {
  width: 120rpx;
  height: 120rpx;
  background-color: var(--color-success);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60rpx;
  color: var(--color-text-inverse);
  margin-bottom: 40rpx;
}

.success-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16rpx;
}

.success-desc {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  margin-bottom: 60rpx;
}

/* 返回登录 */
.back-to-login {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 48rpx;
}

.back-text {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.back-link {
  font-size: 26rpx;
  color: var(--color-primary);
  font-weight: 500;
  margin-left: 8rpx;
}
</style>
