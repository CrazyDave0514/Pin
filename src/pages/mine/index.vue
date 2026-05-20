<template>
  <view class="mine-page">
    <!-- 用户信息区 -->
    <view class="user-section">
      <view class="user-info">
        <template v-if="user">
          <view class="avatar-wrapper" @click="showAvatarMenu">
            <image class="user-avatar" :src="user.avatar || defaultAvatar" />
          </view>
          <text class="user-name">{{ user.username }}</text>
          <text class="user-uid">UID: {{ user.uid }}</text>
        </template>
        <template v-else>
          <view class="avatar-wrapper" @click="handleLogin">
            <view class="user-avatar default" />
          </view>
          <text class="login-text" @click="handleLogin">点击登录</text>
        </template>
      </view>
    </view>

    <!-- 数据概览 -->
    <view class="stats-section">
      <view class="stat-item">
        <text class="stat-value">{{ stats.artworks }}</text>
        <text class="stat-label">我的作品</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.favorites }}</text>
        <text class="stat-label">我的收藏</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.likes }}</text>
        <text class="stat-label">我的获赞</text>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="function-section">
      <view
        v-for="(item, index) in functionList"
        :key="index"
        class="function-item"
        @click="handleFunctionClick(item.path)"
      >
        <text class="function-icon">{{ item.icon }}</text>
        <text class="function-name">{{ item.name }}</text>
        <text class="function-arrow">→</text>
      </view>
    </view>



    <!-- 头像操作菜单 -->
    <view v-if="showAvatarAction" class="modal-overlay" @click="closeAvatarMenu">
      <view class="action-sheet" @click.stop>
        <view class="action-item" @click="chooseAvatar('camera')">
          <text>📷 拍照</text>
        </view>
        <view class="action-item" @click="chooseAvatar('album')">
          <text>🖼️ 从相册选择</text>
        </view>
        <view class="action-cancel" @click="closeAvatarMenu">取消</view>
      </view>
    </view>

    <!-- 头像裁剪弹窗 -->
    <view v-if="showCropModal" class="modal-overlay crop-overlay">
      <view class="crop-modal">
        <view class="crop-header">
          <text class="crop-cancel" @click="cancelCrop">取消</text>
          <text class="crop-title">裁剪头像</text>
          <text class="crop-confirm" @click="confirmCrop">确定</text>
        </view>
        <view class="crop-container">
          <image
            v-if="tempAvatar"
            class="crop-image"
            :src="tempAvatar"
            mode="aspectFit"
          />
          <view class="crop-frame">
            <view class="crop-mask top"></view>
            <view class="crop-mask bottom"></view>
            <view class="crop-mask left"></view>
            <view class="crop-mask right"></view>
            <view class="crop-circle"></view>
          </view>
        </view>
        <view class="crop-tools">
          <text class="tool-btn" @click="rotateLeft">↺ 左旋</text>
          <text class="tool-btn" @click="rotateRight">↻ 右旋</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const user = ref<any>(null)
const defaultAvatar = '/static/default-avatar.png'
const stats = ref({
  artworks: 0,
  favorites: 0,
  likes: 0,
})

// 头像操作菜单显示状态
const showAvatarAction = ref(false)
// 裁剪弹窗显示状态
const showCropModal = ref(false)
// 临时头像路径
const tempAvatar = ref('')
// 旋转角度
const rotation = ref(0)

const functionList = [
  { icon: '💰', name: '积分中心', path: '/pages/points/index' },
  { icon: '🫘', name: '豆仓管理', path: '/pages/bead-inventory/index' },
  { icon: '📞', name: '联系作者', path: '/pages/contact/index' },
  { icon: '⚙️', name: '更多设置', path: '/pages/settings/index' },
]

onMounted(() => {
  loadUser()
  loadStats()
})

onShow(() => {
  loadUser()
  loadStats()
})

/**
 * 加载用户数据
 */
const loadUser = () => {
  const userData = uni.getStorageSync('pin_user')
  user.value = userData
}

/**
 * 加载统计数据
 */
const loadStats = () => {
  const projects = uni.getStorageSync('pin_projects') || []
  stats.value.artworks = projects.length
}

/**
 * 处理登录
 */
const handleLogin = () => {
  if (!user.value) {
    uni.navigateTo({ url: '/pages/login/index' })
  }
}

/**
 * 显示头像操作菜单
 */
const showAvatarMenu = () => {
  if (!user.value) return
  showAvatarAction.value = true
}

/**
 * 关闭头像操作菜单
 */
const closeAvatarMenu = () => {
  showAvatarAction.value = false
}

/**
 * 选择头像来源
 * @param source - 来源类型
 */
const chooseAvatar = (source: 'camera' | 'album') => {
  closeAvatarMenu()

  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: [source],
    success: (res) => {
      tempAvatar.value = res.tempFilePaths[0]
      rotation.value = 0
      showCropModal.value = true
    },
    fail: () => {
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    }
  })
}

/**
 * 取消裁剪
 */
const cancelCrop = () => {
  showCropModal.value = false
  tempAvatar.value = ''
  rotation.value = 0
}

/**
 * 确认裁剪并保存头像
 */
const confirmCrop = () => {
  if (!tempAvatar.value) return

  // 保存头像到本地存储
  if (user.value) {
    user.value.avatar = tempAvatar.value
    uni.setStorageSync('pin_user', user.value)
    uni.showToast({ title: '头像更新成功', icon: 'success' })
  }

  showCropModal.value = false
  tempAvatar.value = ''
  rotation.value = 0
}

/**
 * 左旋
 */
const rotateLeft = () => {
  rotation.value = (rotation.value - 90) % 360
  // 实际项目中这里需要重新渲染图片
  uni.showToast({ title: '旋转功能开发中', icon: 'none' })
}

/**
 * 右旋
 */
const rotateRight = () => {
  rotation.value = (rotation.value + 90) % 360
  // 实际项目中这里需要重新渲染图片
  uni.showToast({ title: '旋转功能开发中', icon: 'none' })
}



/**
 * 处理功能点击
 * @param path - 页面路径
 */
const handleFunctionClick = (path: string) => {
  uni.navigateTo({ url: path })
}
</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 40rpx;
}

.user-section {
  background-color: #FFFFFF;
  padding: 96rpx 64rpx;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 头像包装器 */
.avatar-wrapper {
  position: relative;
  margin-bottom: 24rpx;
}

.user-avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  border: 4rpx solid #FFFFFF;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.user-avatar.default {
  background-color: #E8E8E8;
}

/* 头像编辑按钮 */
.avatar-edit {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 48rpx;
  height: 48rpx;
  background-color: #007AFF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #FFFFFF;
}

.edit-icon {
  font-size: 24rpx;
}

.user-name {
  font-size: 36rpx;
  color: #2D2D2D;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.user-uid {
  font-size: 24rpx;
  color: #999999;
}

.login-text {
  font-size: 28rpx;
  color: #666666;
}

.stats-section {
  display: flex;
  background-color: #FFFFFF;
  padding: 32rpx 0;
  margin-bottom: 16rpx;
  border-top: 2rpx solid #E8E8E8;
  border-bottom: 2rpx solid #E8E8E8;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 2rpx solid #E8E8E8;
}

.stat-item:last-child {
  border-right: none;
}

.stat-value {
  font-size: 36rpx;
  color: #2D2D2D;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #666666;
}

.function-section {
  background-color: #FFFFFF;
  margin-bottom: 16rpx;
}

.function-item {
  display: flex;
  align-items: center;
  height: 104rpx;
  padding: 0 32rpx;
  border-bottom: 2rpx solid #E8E8E8;
}

.function-item:last-child {
  border-bottom: none;
}

.function-item:active {
  background-color: #F5F5F5;
}

.function-item.danger .function-name {
  color: #FF3B30;
}

.danger-section {
  background-color: #FFFFFF;
}

.function-icon {
  font-size: 40rpx;
  margin-right: 24rpx;
}

.function-name {
  flex: 1;
  font-size: 28rpx;
  color: #2D2D2D;
}

.function-arrow {
  font-size: 32rpx;
  color: #CCCCCC;
}

/* 弹窗遮罩 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 999;
}

.crop-overlay {
  align-items: center;
}

/* 操作菜单 */
.action-sheet {
  width: 100%;
  background-color: #FFFFFF;
  border-radius: 16rpx 16rpx 0 0;
}

.action-item {
  padding: 32rpx;
  text-align: center;
  font-size: 30rpx;
  color: #2D2D2D;
  border-bottom: 2rpx solid #E8E8E8;
}

.action-item:active {
  background-color: #F5F5F5;
}

.action-cancel {
  padding: 32rpx;
  text-align: center;
  font-size: 30rpx;
  color: #666666;
  background-color: #F5F5F5;
  margin-top: 16rpx;
}

/* 裁剪弹窗 */
.crop-modal {
  width: 90%;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
}

.crop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid #E8E8E8;
}

.crop-cancel {
  font-size: 28rpx;
  color: #666666;
}

.crop-title {
  font-size: 32rpx;
  color: #2D2D2D;
  font-weight: 600;
}

.crop-confirm {
  font-size: 28rpx;
  color: #007AFF;
  font-weight: 600;
}

.crop-container {
  position: relative;
  height: 600rpx;
  background-color: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crop-image {
  max-width: 100%;
  max-height: 100%;
}

.crop-frame {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.crop-mask {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.5);
}

.crop-mask.top {
  top: 0;
  left: 0;
  right: 0;
  height: 150rpx;
}

.crop-mask.bottom {
  bottom: 0;
  left: 0;
  right: 0;
  height: 150rpx;
}

.crop-mask.left {
  top: 150rpx;
  left: 0;
  width: 150rpx;
  bottom: 150rpx;
}

.crop-mask.right {
  top: 150rpx;
  right: 0;
  width: 150rpx;
  bottom: 150rpx;
}

.crop-circle {
  position: absolute;
  top: 150rpx;
  left: 150rpx;
  right: 150rpx;
  bottom: 150rpx;
  border: 4rpx solid #FFFFFF;
  border-radius: 50%;
}

.crop-tools {
  display: flex;
  justify-content: center;
  gap: 64rpx;
  padding: 32rpx;
  border-top: 2rpx solid #E8E8E8;
}

.tool-btn {
  font-size: 28rpx;
  color: #007AFF;
  padding: 16rpx 32rpx;
}
</style>
