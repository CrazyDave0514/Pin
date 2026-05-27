<template>
  <view class="mine-page">
    <!-- 用户信息区 - 卡片式设计 -->
    <view class="user-card">
      <view class="user-info" @click="goToEditProfile">
        <template v-if="user">
          <view class="avatar-wrapper">
            <image v-if="!isPresetAvatar" class="user-avatar" :src="getAvatarUrl()" mode="aspectFill" />
            <image v-else-if="presetAvatarImage" class="user-avatar" :src="presetAvatarImage" mode="aspectFill" />
            <view v-else class="user-avatar preset" :style="presetAvatarStyle">
              <text class="user-avatar-glyph">{{ presetAvatarGlyph }}</text>
            </view>
          </view>
          <view class="profile-text">
            <text class="user-name">{{ user.username }}</text>
            <text class="user-uid">UID: {{ user.uid }}</text>
          </view>
        </template>
        <template v-else>
          <view class="avatar-wrapper">
            <image v-if="presetAvatarImage" class="user-avatar" :src="presetAvatarImage" mode="aspectFill" />
            <view v-else class="user-avatar preset" :style="presetAvatarStyle">
              <text class="user-avatar-glyph">{{ presetAvatarGlyph }}</text>
            </view>
          </view>
          <view class="profile-text">
            <text class="login-text">点击登录</text>
            <text class="user-uid">登录后同步项目、库存和收藏</text>
          </view>
        </template>
      </view>
    </view>

    <!-- 数据概览 -->
    <view class="stats-section">
      <view class="stat-item" @click="handleStatClick('purchases')">
        <text class="stat-value">{{ stats.purchases }}</text>
        <text class="stat-label">我的购买</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item" @click="handleStatClick('favorites')">
        <text class="stat-value">{{ stats.favorites }}</text>
        <text class="stat-label">我的收藏</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item" @click="handleStatClick('likes')">
        <text class="stat-value">{{ stats.likes }}</text>
        <text class="stat-label">我的点赞</text>
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
        <view class="function-icon-wrap">
          <image class="function-icon" :src="item.icon" mode="aspectFit" />
        </view>
        <text class="function-name">{{ item.name }}</text>
        <text class="function-arrow">›</text>
      </view>
    </view>

    <!-- 退出登录（已登录时显示） -->
    <view v-if="user" class="logout-section">
      <button class="logout-btn" @click="handleLogout">
        <text class="logout-text">退出登录</text>
      </button>
    </view>

    <!-- 头像操作菜单 -->
    <view v-if="showAvatarAction" class="modal-overlay" @click="closeAvatarMenu">
      <view class="action-sheet" @click.stop>
        <view class="action-item" @click="chooseAvatar('camera')">
          <text>拍照</text>
        </view>
        <view class="action-divider"></view>
        <view class="action-item" @click="chooseAvatar('album')">
          <text>从相册选择</text>
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
          <text class="tool-btn" @click="rotateLeft">左旋</text>
          <text class="tool-btn" @click="rotateRight">右旋</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { DEFAULT_PRESET_AVATAR, getPresetAvatarImage, getPresetAvatarMeta, isPresetAvatarValue, normalizeAvatarValue } from '../../utils/avatar-presets'
import { authService, communityService, pinDataProvider } from '../../services/pin/index'

const user = ref<any>(null)
const defaultAvatar = DEFAULT_PRESET_AVATAR
const stats = ref({
  purchases: 0,
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
  { icon: '/static/assets/v015/icons/points-active.png', name: '积分中心', path: '/pages/points/index' },
  { icon: '/static/assets/v015/icons/bead-inventory-active.png', name: '豆仓管理', path: '/pages/bead-inventory/index' },
  { icon: '/static/assets/v015/icons/favorite-active.png', name: '联系作者', path: '/pages/contact/index' },
  { icon: '/static/assets/v015/icons/settings-active.png', name: '更多设置', path: '/pages/settings/index' },
]

onMounted(() => {
  void loadUser()
  void loadStats()
})

onShow(() => {
  void loadUser()
  void loadStats()
})

/**
 * 加载用户数据
 */
const loadUser = async () => {
  const userData = await authService.getCurrentUser()
  user.value = userData
}

/**
 * 加载统计数据
 */
const loadStats = async () => {
  const [purchases, favorites, likes] = await Promise.all([
    communityService.getPurchasedArtworkIds(),
    communityService.getFavoritedArtworkIds(),
    communityService.getLikedArtworkIds(),
  ])
  stats.value.purchases = purchases.length
  stats.value.favorites = favorites.length
  stats.value.likes = likes.length
}

/**
 * 获取用户头像 URL，无自定义头像时返回默认头像
 */
const getAvatarUrl = () => {
  if (user.value && user.value.avatar) {
    return normalizeAvatarValue(user.value.avatar)
  }
  return defaultAvatar
}

const isPresetAvatar = computed(() => isPresetAvatarValue(getAvatarUrl()))
const presetAvatarImage = computed(() => getPresetAvatarImage(getAvatarUrl()))
const presetAvatarMeta = computed(() => getPresetAvatarMeta(getAvatarUrl()) || getPresetAvatarMeta(DEFAULT_PRESET_AVATAR))
const presetAvatarStyle = computed(() => ({
  backgroundColor: presetAvatarMeta.value?.bg || '#FFE3DA',
  color: presetAvatarMeta.value?.fg || '#B56A58',
}))
const presetAvatarGlyph = computed(() => presetAvatarMeta.value?.glyph || '鼠')

/**
 * 跳转到编辑资料页面
 */
const goToEditProfile = () => {
  if (!user.value) {
    uni.navigateTo({ url: '/pages/login/index' })
    return
  }
  uni.navigateTo({ url: '/pages/profile/edit' })
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
const confirmCrop = async () => {
  if (!tempAvatar.value) return

  // 保存头像到本地存储
  if (user.value) {
    user.value.avatar = tempAvatar.value
    await authService.updateCurrentUser({ avatar: user.value.avatar })
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

const handleStatClick = (type: 'purchases' | 'favorites' | 'likes') => {
  if (type === 'purchases') {
    uni.showToast({ title: '购买作品页面下一期完善', icon: 'none' })
    return
  }
  uni.navigateTo({ url: `/pages/mine/collection?type=${type}` })
}

/**
 * 退出登录 - 清除 Token 和本地用户数据
 */
const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '退出登录后，本地数据将被清除，云端数据不受影响。',
    confirmText: '确认退出',
    confirmColor: '#CF5C4D',
    cancelText: '取消',
    success: async (res) => {
      if (res.confirm) {
        // 清除 Token + 本地用户数据
        pinDataProvider.logout()
        // 刷新页面状态
        user.value = null
        uni.showToast({ title: '已退出登录', icon: 'success' })
        setTimeout(() => {
          uni.navigateTo({ url: '/pages/login/index' })
        }, 1000)
      }
    }
  })
}
</script>

<style scoped>
/* ==================== 页面容器 ==================== */
.mine-page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
  padding: 24rpx 24rpx 40rpx;
}

/* ==================== 用户信息卡片 ==================== */
.user-card {
  position: relative;
  overflow: hidden;
  background-color: var(--color-bg-panel);
  border: 2rpx solid var(--color-border);
  border-radius: 28rpx;
  box-shadow: var(--shadow-md);
  padding: 42rpx 36rpx;
  margin-bottom: 24rpx;
}

.user-card::before {
  content: none;
}

.user-info {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  text-align: left;
}

.profile-text {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 头像包装器 */
.avatar-wrapper {
  position: relative;
  margin-right: 28rpx;
  margin-bottom: 0;
}

.user-avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  border: 4rpx solid var(--color-bg-panel);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.user-avatar.preset {
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar-glyph {
  font-size: 54rpx;
  font-weight: 800;
}

.user-avatar.default {
  background-color: var(--color-border);
}

/* 头像编辑按钮 */
.avatar-edit {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 48rpx;
  height: 48rpx;
  background-color: var(--color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid var(--color-bg-panel);
}

.edit-icon {
  font-size: 24rpx;
}

.user-name {
  font-size: 36rpx;
  color: var(--color-text-primary);
  font-weight: 600;
  margin-bottom: 8rpx;
}

/* 昵称与性别标识行 */
.name-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

/* 性别标识 */
.gender-icon {
  position: relative;
  margin-left: 12rpx;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  border: 2rpx solid var(--color-border);
  flex-shrink: 0;
}

.gender-icon.gender-male {
  background-color: rgba(76,127,159,.12);
  border-color: var(--color-info);
}

.gender-icon.gender-male::after {
  content: '';
  position: absolute;
  right: -6rpx;
  top: -4rpx;
  width: 10rpx;
  height: 2rpx;
  background-color: var(--color-info);
  transform: rotate(-45deg);
  border-radius: 999rpx;
}

.gender-icon.gender-female {
  background-color: rgba(207,92,77,.10);
  border-color: var(--color-error);
}

.gender-icon.gender-female::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -8rpx;
  width: 2rpx;
  height: 8rpx;
  background-color: var(--color-error);
  transform: translateX(-50%);
}

.gender-icon.gender-female::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -5rpx;
  width: 10rpx;
  height: 2rpx;
  background-color: var(--color-error);
  transform: translateX(-50%);
}

.gender-icon.gender-secret {
  background-color: rgba(255,253,250,.86);
  border-color: var(--color-text-disabled);
}

.gender-icon.gender-secret::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background-color: var(--color-text-disabled);
  transform: translate(-50%, -50%);
}

.user-uid {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

.login-text {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--color-text-primary);
}

/* ==================== 数据概览 ==================== */
.stats-section {
  display: flex;
  align-items: center;
  background-color: var(--color-bg-panel);
  border: 2rpx solid var(--color-border);
  border-radius: 24rpx;
  box-shadow: var(--shadow-md);
  padding: 32rpx 0;
  margin-bottom: 24rpx;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-divider {
  width: 2rpx;
  height: 48rpx;
  background-color: var(--color-divider);
}

.stat-value {
  font-size: 38rpx;
  color: var(--color-text-primary);
  font-weight: 600;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

/* ==================== 功能列表 ==================== */
.function-section {
  background-color: var(--color-bg-panel);
  border: 2rpx solid var(--color-border);
  border-radius: 24rpx;
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.function-item {
  display: flex;
  align-items: center;
  height: 120rpx;
  padding: 0 28rpx;
  border-bottom: 2rpx solid var(--color-divider);
}

.function-item:last-child {
  border-bottom: none;
}

.function-item:active {
  background-color: var(--color-bg-active);
}

.function-item.danger .function-name {
  color: var(--color-error);
}

.danger-section {
  background-color: var(--color-bg-panel);
}

.function-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  margin-right: 24rpx;
  border-radius: 18rpx;
  background-color: var(--color-primary-soft);
  border: 1rpx solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.function-icon {
  width: 36rpx;
  height: 36rpx;
  display: block;
}

.function-name {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.function-arrow {
  font-size: 36rpx;
  color: var(--color-text-disabled);
}

/* ==================== 退出登录 ==================== */
.logout-section {
  margin-top: 32rpx;
}

.logout-btn {
  width: 100%;
  height: 88rpx;
  background-color: var(--color-bg-panel);
  border: 2rpx solid var(--color-error);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-text {
  font-size: 28rpx;
  color: var(--color-error);
}

/* ==================== 弹窗遮罩 ==================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-bg-mask);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 999;
}

.crop-overlay {
  align-items: center;
}

/* ==================== 操作菜单 ==================== */
.action-sheet {
  width: 100%;
  background-color: var(--color-bg-panel);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.action-item {
  padding: 32rpx;
  text-align: center;
  font-size: 32rpx;
  color: var(--color-text-primary);
}

.action-item:active {
  background-color: var(--color-bg-active);
}

.action-divider {
  height: 2rpx;
  background-color: var(--color-divider);
  margin-left: 32rpx;
  margin-right: 32rpx;
}

.action-cancel {
  padding: 32rpx;
  text-align: center;
  font-size: 32rpx;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-page);
  margin-top: 16rpx;
}

/* ==================== 裁剪弹窗 ==================== */
.crop-modal {
  width: 90%;
  background-color: var(--color-bg-panel);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.crop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid var(--color-divider);
}

.crop-cancel {
  font-size: 30rpx;
  color: var(--color-text-secondary);
}

.crop-title {
  font-size: 32rpx;
  color: var(--color-text-primary);
  font-weight: 600;
}

.crop-confirm {
  font-size: 30rpx;
  color: var(--color-primary);
  font-weight: 600;
}

/** 裁剪容器 - 使用 CSS 变量适配深色主题 */
.crop-container {
  position: relative;
  height: 600rpx;
  background-color: var(--color-bg-crop);
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
  background-color: var(--color-bg-mask);
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
  top: 50%;
  left: 50%;
  width: 450rpx;
  height: 450rpx;
  transform: translate(-50%, -50%);
  border: 4rpx solid var(--color-text-inverse);
  border-radius: 50%;
  box-sizing: border-box;
}

.crop-tools {
  display: flex;
  justify-content: center;
  gap: 64rpx;
  padding: 32rpx;
  border-top: 2rpx solid var(--color-divider);
}

.tool-btn {
  font-size: 30rpx;
  color: var(--color-primary);
  padding: 16rpx 32rpx;
}
</style>
