<template>
  <!-- 登录/注册页面 V0.2.0 -->
  <view class="login-page">
    <!-- 品牌区域 -->
    <view class="brand-section">
      <view class="brand-icon">
        <text class="brand-emoji">🎨</text>
      </view>
      <text class="brand-title">Pin 拼豆</text>
      <text class="brand-subtitle">拼豆创作，释放创意</text>
    </view>

    <!-- 表单区域 -->
    <view class="form-section">
      <!-- 模式切换标签 -->
      <view class="mode-tabs">
        <view 
          class="mode-tab" 
          :class="{ active: isLoginMode }" 
          @click="switchMode(true)"
        >
          <text class="tab-text">登录</text>
        </view>
        <view 
          class="mode-tab" 
          :class="{ active: !isLoginMode }" 
          @click="switchMode(false)"
        >
          <text class="tab-text">注册</text>
        </view>
      </view>
      
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

      <!-- 邮箱（仅注册模式，必填） -->
      <view v-if="!isLoginMode" class="input-group">
        <text class="input-label">邮箱 <text class="required-mark">*</text></text>
        <input
          class="input-field"
          v-model="email"
          type="text"
          placeholder="请输入邮箱地址"
          placeholder-class="placeholder-text"
          maxlength="64"
          @input="clearError"
        />
      </view>

      <!-- 昵称（仅注册模式，可选） -->
      <view v-if="!isLoginMode" class="input-group">
        <text class="input-label">昵称（可选）</text>
        <input
          class="input-field"
          v-model="nickname"
          placeholder="给自己起个昵称吧"
          placeholder-class="placeholder-text"
          maxlength="16"
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
        <text v-if="loading" class="btn-text">处理中...</text>
        <text v-else class="btn-text">{{ isLoginMode ? '登录' : '注册' }}</text>
      </button>

      <!-- 提示信息 -->
      <view class="tips">
        <text v-if="isLoginMode" class="tip-item">• 使用已注册的账号登录</text>
        <text v-else class="tip-item">• 用户名长度 3-16 个字符</text>
        <text v-if="!isLoginMode" class="tip-item">• 密码长度至少 6 个字符</text>
        <text v-if="!isLoginMode" class="tip-item">• 邮箱用于找回密码</text>
      </view>
    </view>

    <!-- 协议提示 -->
    <view class="agreement-section">
      <text class="agreement-text">
        {{ isLoginMode ? '登录' : '注册' }}即表示同意
        <text class="agreement-link" @click="goToAgreement">《用户协议》</text>
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { pinDataProvider } from '../../services/pin/index'

// 表单数据
const username = ref('')
const password = ref('')
const email = ref('')
const nickname = ref('')

// 状态
const isLoginMode = ref(true) // true: 登录模式, false: 注册模式
const error = ref('')
const loading = ref(false)

/**
 * 清除错误信息
 */
const clearError = () => {
  error.value = ''
}

/**
 * 切换登录/注册模式
 * @param isLogin 是否为登录模式
 */
const switchMode = (isLogin: boolean) => {
  isLoginMode.value = isLogin
  clearError()
}

/**
 * 表单是否有效
 */
const isFormValid = computed(() => {
  if (!username.value || !password.value) return false
  if (!isLoginMode.value) {
    // 注册模式下验证
    if (password.value.length < 6) return false
    if (username.value.length < 3) return false
    // 邮箱必填
    if (!email.value) return false
  }
  return true
})

/**
 * 验证用户名
 * @param name 用户名
 * @returns 是否有效
 */
const validateUsername = (name: string): boolean => {
  if (name.length < 3 || name.length > 16) {
    error.value = '用户名长度需在 3-16 个字符之间'
    return false
  }
  const pattern = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/
  if (!pattern.test(name)) {
    error.value = '用户名只能包含中文、英文、数字和下划线'
    return false
  }
  return true
}

/**
 * 验证密码
 * @param pwd 密码
 * @returns 是否有效
 */
const validatePassword = (pwd: string): boolean => {
  if (pwd.length < 6) {
    error.value = '密码长度至少 6 个字符'
    return false
  }
  return true
}

/**
 * 验证邮箱
 * @param mail 邮箱地址
 * @returns 是否有效
 */
const validateEmail = (mail: string): boolean => {
  if (!mail) {
    error.value = '请输入邮箱地址'
    return false
  }
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!pattern.test(mail)) {
    error.value = '请输入有效的邮箱地址'
    return false
  }
  return true
}

/**
 * 处理登录
 */
const handleLogin = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const result = await pinDataProvider.login(username.value, password.value)
    
    uni.showToast({ title: '登录成功', icon: 'success' })
    
    // 保存用户信息到本地
    uni.setStorageSync('pin_current_user', JSON.stringify(result.user))
    
    // 检查是否需要数据迁移
    setTimeout(() => {
      checkDataMigration()
    }, 1500)
  } catch (e: any) {
    error.value = e.message || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}

/**
 * 处理注册
 */
const handleRegister = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const result = await pinDataProvider.register(
      username.value, 
      password.value, 
      nickname.value || username.value,
      email.value
    )
    
    uni.showToast({ title: '注册成功', icon: 'success' })
    
    // 保存用户信息到本地
    uni.setStorageSync('pin_current_user', JSON.stringify(result.user))
    
    setTimeout(() => {
      uni.switchTab({ url: '/pages/mine/index' })
    }, 1500)
  } catch (e: any) {
    error.value = e.message || '注册失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  error.value = ''
  
  // 验证用户名
  if (!validateUsername(username.value)) return
  
  // 验证密码
  if (!validatePassword(password.value)) return
  
  // 注册模式下验证邮箱
  if (!isLoginMode.value && !validateEmail(email.value)) return
  
  if (isLoginMode.value) {
    await handleLogin()
  } else {
    await handleRegister()
  }
}

/**
 * 检查是否需要数据迁移
 * 首次登录云端后，检测本地是否有历史数据
 */
const checkDataMigration = () => {
  try {
    // 检查本地是否有项目数据
    const localProjects = uni.getStorageSync('pin_projects')
    const hasLocalData = localProjects && JSON.parse(localProjects).length > 0
    
    if (hasLocalData) {
      // 跳转到数据迁移页面
      uni.navigateTo({ url: '/pages/migration/index' })
    } else {
      // 直接跳转到我的页面
      uni.switchTab({ url: '/pages/mine/index' })
    }
  } catch {
    uni.switchTab({ url: '/pages/mine/index' })
  }
}

/**
 * 跳转到用户协议页面
 */
const goToAgreement = () => {
  uni.navigateTo({ url: '/pages/agreement/index' })
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background-color: var(--color-bg-panel);
  padding: 32rpx 40rpx;
}

/* 品牌区域 */
.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0 40rpx;
}

.brand-icon {
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary-soft) 100%);
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  box-shadow: var(--shadow-md);
}

.brand-emoji {
  font-size: 64rpx;
}

.brand-title {
  font-size: 44rpx;
  color: var(--color-text-primary);
  font-weight: 600;
  margin-bottom: 8rpx;
}

.brand-subtitle {
  font-size: 26rpx;
  color: var(--color-text-tertiary);
}

/* 表单区域 */
.form-section {
  margin-top: 24rpx;
}

/* 模式切换标签 */
.mode-tabs {
  display: flex;
  margin-bottom: 40rpx;
  background-color: var(--color-bg-page);
  border-radius: 16rpx;
  padding: 8rpx;
}

.mode-tab {
  flex: 1;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  transition: all 0.2s ease;
}

.mode-tab.active {
  background-color: var(--color-bg-panel);
  box-shadow: var(--shadow-sm);
}

.tab-text {
  font-size: 28rpx;
  color: var(--color-text-secondary);
}

.mode-tab.active .tab-text {
  color: var(--color-text-primary);
  font-weight: 500;
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

.required-mark {
  color: var(--color-error);
}

.input-field {
  width: 100%;
  height: 88rpx;
  background-color: var(--color-bg-page);
  border-radius: 16rpx;
  padding: 0 28rpx;
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

/* 错误提示 */
.error-box {
  background-color: var(--color-error);
  background-color: rgba(207, 92, 77, 0.1);
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  margin-bottom: 24rpx;
}

.error-text {
  font-size: 24rpx;
  color: var(--color-error);
}

/* 提示信息 */
.tips {
  margin-top: 32rpx;
  padding: 0 8rpx;
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
  color: var(--color-text-inverse);
  font-size: 32rpx;
  font-weight: 500;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  margin-top: 40rpx;
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

/* 协议区域 */
.agreement-section {
  margin-top: 48rpx;
  text-align: center;
}

.agreement-text {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

.agreement-link {
  color: var(--color-primary);
}
</style>
