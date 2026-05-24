<template>
  <view class="search-page">
    <!-- 搜索栏 -->
    <view class="search-header">
      <view class="search-bar">
        <image class="search-icon" src="/static/assets/v015/icons/search-muted.png" mode="aspectFit" />
        <input
          class="search-input"
          :placeholder="pageMode === 'project' ? '搜索项目 / 文件夹 / 标签' : '搜索作品名称'"
          v-model="keyword"
          @confirm="handleSearch"
          confirm-type="search"
        />
        <text v-if="keyword" class="clear-btn" @click="keyword = ''">✕</text>
      </view>
      <text class="cancel-btn" @click="goBack">取消</text>
    </view>

    <scroll-view class="search-content" scroll-y>
      <!-- 搜索历史 -->
      <view v-if="searchHistory.length > 0 && !keyword" class="history-section">
        <view class="section-header">
          <text class="section-title">搜索历史</text>
          <text class="clear-all" @click="clearHistory">清空</text>
        </view>
        <view class="history-list">
          <view
            v-for="(item, index) in searchHistory"
            :key="index"
            class="history-tag"
            @click="handleHistoryClick(item)"
          >
            <text class="tag-text">{{ item }}</text>
            <text class="delete-btn" @click.stop="deleteHistoryItem(item)">✕</text>
          </view>
        </view>
      </view>

      <!-- 热门搜索 -->
      <view v-if="!keyword" class="hot-section">
        <text class="section-title">热门搜索</text>
        <view class="hot-list">
          <view
            v-for="(item, index) in hotSearches"
            :key="index"
            class="hot-tag"
            @click="handleHistoryClick(item)"
          >
            <text class="hot-rank">{{ index + 1 }}</text>
            <text class="hot-text">{{ item }}</text>
          </view>
        </view>
      </view>

      <!-- 搜索结果 -->
      <view v-if="keyword && results.length > 0" class="results-section">
        <text class="section-title">搜索结果</text>
        <view class="results-list">
          <view v-for="item in results" :key="item.id" class="result-item" @click="goToDetail(item)">
            <text class="result-name">{{ item.name }}</text>
            <text class="result-author">{{ item.subtitle }}</text>
          </view>
        </view>
      </view>

      <!-- 无结果 -->
      <view v-if="keyword && results.length === 0" class="empty-state">
        <text class="empty-text">{{ pageMode === 'project' ? '未找到相关项目' : '未找到相关作品' }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ensureCommunityArtworks } from '../../utils/community'

/** 搜索关键词 */
const keyword = ref('')
const pageMode = ref<'community' | 'project'>('community')

/** 搜索历史记录 */
const searchHistory = ref<string[]>([])

/** 热门搜索词列表 */
const hotSearches = ref(['猫咪', '花朵', '卡通', '动物', '风景', '人物'])

/** 搜索结果列表 */
const results = ref<any[]>([])

onLoad((options) => {
  pageMode.value = options?.mode === 'project' ? 'project' : 'community'
})

onMounted(() => {
  const history = uni.getStorageSync('pin_search_history') || []
  searchHistory.value = history
})

watch(keyword, (value) => {
  if (!value.trim()) {
    results.value = []
    return
  }
  handleSearch(false)
})

/**
 * 执行搜索操作
 * 保存搜索关键词到历史记录，并从本地存储中过滤匹配的作品
 */
const handleSearch = (saveHistory = true) => {
  if (!keyword.value.trim()) return

  if (saveHistory) {
    const newHistory = [keyword.value, ...searchHistory.value.filter(h => h !== keyword.value)].slice(0, 10)
    searchHistory.value = newHistory
    uni.setStorageSync('pin_search_history', newHistory)
  }

  // 执行搜索
  const normalizedKeyword = keyword.value.toLowerCase()
  if (pageMode.value === 'project') {
    const projects = (uni.getStorageSync('pin_projects') || []).map((item: any) => {
      const tags = [item.tags?.primary, item.tags?.secondary].filter(Boolean).join(' / ')
      return {
        id: item.id,
        type: 'project',
        name: item.name || '未命名作品',
        subtitle: tags || '项目作品',
        folderId: item.folderId || '',
        extra: [tags, item.canvasData?.width, item.canvasData?.height].join(' '),
      }
    })
    const folders = (uni.getStorageSync('pin_folders') || []).map((item: any) => ({
      id: item.id,
      type: 'folder',
      name: item.name || '未命名文件夹',
      subtitle: '文件夹',
      extra: '',
    }))
    const artworks = ensureCommunityArtworks().map((item: any) => ({
      id: item.projectId || item.id,
      type: 'project',
      name: item.name || '未命名作品',
      subtitle: [item.creatorName, ...(item.tags || [])].filter(Boolean).join(' / ') || '社区作品',
      folderId: '',
      extra: [item.creatorName, ...(item.tags || [])].join(' '),
    }))
    const merged = [...projects, ...folders, ...artworks]
      .filter((item, index, array) => array.findIndex((target) => target.type === item.type && target.id === item.id) === index)
    results.value = merged.filter((item: any) => {
      const haystack = [item.name, item.subtitle, item.extra].join(' ').toLowerCase()
      return haystack.includes(normalizedKeyword)
    })
    return
  }

  const artworks = ensureCommunityArtworks()
  results.value = artworks
    .filter((a: any) =>
      a.isPublic !== false &&
      a.name.toLowerCase().includes(normalizedKeyword)
    )
    .map((item: any) => ({
      ...item,
      subtitle: `by ${item.creatorName}`,
    }))
}

/**
 * 点击搜索历史项，自动填入关键词并执行搜索
 * @param item 历史搜索关键词
 */
const handleHistoryClick = (item: string) => {
  keyword.value = item
  handleSearch()
}

/**
 * 清空全部搜索历史记录
 */
const clearHistory = () => {
  searchHistory.value = []
  uni.removeStorageSync('pin_search_history')
}

/**
 * 删除单条搜索历史记录
 * @param item 要删除的历史搜索关键词
 */
const deleteHistoryItem = (item: string) => {
  const newHistory = searchHistory.value.filter(h => h !== item)
  searchHistory.value = newHistory
  uni.setStorageSync('pin_search_history', newHistory)
}

/**
 * 返回上一页
 */
const goBack = () => {
  uni.navigateBack()
}

const goToDetail = (item: any) => {
  if (pageMode.value === 'project') {
    if (item.type === 'folder') {
      uni.navigateBack({
        success: () => {
          uni.$emit('projectSearchOpenFolder', item.id)
        },
      })
      return
    }
    uni.navigateTo({ url: `/pages/canvas-editor/index?mode=edit&projectId=${item.id}` })
    return
  }
  uni.navigateTo({ url: `/pages/artwork-detail/index?id=${item.id}` })
}
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
}

.search-header {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  background-color: var(--color-bg-panel);
  border-bottom: 1rpx solid var(--color-border);
}

.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  height: 72rpx;
  background-color: var(--color-bg-page);
  border-radius: 36rpx;
  padding: 0 24rpx;
}

.search-icon {
  width: 28rpx;
  height: 28rpx;
  margin-right: 16rpx;
  display: block;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--color-text-primary);
  border: none;
  background: transparent;
}

.clear-btn {
  font-size: 28rpx;
  color: var(--color-text-tertiary);
  padding: 8rpx;
}

.cancel-btn {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  margin-left: 24rpx;
}

.search-content {
  height: calc(100vh - 120rpx);
  padding: 32rpx;
}

.section-title {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  margin-bottom: 24rpx;
  display: block;
}

.history-section {
  margin-bottom: 48rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.clear-all {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.history-list {
  display: flex;
  flex-wrap: wrap;
}

.history-tag {
  display: flex;
  align-items: center;
  background-color: var(--color-bg-page);
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  margin-right: 24rpx;
  margin-bottom: 24rpx;
}

.tag-text {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.delete-btn {
  font-size: 22rpx;
  color: var(--color-text-tertiary);
  margin-left: 12rpx;
  padding: 4rpx;
}

.hot-section {
  margin-bottom: 48rpx;
}

.hot-list {
  display: flex;
  flex-direction: column;
}

.hot-tag {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--color-border);
}

.hot-rank {
  width: 48rpx;
  font-size: 28rpx;
  color: var(--color-text-tertiary);
  font-weight: 600;
}

.hot-text {
  font-size: 28rpx;
  color: var(--color-text-primary);
}

.results-section {
  .section-title {
    margin-bottom: 24rpx;
  }
}

.results-list {
  background-color: var(--color-bg-panel);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.result-item {
  padding: 32rpx;
  border-bottom: 1rpx solid var(--color-border);
}

.result-name {
  font-size: 28rpx;
  color: var(--color-text-primary);
  margin-bottom: 8rpx;
  display: block;
}

.result-author {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: var(--color-text-tertiary);
}
</style>
