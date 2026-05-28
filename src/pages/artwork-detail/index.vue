<template>
  <!-- 作品详情页 V0.2.1 - 改造版（添加举报/拉黑/权限控制） -->
  <view class="detail-page" v-if="artwork">
    <view class="page-nav">
      <view class="nav-back" @click="goBack">
        <image class="back-img" src="/static/assets/v015/icons/back.png" mode="aspectFit" />
      </view>
      <text class="nav-title">作品详情</text>
      <!-- 更多操作按钮 -->
      <view class="nav-more" @click="showMoreActions">
        <text class="more-icon">⋯</text>
      </view>
    </view>

    <scroll-view class="detail-scroll" scroll-y :show-scrollbar="false">
      <view class="preview-section">
        <view class="preview-tabs">
          <view
            v-for="tab in previewTabs"
            :key="tab.key"
            :class="['preview-tab', activePreview === tab.key ? 'active' : '']"
            @click="switchPreview(tab.key)"
          >
            <text>{{ tab.label }}</text>
          </view>
        </view>
        <view :class="['preview-board', activePreview]">
          <image
            v-if="artwork.thumbnail"
            class="preview-image"
            :class="activePreview"
            :src="artwork.thumbnail"
            mode="aspectFit"
          />
          <canvas
            v-else
            canvas-id="detail-cover"
            id="detail-cover"
            class="preview-canvas"
          />
          <view class="size-badge">{{ artworkSpecs }}</view>
        </view>
      </view>

      <view class="info-section">
        <text class="artwork-title">{{ artwork.name }}</text>
        <view class="author-row">
          <view class="author-main" @click="goToCreatorProfile">
            <image v-if="showAvatarImage" class="author-avatar" :src="artwork.creatorAvatar" mode="aspectFill" />
            <image v-else-if="presetAvatarImage" class="author-avatar" :src="presetAvatarImage" mode="aspectFill" />
            <view v-else class="author-avatar preset" :style="presetAvatarStyle">
              <text class="author-avatar-text">{{ presetAvatarGlyph }}</text>
            </view>
            <text class="author-name">@{{ artwork.creatorName }}</text>
            <text class="author-arrow">›</text>
          </view>
          <view :class="['follow-btn', isFollowing ? 'followed' : '']" @click="toggleFollow">
            <text>{{ isFollowing ? '已关注' : '关注' }}</text>
          </view>
        </view>

        <view class="meta-grid">
          <view class="meta-item">
            <text class="meta-value">{{ artwork.useCount }}</text>
            <text class="meta-label">销量</text>
          </view>
          <view class="meta-item wide">
            <text class="meta-value small">{{ formatDateTime(artwork.updatedAt) }}</text>
            <text class="meta-label">更新时间</text>
          </view>
        </view>

        <view class="tag-list">
          <text v-for="tag in visibleTags" :key="tag" class="tag-item">{{ tag }}</text>
          <text v-if="hiddenTagCount > 0" class="tag-item more">+{{ hiddenTagCount }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="bottom-bar">
      <view class="social-actions">
        <view :class="['social-btn', isLiked ? 'active' : '']" @click="toggleLike">
          <text class="social-glyph">{{ isLiked ? '♥' : '♡' }}</text>
          <text>{{ artwork.likes }}</text>
        </view>
        <view :class="['social-btn', isFavorited ? 'active' : '']" @click="toggleFavorite">
          <text class="social-glyph">{{ isFavorited ? '★' : '☆' }}</text>
          <text>{{ artwork.favorites }}</text>
        </view>
      </view>
      <view class="purchase-area">
        <text class="cost-text">{{ costText }}</text>
        <view :class="['buy-btn', isPurchased ? 'disabled' : '']" @click="purchaseArtwork">
          <text>{{ isPurchased ? '已购买' : '购买' }}</text>
        </view>
      </view>
    </view>
  </view>

  <view class="detail-page empty" v-else>
    <view class="page-nav">
      <view class="nav-back" @click="goBack">
        <image class="back-img" src="/static/assets/v015/icons/back.png" mode="aspectFit" />
      </view>
      <text class="nav-title">作品详情</text>
      <view class="nav-placeholder"></view>
    </view>
    <text class="empty-text">作品不存在或已下架</text>
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getPresetAvatarImage, getPresetAvatarMeta, isPresetAvatarValue } from '@/utils/avatar-presets'
import { getMardCodeByHex } from '@/utils/mard-colors'
import { communityService, purchaseService, type CommunityArtwork } from '../../services/pin/index'
import { checkLogin } from '../../utils/auth-guard'

const instance = getCurrentInstance()
const artwork = ref<CommunityArtwork | null>(null)
const activePreview = ref<'ironed' | 'blueprint'>('ironed')
const artworkId = ref('')
const isLiked = ref(false)
const isFavorited = ref(false)
const isPurchased = ref(false)
const isFollowing = ref(false)
const isBlocked = ref(false)

const previewTabs = [
  { key: 'ironed', label: '熨烫效果' },
  { key: 'blueprint', label: '图纸效果' },
] as const

const artworkSize = computed(() => {
  const width = artwork.value?.canvasData?.width || 0
  const height = artwork.value?.canvasData?.height || 0
  return `${width}*${height}格`
})

const artworkSpecs = computed(() => {
  const width = artwork.value?.canvasData?.width || 0
  const height = artwork.value?.canvasData?.height || 0
  const beadCount = artwork.value?.beadCount || artwork.value?.canvasData?.beads?.length || 0
  const colorTypeCount = artwork.value?.colorTypeCount || 0
  return `${width}×${height}格｜${beadCount}豆｜${colorTypeCount}种色号`
})

const visibleTags = computed(() => (artwork.value?.tags || []).slice(0, 5))
const hiddenTagCount = computed(() => Math.max(0, (artwork.value?.tags?.length || 0) - 5))
const showAvatarImage = computed(() => !!artwork.value?.creatorAvatar && !isPresetAvatarValue(artwork.value.creatorAvatar))
const presetAvatarImage = computed(() => getPresetAvatarImage(artwork.value?.creatorAvatar))
const presetAvatarMeta = computed(() => getPresetAvatarMeta(artwork.value?.creatorAvatar))
const presetAvatarStyle = computed(() => ({
  backgroundColor: presetAvatarMeta.value?.bg || '#FFE3DA',
  color: presetAvatarMeta.value?.fg || '#B56A58',
}))
const presetAvatarGlyph = computed(() => presetAvatarMeta.value?.glyph || '鼠')

const costText = computed(() => {
  const points = artwork.value?.points || 0
  return points > 0 ? `${points} 积分` : '免费'
})

onLoad((options: any) => {
  artworkId.value = options?.id || ''
  void loadArtwork()
})

const loadArtwork = async () => {
  const found = await communityService.getArtworkById(artworkId.value)
  artwork.value = found && found.isPublic !== false ? found : null
  if (!artwork.value) return

  const state = await communityService.getInteractionState(artwork.value.id, artwork.value.creatorName)
  isLiked.value = state.isLiked
  isFavorited.value = state.isFavorited
  isPurchased.value = state.isPurchased
  isFollowing.value = state.isFollowing
  isBlocked.value = state.isBlocked || false
  nextTick(() => setTimeout(renderPreview, 120))
}

const switchPreview = (key: 'ironed' | 'blueprint') => {
  activePreview.value = key
  nextTick(() => setTimeout(renderPreview, 80))
}

/**
 * 切换点赞 - 需要登录
 */
const toggleLike = async () => {
  if (!artwork.value) return
  
  // 检查登录状态
  if (!checkLogin({ message: '点赞需要登录后才能操作' })) {
    return
  }
  
  const { added, artwork: updated } = await communityService.toggleLike(artwork.value.id)
  if (updated) artwork.value = updated
  isLiked.value = added
}

/**
 * 切换收藏 - 需要登录
 */
const toggleFavorite = async () => {
  if (!artwork.value) return
  
  // 检查登录状态
  if (!checkLogin({ message: '收藏需要登录后才能操作' })) {
    return
  }
  
  const { added, artwork: updated } = await communityService.toggleFavorite(artwork.value.id)
  if (updated) artwork.value = updated
  isFavorited.value = added
}

/**
 * 切换关注 - 需要登录
 */
const toggleFollow = async () => {
  if (!artwork.value) return
  
  // 检查登录状态
  if (!checkLogin({ message: '关注需要登录后才能操作' })) {
    return
  }
  
  isFollowing.value = await communityService.toggleFollow(artwork.value.creatorName)
  uni.showToast({ title: isFollowing.value ? '已关注' : '已取消关注', icon: 'none' })
}

/**
 * 购买作品 - 需要登录
 */
const purchaseArtwork = async () => {
  if (!artwork.value || isPurchased.value) return
  
  // 检查登录状态
  if (!checkLogin({ message: '购买需要登录后才能操作' })) {
    return
  }
  
  const result = await purchaseService.purchaseArtwork(artwork.value.id)
  if (!result.success) {
    if (result.reason === 'INSUFFICIENT_POINTS') {
      uni.showToast({ title: '积分不足', icon: 'none' })
    }
    return
  }

  if (result.artwork) artwork.value = result.artwork
  isPurchased.value = true
  uni.showToast({ title: '购买成功', icon: 'success' })
}

/**
 * 显示更多操作（举报/拉黑）
 */
const showMoreActions = () => {
  if (!artwork.value) return
  
  const itemList = ['举报作品']
  if (!isBlocked.value) {
    itemList.push('拉黑作者')
  }
  
  uni.showActionSheet({
    itemList,
    success: (res) => {
      if (res.tapIndex === 0) {
        reportArtwork()
      } else if (res.tapIndex === 1 && !isBlocked.value) {
        blockCreator()
      }
    }
  })
}

/**
 * 举报作品 - 需要登录
 */
const reportArtwork = () => {
  if (!artwork.value) return
  
  // 检查登录状态
  if (!checkLogin({ message: '举报需要登录后才能操作' })) {
    return
  }
  
  // 跳转到举报页面
  uni.navigateTo({
    url: `/pages/report/index?type=artwork&id=${artwork.value.id}&creator=${artwork.value.creatorName}`
  })
}

/**
 * 拉黑作者 - 需要登录
 */
const blockCreator = () => {
  if (!artwork.value) return
  
  // 检查登录状态
  if (!checkLogin({ message: '拉黑需要登录后才能操作' })) {
    return
  }
  
  uni.showModal({
    title: '确认拉黑',
    content: `确定要拉黑 ${artwork.value.creatorName} 吗？拉黑后将不再看到该创作者的作品。`,
    confirmText: '拉黑',
    confirmColor: '#CF5C4D',
    cancelText: '取消',
    success: async (res) => {
      if (res.confirm) {
        try {
          await communityService.blockCreator(artwork.value!.creatorName)
          isBlocked.value = true
          isFollowing.value = false // 拉黑自动取消关注
          uni.showToast({ title: '已拉黑', icon: 'success' })
        } catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    }
  })
}

/**
 * 跳转到创作者主页
 */
const goToCreatorProfile = () => {
  if (!artwork.value?.creatorUid) {
    // 如果没有 UID，尝试通过用户名查找
    uni.showToast({ title: '暂无法查看创作者主页', icon: 'none' })
    return
  }
  uni.navigateTo({
    url: `/pages/creator-profile/index?uid=${artwork.value.creatorUid}`
  })
}

const renderPreview = () => {
  if (!artwork.value || artwork.value.thumbnail) return
  const query = uni.createSelectorQuery().in(instance)
  query.select('#detail-cover').boundingClientRect((rect: any) => {
    if (!rect || !rect.width) return
    const ctx = uni.createCanvasContext('detail-cover', instance)
    drawArtwork(ctx, rect.width, rect.height || rect.width)
  }).exec()
}

const drawArtwork = (ctx: UniApp.CanvasContext, width: number, height: number) => {
  if (!artwork.value) return
  const data = artwork.value.canvasData
  if (data?.beads?.length) {
    const w = data.width || 29
    const h = data.height || 29
    const cell = Math.floor(Math.min(width / w, height / h))
    const offsetX = Math.floor((width - w * cell) / 2)
    const offsetY = Math.floor((height - h * cell) / 2)
    ctx.setFillStyle(data.backgroundColor || '#FFFDFA')
    ctx.fillRect(0, 0, width, height)
    if (activePreview.value === 'blueprint') {
      ctx.setStrokeStyle('rgba(35,31,26,.10)')
      for (let x = 0; x <= w; x++) {
        ctx.beginPath()
        ctx.moveTo(offsetX + x * cell, offsetY)
        ctx.lineTo(offsetX + x * cell, offsetY + h * cell)
        ctx.stroke()
      }
      for (let y = 0; y <= h; y++) {
        ctx.beginPath()
        ctx.moveTo(offsetX, offsetY + y * cell)
        ctx.lineTo(offsetX + w * cell, offsetY + y * cell)
        ctx.stroke()
      }
    }
    data.beads.forEach((bead) => {
      const cx = offsetX + bead.x * cell + cell / 2
      const cy = offsetY + bead.y * cell + cell / 2
      ctx.beginPath()
      if (activePreview.value === 'ironed') {
        ctx.arc(cx, cy, Math.max(2, cell * 0.46), 0, Math.PI * 2)
      } else {
        ctx.rect(offsetX + bead.x * cell + 1, offsetY + bead.y * cell + 1, Math.max(1, cell - 2), Math.max(1, cell - 2))
      }
      ctx.setFillStyle(bead.color)
      ctx.fill()
      if (activePreview.value === 'ironed') {
        ctx.beginPath()
        ctx.arc(cx, cy, Math.max(1, cell * 0.12), 0, Math.PI * 2)
        ctx.setFillStyle('rgba(255,255,255,.92)')
        ctx.fill()
        return
      }
      if (cell >= 16) {
        const code = getMardCodeByHex(bead.color) || ''
        if (code) {
          ctx.setFillStyle('rgba(35,31,26,.72)')
          ctx.setFontSize(Math.max(7, Math.floor(cell * 0.24)))
          ctx.setTextAlign('center')
          ctx.setTextBaseline('middle')
          ctx.fillText(code, cx, cy)
        }
      }
    })
    ctx.draw()
    return
  }
  drawGeneratedCover(ctx, width, height)
}

const drawGeneratedCover = (ctx: UniApp.CanvasContext, width: number, height: number) => {
  if (!artwork.value?.cover) return
  let seed = artwork.value.cover.seed || 1
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const palette = artwork.value.cover.palette || ['#F5A623', '#5F9B73', '#4C7F9F']
  const gridSize = 12
  const cell = Math.floor(Math.min(width, height) / gridSize)
  const offsetX = Math.floor((width - gridSize * cell) / 2)
  const offsetY = Math.floor((height - gridSize * cell) / 2)
  ctx.setFillStyle('#F7F3EC')
  ctx.fillRect(0, 0, width, height)
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (random() < 0.35) continue
      const color = palette[Math.floor(random() * palette.length)]
      const cx = offsetX + x * cell + cell / 2
      const cy = offsetY + y * cell + cell / 2
      ctx.beginPath()
      if (activePreview.value === 'ironed') {
        ctx.arc(cx, cy, cell * 0.43, 0, Math.PI * 2)
      } else {
        ctx.rect(offsetX + x * cell + 2, offsetY + y * cell + 2, cell - 4, cell - 4)
      }
      ctx.setFillStyle(color)
      ctx.fill()
    }
  }
  ctx.draw()
}

const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
  padding-bottom: 140rpx;
}

.page-nav {
  height: 92rpx;
  padding: 0 24rpx;
  background-color: var(--color-bg-panel);
  border-bottom: 1rpx solid var(--color-divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-back {
  width: 76rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
}

.nav-more {
  width: 76rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.more-icon {
  font-size: 40rpx;
  color: var(--color-text-primary);
  font-weight: bold;
}

.back-img {
  width: 38rpx;
  height: 38rpx;
}

.nav-title {
  font-size: 34rpx;
  color: var(--color-text-primary);
  font-weight: 800;
}

.nav-placeholder {
  width: 76rpx;
}

.detail-scroll {
  height: calc(100vh - 232rpx);
}

.preview-section,
.info-section {
  margin: 24rpx;
  background-color: var(--color-bg-panel);
  border: 2rpx solid var(--color-border);
  border-radius: 24rpx;
  box-shadow: var(--shadow-md);
}

.preview-section {
  padding: 18rpx;
}

.preview-tabs {
  display: flex;
  padding: 6rpx;
  border-radius: 18rpx;
  background-color: var(--color-primary-soft);
  margin-bottom: 18rpx;
}

.preview-tab {
  flex: 1;
  height: 64rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.preview-tab.active {
  background-color: var(--color-text-primary);
  color: var(--color-text-inverse);
}

.preview-board {
  position: relative;
  height: 620rpx;
  border-radius: 20rpx;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgba(35,31,26,.06) 1px, transparent 1px),
    linear-gradient(180deg, rgba(35,31,26,.06) 1px, transparent 1px),
    #F7F3EC;
  background-size: 24rpx 24rpx;
  transition: transform .24s ease, opacity .24s ease;
}

.preview-board.ironed {
  background-color: #F2E5D5;
  background-image: none;
}

.preview-board.blueprint::after {
  content: '';
  position: absolute;
  inset: 18rpx;
  background:
    linear-gradient(90deg, rgba(35,31,26,.08) 1px, transparent 1px),
    linear-gradient(180deg, rgba(35,31,26,.08) 1px, transparent 1px);
  background-size: 16rpx 16rpx;
  pointer-events: none;
}

.preview-image,
.preview-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.preview-image.ironed {
  padding: 18rpx;
  box-sizing: border-box;
  filter: saturate(1.02) contrast(1.03);
}

.preview-image.blueprint {
  padding: 18rpx;
  box-sizing: border-box;
  image-rendering: pixelated;
}

.size-badge {
  position: absolute;
  right: 18rpx;
  bottom: 18rpx;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background-color: rgba(255,253,250,.92);
  border: 1rpx solid var(--color-border);
  font-size: 22rpx;
  font-weight: 800;
  color: var(--color-text-primary);
  max-width: calc(100% - 36rpx);
}

.info-section {
  padding: 26rpx;
}

.artwork-title {
  display: block;
  font-size: 38rpx;
  line-height: 1.35;
  color: var(--color-text-primary);
  font-weight: 800;
  margin-bottom: 22rpx;
}

.author-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.author-main {
  display: flex;
  align-items: center;
  min-width: 0;
}

.author-avatar {
  width: 58rpx;
  height: 58rpx;
  border-radius: 50%;
  margin-right: 14rpx;
  background-color: var(--color-primary-soft);
  overflow: hidden;
}

.author-avatar.fallback {
  border: 2rpx solid var(--color-border);
}

.author-avatar.preset {
  display: flex;
  align-items: center;
  justify-content: center;
}

.author-avatar-text {
  font-size: 26rpx;
  font-weight: 800;
}

.author-name {
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 700;
}

.author-arrow {
  font-size: 28rpx;
  color: var(--color-text-tertiary);
  margin-left: 8rpx;
}

.follow-btn {
  min-width: 112rpx;
  height: 58rpx;
  border-radius: 999rpx;
  background-color: var(--color-primary);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25rpx;
  font-weight: 800;
}

.follow-btn.followed {
  background-color: var(--color-primary-soft);
  color: var(--color-text-secondary);
  border: 1rpx solid var(--color-border);
}

.meta-grid {
  display: flex;
  gap: 14rpx;
  margin-bottom: 22rpx;
}

.meta-item {
  flex: 1;
  min-height: 92rpx;
  padding: 14rpx;
  border-radius: 16rpx;
  background-color: var(--color-primary-soft);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.meta-item.wide {
  flex: 2.2;
}

.meta-value {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--color-text-primary);
}

.meta-value.small {
  font-size: 24rpx;
}

.meta-label {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--color-text-tertiary);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-item {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background-color: #FFFFFF;
  border: 1rpx solid var(--color-border);
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.tag-item.more {
  color: var(--color-primary-dark);
  font-weight: 700;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  min-height: 116rpx;
  padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
  background-color: var(--color-bg-panel);
  border-top: 1rpx solid var(--color-divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.social-actions {
  display: flex;
  gap: 12rpx;
}

.social-btn {
  min-width: 104rpx;
  height: 72rpx;
  border-radius: 18rpx;
  border: 1rpx solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-panel);
}

.social-btn.active {
  color: #F5A623;
  background-color: #FFF6E3;
  transform: scale(1.02);
}

.social-icon {
  width: 28rpx;
  height: 28rpx;
}

.social-glyph {
  font-size: 28rpx;
  line-height: 1;
}

.purchase-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14rpx;
  min-width: 0;
}

.cost-text {
  font-size: 26rpx;
  color: var(--color-primary-dark);
  font-weight: 800;
}

.buy-btn {
  min-width: 170rpx;
  height: 76rpx;
  border-radius: 20rpx;
  background-color: var(--color-text-primary);
  color: var(--color-text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 800;
}

.buy-btn.disabled {
  background-color: var(--color-text-disabled);
}

.empty {
  display: flex;
  flex-direction: column;
}

.empty-text {
  margin-top: 240rpx;
  text-align: center;
  font-size: 28rpx;
  color: var(--color-text-tertiary);
}
</style>
