<template>
  <!-- 独立注册页面 V0.2.1 -->
  <view class="register-page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @click="goBack">
        <image class="back-icon" src="/static/assets/v015/icons/back.png" mode="aspectFit" />
      </view>
      <text class="nav-title">注册账号</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 品牌区域 -->
    <view class="brand-section">
      <view class="brand-icon">
        <text class="brand-emoji">🎨</text>
      </view>
      <text class="brand-title">创建新账号</text>
      <text class="brand-subtitle">加入 Pin 拼豆创作社区</text>
    </view>

    <!-- 表单区域 -->
    <view class="form-section">
      <!-- 用户名 -->
      <view class="input-group">
        <text class="input-label">用户名 <text class="required-mark">*</text></text>
        <input
          class="input-field"
          v-model="username"
          placeholder="3-16个字符，支持中文、英文、数字和下划线"
          placeholder-class="placeholder-text"
          maxlength="16"
          @input="clearError"
        />
      </view>

      <!-- 邮箱 -->
      <view class="input-group">
        <text class="input-label">邮箱 <text class="required-mark">*</text></text>
        <view class="email-input-wrapper">
          <input
            class="input-field email-field"
            v-model="email"
            type="text"
            placeholder="请输入邮箱地址"
            placeholder-class="placeholder-text"
            maxlength="64"
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

      <!-- 验证码 -->
      <view class="input-group">
        <text class="input-label">验证码 <text class="required-mark">*</text></text>
        <input
          class="input-field"
          v-model="verifyCode"
          placeholder="请输入邮箱验证码"
          placeholder-class="placeholder-text"
          maxlength="6"
          @input="clearError"
        />
      </view>

      <!-- 昵称 -->
      <view class="input-group">
        <text class="input-label">昵称</text>
        <input
          class="input-field"
          v-model="nickname"
          placeholder="给自己起个昵称（可选）"
          placeholder-class="placeholder-text"
          maxlength="16"
        />
      </view>

      <!-- 密码 -->
      <view class="input-group">
        <text class="input-label">密码 <text class="required-mark">*</text></text>
        <input
          class="input-field"
          v-model="password"
          type="password"
          placeholder="至少6个字符"
          placeholder-class="placeholder-text"
          maxlength="32"
          @input="clearError"
        />
      </view>

      <!-- 确认密码 -->
      <view class="input-group">
        <text class="input-label">确认密码 <text class="required-mark">*</text></text>
        <input
          class="input-field"
          v-model="confirmPassword"
          type="password"
          placeholder="再次输入密码"
          placeholder-class="placeholder-text"
          maxlength="32"
          @input="clearError"
        />
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

      <!-- 提交按钮 -->
      <button 
        class="submit-btn" 
        :class="{ loading: loading }"
        :disabled="!isFormValid || loading" 
        @click="handleRegister"
      >
        <text v-if="loading" class="btn-text">注册中...</text>
        <text v-else class="btn-text">注册</text>
      </button>

      <!-- 登录入口 -->
      <view class="login-link-row">
        <text class="login-link-text">已有账号？</text>
        <text class="login-link" @click="goToLogin">立即登录</text>
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
const email = ref('')
const verifyCode = ref('')
const nickname = ref('')
const password = ref('')
const confirmPassword = ref('')
const agreeTerms = ref(false)

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
 * 表单是否有效
 */
const isFormValid = computed(() => {
  if (!username.value || username.value.length < 3) return false
  if (!isEmailValid.value) return false
  if (!verifyCode.value || verifyCode.value.length < 4) return false
  if (!password.value || password.value.length < 6) return false
  if (password.value !== confirmPassword.value) return false
  if (!agreeTerms.value) return false
  return true
})

/**
 * 发送验证码
 */
const sendVerifyCode = async () => {
  if (!isEmailValid.value || codeCountdown.value > 0 || sendingCode.value) return

  sendingCode.value = true
  error.value = ''

  try {
    // 调用后端发送验证码接口（注册场景）
    await pinDataProvider.request('POST', '/auth/send-code', { email: email.value, purpose: 'register' })
    
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
 * 验证用户名
 */
const validateUsername = (): boolean => {
  if (username.value.length < 3 || username.value.length > 16) {
    error.value = '用户名长度需在 3-16 个字符之间'
    return false
  }
  const pattern = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/
  if (!pattern.test(username.value)) {
    error.value = '用户名只能包含中文、英文、数字和下划线'
    return false
  }
  return true
}

/**
 * 验证密码
 */
const validatePassword = (): boolean => {
  if (password.value.length < 6) {
    error.value = '密码长度至少 6 个字符'
    return false
  }
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return false
  }
  return true
}

/**
 * 处理注册
 */
const handleRegister = async () => {
  error.value = ''

  // 验证用户名
  if (!validateUsername()) return

  // 验证密码
  if (!validatePassword()) return

  // 验证协议
  if (!agreeTerms.value) {
    // 未勾选协议时弹窗确认
    uni.showModal({
      title: '提示',
      content: '未勾选用户协议，是否同意并继续注册？',
      confirmText: '同意并注册',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          agreeTerms.value = true
          doRegister()
        }
      }
    })
    return
  }

  await doRegister()
}

/**
 * 执行注册
 */
const doRegister = async () => {
  loading.value = true

  try {
    // 先验证验证码（注册场景）
    await pinDataProvider.request('POST', '/auth/verify-code', {
      email: email.value,
      code: verifyCode.value,
      purpose: 'register',
    })

    // 执行注册
    const result = await pinDataProvider.register(
      username.value,
      password.value,
      email.value,
      nickname.value || username.value
    )

    uni.showToast({ title: '注册成功', icon: 'success' })

    // 注册成功后触发数据同步
    try {
      await syncOnLogin()
      console.log('注册后数据同步完成')
    } catch (syncError) {
      console.warn('注册后数据同步失败:', syncError)
      // 同步失败不影响注册流程
    }

    // 跳转到我的页面
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
 * 返回上一页
 */
const goBack = () => {
  uni.navigateBack()
}

/**
 * 跳转到登录页
 */
const goToLogin = () => {
  uni.redirectTo({ url: '/pages/login/index' })
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
.register-page {
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

.required-mark {
  color: var(--color-error);
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

/* 邮箱输入区域 */
.email-input-wrapper {
  display: flex;
  gap: 16rpx;
}

.email-field {
  flex: 1;
}

.code-btn {
  width: 200rpx;
  height: 84rpx;
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

/* 协议勾选 */
.agreement-row {
  display: flex;
  align-items: flex-start;
  margin: 32rpx 0;
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

/* 登录入口 */
.login-link-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40rpx;
}

.login-link-text {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.login-link {
  font-size: 26rpx;
  color: var(--color-primary);
  font-weight: 500;
  margin-left: 8rpx;
}
</style>
