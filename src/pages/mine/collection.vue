<template>
  <view class="collection-page">
    <view class="page-nav">
      <view class="nav-back" @click="goBack">
        <image class="back-img" src="/static/assets/v015/icons/back.png" mode="aspectFit" />
      </view>
      <text class="nav-title">{{ pageTitle }}</text>
      <view class="nav-placeholder"></view>
    </view>

    <scroll-view class="list-scroll" scroll-y :show-scrollbar="false">
      <view v-if="items.length > 0" class="artwork-list">
        <view
          v-for="item in items"
          :key="item.id"
          class="artwork-row"
          @click="goToDetail(item.id)"
        >
          <view class="cover-box" :style="{ backgroundColor: item.cover?.palette?.[0] || '#F7F3EC' }">
            <image v-if="item.thumbnail" class="cover-img" :src="item.thumbnail" mode="aspectFit" />
            <view v-else class="cover-dots">
              <view
                v-for="dot in buildDots(item)"
                :key="dot.key"
                class="cover-dot"
                :style="{ backgroundColor: dot.color }"
              ></view>
            </view>
          </view>
          <view class="row-info">
            <text class="row-title">{{ item.name }}</text>
            <text class="row-author">@{{ item.creatorName }}</text>
            <text class="row-meta">{{ item.points > 0 ? item.points + ' 积分' : '免费' }} · {{ item.useCount }} 销量</text>
          </view>
          <text class="row-arrow">›</text>
        </view>
      </view>

      <view v-else class="empty-state">
        <image class="empty-icon" src="/static/assets/v015/icons/favorite-muted.png" mode="aspectFit" />
        <text class="empty-text">{{ emptyText }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ensureCommunityArtworks, getIdList, type CommunityArtwork } from '../../utils/community'

const type = ref<'favorites' | 'likes'>('favorites')
const items = ref<CommunityArtwork[]>([])

const pageTitle = computed(() => type.value === 'likes' ? '我的点赞' : '我的收藏')
const emptyText = computed(() => type.value === 'likes' ? '还没有点赞作品' : '还没有收藏作品')

onLoad((options: any) => {
  type.value = options?.type === 'likes' ? 'likes' : 'favorites'
  loadItems()
})

onShow(() => {
  loadItems()
})

const loadItems = () => {
  const key = type.value === 'likes' ? 'pin_liked_artworks' : 'pin_favorited_artworks'
  const ids = getIdList(key)
  const all = ensureCommunityArtworks()
  items.value = ids
    .map((id) => all.find((item) => item.id === id && item.isPublic !== false))
    .filter(Boolean) as CommunityArtwork[]
}

const buildDots = (item: CommunityArtwork) => {
  const palette = item.cover?.palette?.length ? item.cover.palette : ['#F5A623', '#5F9B73', '#4C7F9F', '#CF5C4D']
  return Array.from({ length: 16 }).map((_, index) => ({
    key: `${item.id}_${index}`,
    color: palette[(index + item.id.length) % palette.length],
  }))
}

const goToDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/artwork-detail/index?id=${id}` })
}

const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.collection-page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
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

.nav-back,
.nav-placeholder {
  width: 76rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
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

.list-scroll {
  height: calc(100vh - 92rpx);
  padding: 20rpx 24rpx;
  box-sizing: border-box;
}

.artwork-row {
  min-height: 166rpx;
  padding: 18rpx;
  margin-bottom: 18rpx;
  border-radius: 22rpx;
  background-color: var(--color-bg-panel);
  border: 2rpx solid var(--color-border);
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
}

.cover-box {
  width: 128rpx;
  height: 128rpx;
  border-radius: 18rpx;
  overflow: hidden;
  margin-right: 20rpx;
  flex-shrink: 0;
  border: 1rpx solid var(--color-border);
}

.cover-img {
  width: 100%;
  height: 100%;
  display: block;
  background-color: var(--color-primary-soft);
}

.cover-dots {
  width: 100%;
  height: 100%;
  padding: 16rpx;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8rpx;
  background-color: rgba(255,253,250,.78);
}

.cover-dot {
  border-radius: 50%;
  box-shadow: inset 0 -1rpx 0 rgba(0,0,0,.16);
}

.row-info {
  flex: 1;
  min-width: 0;
}

.row-title {
  display: block;
  font-size: 30rpx;
  line-height: 1.35;
  font-weight: 800;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8rpx;
}

.row-author,
.row-meta {
  display: block;
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-top: 4rpx;
}

.row-meta {
  color: var(--color-text-tertiary);
}

.row-arrow {
  margin-left: 14rpx;
  font-size: 44rpx;
  color: var(--color-text-disabled);
}

.empty-state {
  height: 620rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-icon {
  width: 108rpx;
  height: 108rpx;
  opacity: .62;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: var(--color-text-tertiary);
}
</style>
