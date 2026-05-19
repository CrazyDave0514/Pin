<template>
  <view class="search-page">
    <!-- 搜索栏 -->
    <view class="search-header">
      <view class="search-bar">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          placeholder="搜索作品名称"
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
          <view v-for="item in results" :key="item.id" class="result-item">
            <text class="result-name">{{ item.name }}</text>
            <text class="result-author">by {{ item.creatorName }}</text>
          </view>
        </view>
      </view>

      <!-- 无结果 -->
      <view v-if="keyword && results.length === 0" class="empty-state">
        <text class="empty-text">未找到相关作品</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const keyword = ref('')
const searchHistory = ref<string[]>([])
const hotSearches = ref(['猫咪', '花朵', '卡通', '动物', '风景', '人物'])
const results = ref<any[]>([])

onMounted(() => {
  const history = uni.getStorageSync('pin_search_history') || []
  searchHistory.value = history
})

const handleSearch = () => {
  if (!keyword.value.trim()) return

  // 保存搜索历史
  const newHistory = [keyword.value, ...searchHistory.value.filter(h => h !== keyword.value)].slice(0, 10)
  searchHistory.value = newHistory
  uni.setStorageSync('pin_search_history', newHistory)

  // 执行搜索
  const artworks = uni.getStorageSync('pin_artworks') || []
  results.value = artworks.filter((a: any) =>
    a.name.toLowerCase().includes(keyword.value.toLowerCase())
  )
}

const handleHistoryClick = (item: string) => {
  keyword.value = item
  handleSearch()
}

const clearHistory = () => {
  searchHistory.value = []
  uni.removeStorageSync('pin_search_history')
}

const deleteHistoryItem = (item: string) => {
  const newHistory = searchHistory.value.filter(h => h !== item)
  searchHistory.value = newHistory
  uni.setStorageSync('pin_search_history', newHistory)
}

const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  background-color: #F5F5F5;
}

.search-header {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background-color: #FFFFFF;
  border-bottom: 1px solid #E8E8E8;
}

.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  height: 72px;
  background-color: #F5F5F5;
  border-radius: 36px;
  padding: 0 24px;
}

.search-icon {
  font-size: 32px;
  margin-right: 16px;
}

.search-input {
  flex: 1;
  font-size: 28px;
  color: #2D2D2D;
  border: none;
  background: transparent;
}

.clear-btn {
  font-size: 28px;
  color: #999999;
  padding: 8px;
}

.cancel-btn {
  font-size: 28px;
  color: #666666;
  margin-left: 24px;
}

.search-content {
  height: calc(100vh - 104px);
  padding: 24px;
}

.section-title {
  font-size: 24px;
  color: #999999;
  margin-bottom: 16px;
  display: block;
}

.history-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.clear-all {
  font-size: 24px;
  color: #666666;
}

.history-list {
  display: flex;
  flex-wrap: wrap;
}

.history-tag {
  display: flex;
  align-items: center;
  background-color: #F5F5F5;
  border-radius: 8px;
  padding: 12px 16px;
  margin-right: 16px;
  margin-bottom: 16px;
}

.tag-text {
  font-size: 26px;
  color: #666666;
}

.delete-btn {
  font-size: 22px;
  color: #999999;
  margin-left: 8px;
  padding: 4px;
}

.hot-section {
  margin-bottom: 32px;
}

.hot-list {
  display: flex;
  flex-direction: column;
}

.hot-tag {
  display: flex;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid #E8E8E8;
}

.hot-rank {
  width: 40px;
  font-size: 28px;
  color: #999999;
  font-weight: 600;
}

.hot-text {
  font-size: 28px;
  color: #2D2D2D;
}

.results-section {
  .section-title {
    margin-bottom: 16px;
  }
}

.results-list {
  background-color: #FFFFFF;
  border-radius: 16px;
  overflow: hidden;
}

.result-item {
  padding: 24px;
  border-bottom: 1px solid #E8E8E8;
}

.result-name {
  font-size: 28px;
  color: #2D2D2D;
  margin-bottom: 8px;
  display: block;
}

.result-author {
  font-size: 24px;
  color: #999999;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

.empty-text {
  font-size: 28px;
  color: #999999;
}
</style>
