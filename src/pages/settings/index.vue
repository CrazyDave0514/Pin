<template>
  <!-- 设置页面 -->
  <view class="settings-page">
    <!-- 账号设置 -->
    <view class="settings-section">
      <view class="section-title">账号设置</view>
      <view class="settings-list">
        <view class="setting-item" @click="editProfile">
          <text class="item-label">编辑资料</text>
          <text class="item-arrow">›</text>
        </view>
        <view class="setting-item" @click="changePassword">
          <text class="item-label">修改密码</text>
          <text class="item-arrow">›</text>
        </view>
        <view class="setting-item" @click="manageDevices">
          <text class="item-label">设备管理</text>
          <text class="item-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 通知设置 -->
    <view class="settings-section">
      <view class="section-title">通知设置</view>
      <view class="settings-list">
        <view class="setting-item switch-item">
          <text class="item-label">接收推送通知</text>
          <switch 
            :checked="settings.pushEnabled" 
            @change="toggleSetting('pushEnabled')"
            color="#F5A623"
          />
        </view>
        <view class="setting-item switch-item">
          <text class="item-label">邮件通知</text>
          <switch 
            :checked="settings.emailEnabled" 
            @change="toggleSetting('emailEnabled')"
            color="#F5A623"
          />
        </view>
        <view class="setting-item switch-item">
          <text class="item-label">新粉丝提醒</text>
          <switch 
            :checked="settings.followerNotify" 
            @change="toggleSetting('followerNotify')"
            color="#F5A623"
          />
        </view>
        <view class="setting-item switch-item">
          <text class="item-label">作品被收藏提醒</text>
          <switch 
            :checked="settings.favoriteNotify" 
            @change="toggleSetting('favoriteNotify')"
            color="#F5A623"
          />
        </view>
      </view>
    </view>

    <!-- 隐私设置 -->
    <view class="settings-section">
      <view class="section-title">隐私设置</view>
      <view class="settings-list">
        <view class="setting-item switch-item">
          <text class="item-label">公开我的作品</text>
          <switch 
            :checked="settings.publicWorks" 
            @change="toggleSetting('publicWorks')"
            color="#F5A623"
          />
        </view>
        <view class="setting-item switch-item">
          <text class="item-label">允许他人私信</text>
          <switch 
            :checked="settings.allowMessage" 
            @change="toggleSetting('allowMessage')"
            color="#F5A623"
          />
        </view>
        <view class="setting-item" @click="manageBlacklist">
          <text class="item-label">黑名单管理</text>
          <text class="item-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 通用设置 -->
    <view class="settings-section">
      <view class="section-title">通用设置</view>
      <view class="settings-list">
        <view class="setting-item" @click="clearCache">
          <text class="item-label">清除缓存</text>
          <view class="item-extra">
            <text class="extra-text">{{ cacheSize }}</text>
            <text class="item-arrow">›</text>
          </view>
        </view>
        <view class="setting-item" @click="checkUpdate">
          <text class="item-label">检查更新</text>
          <view class="item-extra">
            <text class="extra-text">当前 v{{ version }}</text>
            <text class="item-arrow">›</text>
          </view>
        </view>
        <view class="setting-item" @click="aboutUs">
          <text class="item-label">关于我们</text>
          <text class="item-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 法律文档 -->
    <view class="settings-section">
      <view class="section-title">法律与协议</view>
      <view class="settings-list">
        <view class="setting-item" @click="openAgreement('user')">
          <text class="item-label">用户协议</text>
          <text class="item-arrow">›</text>
        </view>
        <view class="setting-item" @click="openAgreement('privacy')">
          <text class="item-label">隐私政策</text>
          <text class="item-arrow">›</text>
        </view>
        <view class="setting-item" @click="openAgreement('community')">
          <text class="item-label">社区规范</text>
          <text class="item-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 账号安全 -->
    <view class="settings-section">
      <view class="section-title">账号安全</view>
      <view class="settings-list">
        <view class="setting-item" @click="showDeleteAccount">
          <text class="item-label text-danger">注销账号</text>
          <text class="item-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 退出登录 -->
    <view v-if="isLoggedIn" class="logout-section">
      <view class="logout-btn" @click="logout">
        <text class="btn-text">退出登录</text>
      </view>
    </view>

    <!-- 缓存清除确认弹窗 -->
    <view v-if="showClearCacheModal" class="modal-overlay" @click="showClearCacheModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">清除缓存</text>
        </view>
        <view class="modal-body">
          <text class="modal-text">确定要清除所有缓存数据吗？这将清除图片缓存和临时文件。</text>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="showClearCacheModal = false">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm" @click="confirmClearCache">
            <text class="btn-text">确定</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 退出登录确认弹窗 -->
    <view v-if="showLogoutModal" class="modal-overlay" @click="showLogoutModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">退出登录</text>
        </view>
        <view class="modal-body">
          <text class="modal-text">确定要退出登录吗？</text>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="showLogoutModal = false">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm" @click="confirmLogout">
            <text class="btn-text">确定</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 注销账号确认弹窗 -->
    <view v-if="showDeleteAccountModal" class="modal-overlay" @click="showDeleteAccountModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">注销账号</text>
        </view>
        <view class="modal-body">
          <text class="modal-text">确定要注销账号吗？此操作将清除所有本地数据，且不可恢复。</text>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="showDeleteAccountModal = false">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm" @click="confirmDeleteAccount">
            <text class="btn-text">确定</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 应用版本号
const version = ref('0.1.3')

// 缓存大小
const cacheSize = ref('0 MB')

// 登录状态
const isLoggedIn = ref(false)

// 弹窗显示状态
const showClearCacheModal = ref(false)
const showLogoutModal = ref(false)
const showDeleteAccountModal = ref(false)

// 设置项
const settings = ref({
  pushEnabled: true,
  emailEnabled: false,
  followerNotify: true,
  favoriteNotify: true,
  publicWorks: true,
  allowMessage: true
})

/**
 * 加载设置数据
 */
const loadSettings = () => {
  // 加载用户设置
  const savedSettings = uni.getStorageSync('pin_settings')
  if (savedSettings) {
    settings.value = { ...settings.value, ...savedSettings }
  }
  
  // 检查登录状态
  const user = uni.getStorageSync('pin_user')
  isLoggedIn.value = !!user
  
  // 计算缓存大小（模拟）
  calculateCacheSize()
}

/**
 * 计算缓存大小
 */
const calculateCacheSize = () => {
  // 模拟计算缓存大小
  const size = Math.random() * 100
  cacheSize.value = size.toFixed(1) + ' MB'
}

/**
 * 切换设置项
 * @param key 设置项键名
 */
const toggleSetting = (key: keyof typeof settings.value) => {
  settings.value[key] = !settings.value[key]
  uni.setStorageSync('pin_settings', settings.value)
}

/**
 * 编辑资料
 */
const editProfile = () => {
  uni.navigateTo({ url: '/pages/profile/edit' })
}

/**
 * 修改密码
 */
const changePassword = () => {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

/**
 * 设备管理
 */
const manageDevices = () => {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

/**
 * 黑名单管理
 */
const manageBlacklist = () => {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

/**
 * 清除缓存
 */
const clearCache = () => {
  showClearCacheModal.value = true
}

/**
 * 确认清除缓存
 */
const confirmClearCache = () => {
  // 清除缓存逻辑
  uni.clearStorageSync()
  // 保留用户登录信息
  const user = uni.getStorageSync('pin_user')
  if (user) {
    uni.setStorageSync('pin_user', user)
  }
  
  showClearCacheModal.value = false
  cacheSize.value = '0 MB'
  uni.showToast({ title: '缓存已清除', icon: 'success' })
}

/**
 * 检查更新
 */
const checkUpdate = () => {
  uni.showLoading({ title: '检查中...' })
  setTimeout(() => {
    uni.hideLoading()
    uni.showToast({ title: '已是最新版本', icon: 'success' })
  }, 1000)
}

/**
 * 关于我们
 */
const aboutUs = () => {
  uni.navigateTo({ url: '/pages/about/index' })
}

/**
 * 打开协议页面
 * @param type 协议类型
 */
const openAgreement = (type: string) => {
  const titles: Record<string, string> = {
    user: '用户协议',
    privacy: '隐私政策',
    community: '社区规范'
  }
  uni.navigateTo({ 
    url: `/pages/agreement/index?type=${type}&title=${titles[type]}` 
  })
}

/**
 * 退出登录
 */
const logout = () => {
  showLogoutModal.value = true
}

/**
 * 确认退出登录
 */
const confirmLogout = () => {
  // 清除用户数据
  uni.removeStorageSync('pin_user')
  uni.removeStorageSync('pin_points')

  showLogoutModal.value = false
  isLoggedIn.value = false

  uni.showToast({ title: '已退出登录', icon: 'success' })

  // 返回我的页面
  setTimeout(() => {
    uni.switchTab({ url: '/pages/mine/index' })
  }, 1500)
}

/**
 * 显示注销账号确认
 */
const showDeleteAccount = () => {
  showDeleteAccountModal.value = true
}

/**
 * 确认注销账号
 */
const confirmDeleteAccount = () => {
  // 清除所有本地数据
  uni.removeStorageSync('pin_user')
  uni.removeStorageSync('pin_projects')
  uni.removeStorageSync('pin_folders')
  uni.removeStorageSync('pin_search_history')
  uni.removeStorageSync('pin_favorite_colors')
  uni.removeStorageSync('pin_recent_imports')
  uni.removeStorageSync('pin_settings')

  showDeleteAccountModal.value = false
  isLoggedIn.value = false

  uni.showToast({ title: '账号已注销', icon: 'success' })

  // 延迟跳转到登录页
  setTimeout(() => {
    uni.navigateTo({ url: '/pages/login/index' })
  }, 1500)
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background: var(--color-bg-page);
  padding-bottom: 40rpx;
}

/* 设置区块 */
.settings-section {
  background: var(--color-bg-panel);
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  padding: 24rpx 24rpx 16rpx;
}

/* 设置列表 */
.settings-list {
  padding: 0 24rpx;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--color-divider);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item.switch-item {
  padding: 16rpx 0;
}

.item-label {
  font-size: 28rpx;
  color: var(--color-text-primary);
}

.item-label.text-danger {
  color: var(--color-error);
}

.item-arrow {
  font-size: 32rpx;
  color: var(--color-text-tertiary);
}

.item-extra {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.extra-text {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

/* 退出登录 */
.logout-section {
  padding: 40rpx 24rpx;
}

.logout-btn {
  height: 88rpx;
  background: var(--color-bg-panel);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-btn .btn-text {
  font-size: 30rpx;
  color: var(--color-error);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-bg-mask);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 80%;
  max-width: 560rpx;
  background: var(--color-bg-panel);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.modal-header {
  padding: 32rpx 24rpx 16rpx;
  text-align: center;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.modal-body {
  padding: 16rpx 32rpx 32rpx;
  text-align: center;
}

.modal-text {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  border-top: 1rpx solid var(--color-divider);
}

.modal-btn {
  flex: 1;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-btn.cancel {
  border-right: 1rpx solid var(--color-divider);
}

.modal-btn.cancel .btn-text {
  color: var(--color-text-secondary);
}

.modal-btn.confirm .btn-text {
  color: var(--color-error);
}

.modal-btn .btn-text {
  font-size: 30rpx;
}
</style>
