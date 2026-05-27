<template>
  <!-- 数据迁移引导页 V0.2.0 -->
  <view class="migration-page">
    <!-- 顶部区域 -->
    <view class="header-section">
      <view class="icon-wrap">
        <text class="icon-emoji">☁️</text>
      </view>
      <text class="title">发现本地数据</text>
      <text class="subtitle">检测到您有 {{ localProjectCount }} 个本地项目</text>
    </view>

    <!-- 说明区域 -->
    <view class="info-section">
      <view class="info-card">
        <text class="info-title">同步到云端后，您可以：</text>
        <view class="info-list">
          <text class="info-item">✓ 在其他设备上访问您的项目</text>
          <text class="info-item">✓ 数据安全备份，不再担心丢失</text>
          <text class="info-item">✓ 发布作品到社区与大家分享</text>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-section">
      <button class="primary-btn" @click="handleMigrate">
        <text class="btn-text">同步到云端</text>
      </button>
      <button class="secondary-btn" @click="handleSkip">
        <text class="btn-text-secondary">暂不同步</text>
      </button>
    </view>

    <!-- 进度弹窗 -->
    <view v-if="migrating" class="modal-overlay">
      <view class="progress-modal">
        <text class="progress-title">正在同步...</text>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: progress + '%' }"></view>
        </view>
        <text class="progress-text">{{ progressText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { AliyunPinDataProvider } from '../../services/pin/aliyun-provider'

const provider = new AliyunPinDataProvider()

// 状态
const localProjectCount = ref(0)
const migrating = ref(false)
const progress = ref(0)
const progressText = ref('')

/**
 * 加载本地项目数量
 */
const loadLocalProjects = () => {
  try {
    const localProjects = uni.getStorageSync('pin_projects')
    if (localProjects) {
      const projects = JSON.parse(localProjects)
      localProjectCount.value = projects.length
    }
  } catch (e) {
    console.error('Failed to load local projects:', e)
  }
}

onMounted(() => {
  loadLocalProjects()
})

/**
 * 执行数据迁移
 */
const handleMigrate = async () => {
  migrating.value = true
  progress.value = 0
  progressText.value = '准备同步...'
  
  try {
    // 1. 读取本地数据
    progressText.value = '读取本地数据...'
    progress.value = 10
    
    const localProjects = JSON.parse(uni.getStorageSync('pin_projects') || '[]')
    const localFolders = JSON.parse(uni.getStorageSync('pin_folders') || '[]')
    const localSettings = JSON.parse(uni.getStorageSync('pin_settings') || '{}')
    
    // 2. 上传到云端
    progressText.value = '同步项目数据...'
    progress.value = 30
    
    if (localProjects.length > 0) {
      await provider.setProjects(localProjects)
    }
    
    progressText.value = '同步文件夹数据...'
    progress.value = 50
    
    if (localFolders.length > 0) {
      await provider.setFolders(localFolders)
    }
    
    progressText.value = '同步设置数据...'
    progress.value = 70
    
    if (Object.keys(localSettings).length > 0) {
      await provider.setSettings(localSettings)
    }
    
    // 3. 清除本地缓存
    progressText.value = '清理本地缓存...'
    progress.value = 90
    
    uni.removeStorageSync('pin_projects')
    uni.removeStorageSync('pin_folders')
    uni.removeStorageSync('pin_settings')
    
    // 4. 完成
    progress.value = 100
    progressText.value = '同步完成！'
    
    setTimeout(() => {
      migrating.value = false
      uni.showToast({ title: '数据同步成功', icon: 'success' })
      setTimeout(() => {
        uni.switchTab({ url: '/pages/mine/index' })
      }, 1000)
    }, 500)
    
  } catch (e: any) {
    migrating.value = false
    uni.showToast({ title: e.message || '同步失败', icon: 'none' })
  }
}

/**
 * 跳过迁移
 */
const handleSkip = () => {
  uni.showModal({
    title: '确认跳过？',
    content: '跳过后本地数据将保留但不再使用，您随时可以在设置中手动同步。',
    confirmText: '确认跳过',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        uni.switchTab({ url: '/pages/mine/index' })
      }
    }
  })
}
</script>

<style scoped>
.migration-page {
  min-height: 100vh;
  background-color: var(--color-bg-panel);
  padding: 48rpx 40rpx;
  display: flex;
  flex-direction: column;
}

/* 顶部区域 */
.header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0;
}

.icon-wrap {
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

.icon-emoji {
  font-size: 64rpx;
}

.title {
  font-size: 40rpx;
  color: var(--color-text-primary);
  font-weight: 600;
  margin-bottom: 12rpx;
}

.subtitle {
  font-size: 28rpx;
  color: var(--color-text-secondary);
}

/* 说明区域 */
.info-section {
  flex: 1;
  padding: 24rpx 0;
}

.info-card {
  background-color: var(--color-bg-page);
  border-radius: 20rpx;
  padding: 32rpx;
}

.info-title {
  display: block;
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 500;
  margin-bottom: 24rpx;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-item {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* 操作按钮 */
.action-section {
  padding: 24rpx 0 48rpx;
}

.primary-btn {
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
  margin-bottom: 24rpx;
}

.btn-text {
  color: inherit;
}

.secondary-btn {
  width: 100%;
  height: 88rpx;
  background-color: transparent;
  color: var(--color-text-secondary);
  font-size: 28rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid var(--color-border);
}

.btn-text-secondary {
  color: inherit;
}

/* 进度弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.progress-modal {
  width: 80%;
  background-color: var(--color-bg-panel);
  border-radius: 24rpx;
  padding: 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.progress-title {
  font-size: 32rpx;
  color: var(--color-text-primary);
  font-weight: 500;
  margin-bottom: 32rpx;
}

.progress-bar {
  width: 100%;
  height: 16rpx;
  background-color: var(--color-bg-page);
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
}

.progress-fill {
  height: 100%;
  background-color: var(--color-primary);
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}
</style>
