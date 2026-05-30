<template>
  <!-- 登录页面 V0.2.1 - 改造版 -->
  <view class="login-page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @click="goBack">
        <image class="back-icon" src="/static/assets/v015/icons/back.png" mode="aspectFit" />
      </view>
      <text class="nav-title">登录</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 品牌区域 -->
    <view class="brand-section">
      <view class="brand-icon">
        <text class="brand-emoji">🎨</text>
      </view>
      <text class="brand-title">欢迎回来</text>
      <text class="brand-subtitle">登录 Pin 拼豆创作</text>
    </view>

    <!-- 表单区域 -->
    <view class="form-section">
      <!-- 用户名 -->
      <view class="input-group">
        <text class="input-label">用户名</text>
        <input
          class="input-field"
          v-model="username"
          placeholder="请输入用户名"
          placeholder-class="placeholder-text"
          maxlength="16"
          @input="clearError"
        />
      </view>

      <!-- 密码 -->
      <view class="input-group">
        <text class="input-label">密码</text>
        <input
          class="input-field"
          v-model="password"
          type="password"
          placeholder="请输入密码"
          placeholder-class="placeholder-text"
          maxlength="32"
          @input="clearError"
        />
      </view>

      <!-- 忘记密码 -->
      <view class="forgot-password-row">
        <text class="forgot-password-link" @click="goToForgotPassword">忘记密码？</text>
      </view>

      <!-- 协议勾选 -->
      <view class="agreement-row">
        <view class="checkbox" :class="{ checked: agreeTerms }" @click="agreeTerms = !agreeTerms">
          <text v-if="agreeTerms" class="check-icon">✓</text>
        </view>
        <text class="agreement-text">
          我已阅读并同意
          <text class="agreement-link" @click="goToAgreement">《用户协议》</text>
          和
          <text class="agreement-link" @click="goToPrivacy">《隐私政策》</text>
        </text>
      </view>

      <!-- 错误提示 -->
      <view v-if="error" class="error-box">
        <text class="error-text">{{ error }}</text>
      </view>

      <!-- 登录按钮 -->
      <button 
        class="submit-btn" 
        :class="{ loading: loading }"
        :disabled="!isFormValid || loading" 
        @click="handleLogin"
      >
        <text v-if="loading" class="btn-text">登录中...</text>
        <text v-else class="btn-text">登录</text>
      </button>

      <!-- 注册入口 -->
      <view class="register-link-row">
        <text class="register-link-text">还没有账号？</text>
        <text class="register-link" @click="goToRegister">立即注册</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { pinDataProvider } from '../../services/pin/index'
import { syncOnLogin } from '../../services/sync/auto-sync.ts'

// 表单数据
const username = ref('')
const password = ref('')
const agreeTerms = ref(false)

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
 * 表单是否可提交（仅检查用户名和密码，协议在 handleLogin 中弹窗确认）
 */
const isFormValid = computed(() => {
  return username.value.length >= 3 && password.value.length >= 6
})

/**
 * 处理登录
 */
const handleLogin = async () => {
  error.value = ''

  // 验证协议
  if (!agreeTerms.value) {
    // 未勾选协议时弹窗确认
    uni.showModal({
      title: '提示',
      content: '未勾选用户协议，是否同意并继续登录？',
      confirmText: '同意并登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          agreeTerms.value = true
          doLogin()
        }
      }
    })
    return
  }

  await doLogin()
}

/**
 * 执行登录
 */
const doLogin = async () => {
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }

  loading.value = true

  try {
    const result = await pinDataProvider.login(username.value, password.value)

    uni.showToast({ title: '登录成功', icon: 'success' })

    // 登录成功后触发数据同步
    try {
      await syncOnLogin()
      console.log('登录后数据同步完成')
    } catch (syncError) {
      console.warn('登录后数据同步失败:', syncError)
      // 同步失败不影响登录流程
    }

    // 检查是否需要数据迁移
    setTimeout(() => {
      checkAndNavigate(result)
    }, 1500)
  } catch (e: any) {
    error.value = e.message || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}

/**
 * 检查是否需要数据迁移并导航
 */
const checkAndNavigate = (user: any) => {
  // 检查本地是否有未同步的数据
  const localProjects = uni.getStorageSync('pin_projects')
  const localFolders = uni.getStorageSync('pin_folders')
  
  const hasLocalData = (localProjects && JSON.parse(localProjects).length > 0) || 
                       (localFolders && JSON.parse(localFolders).length > 0)

  if (hasLocalData) {
    // 有本地数据，跳转到迁移引导页
    uni.navigateTo({
      url: '/pages/migration/index'
    })
  } else {
    // 无本地数据，直接跳转到我的页面
    uni.switchTab({ url: '/pages/mine/index' })
  }
}

/**
 * 返回上一页
 */
const goBack = () => {
  uni.navigateBack()
}

/**
 * 跳转到注册页
 */
const goToRegister = () => {
  uni.navigateTo({ url: '/pages/register/index' })
}

/**
 * 跳转到忘记密码页
 */
const goToForgotPassword = () => {
  uni.navigateTo({ url: '/pages/forgot-password/index' })
}

/**
 * 跳转到用户协议页面
 */
const goToAgreement = () => {
  uni.navigateTo({ url: '/pages/agreement/index' })
}

/**
 * 跳转到隐私政策页面
 */
const goToPrivacy = () => {
  uni.navigateTo({ url: '/pages/agreement/index?type=privacy' })
}
</script>

<style scoped>
.login-page {
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

/* 品牌区域 */
.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 0;
}

.brand-icon {
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary-soft) 100%);
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
  box-shadow: var(--shadow-md);
}

.brand-emoji {
  font-size: 52rpx;
}

.brand-title {
  font-size: 36rpx;
  color: var(--color-text-primary);
  font-weight: 600;
  margin-bottom: 8rpx;
}

.brand-subtitle {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

/* 表单区域 */
.form-section {
  padding: 0 40rpx;
}

.input-group {
  margin-bottom: 24rpx;
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
  height: 84rpx;
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

/* 忘记密码 */
.forgot-password-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24rpx;
}

.forgot-password-link {
  font-size: 24rpx;
  color: var(--color-primary);
}

/* 协议勾选 */
.agreement-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 32rpx;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid var(--color-text-disabled);
  border-radius: 8rpx;
  margin-right: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.checkbox.checked {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.check-icon {
  color: var(--color-text-inverse);
  font-size: 24rpx;
  font-weight: bold;
}

.agreement-text {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  line-height: 1.6;
  flex: 1;
}

.agreement-link {
  color: var(--color-primary);
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

/* 注册入口 */
.register-link-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40rpx;
}

.register-link-text {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.register-link {
  font-size: 26rpx;
  color: var(--color-primary);
  font-weight: 500;
  margin-left: 8rpx;
}
</style>
