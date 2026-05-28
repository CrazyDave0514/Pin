<!--
  冲突列表页面
  用于展示和管理所有数据冲突
-->
<template>
  <view class="conflicts-page">
    <!-- 导航栏 -->
    <view class="page-nav">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="nav-title">数据冲突</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-card">
      <view class="stats-header">
        <text class="stats-title">冲突统计</text>
        <view v-if="stats.pending > 0" class="clear-btn" @click="clearAll">
          <text class="clear-text">全部清除</text>
        </view>
      </view>
      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-value">{{ stats.pending }}</text>
          <text class="stat-label">待解决</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ stats.resolved }}</text>
          <text class="stat-label">已解决</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ stats.total }}</text>
          <text class="stat-label">总计</text>
        </view>
      </view>
    </view>

    <!-- 冲突列表 -->
    <scroll-view class="conflicts-list" scroll-y>
      <view v-if="pendingConflicts.length === 0" class="empty-state">
        <image class="empty-icon" src="/static/assets/v015/icons/empty.png" mode="aspectFit" />
        <text class="empty-title">暂无冲突</text>
        <text class="empty-desc">所有数据已同步完成</text>
      </view>

      <view
        v-for="conflict in pendingConflicts"
        :key="conflict.id"
        class="conflict-item"
        @click="openConflict(conflict)"
      >
        <view class="conflict-header">
          <view class="conflict-type">
            <text class="type-tag">{{ getTypeLabel(conflict.type) }}</text>
          </view>
          <text class="conflict-time">{{ formatTime(conflict.createdAt) }}</text>
        </view>
        <text class="conflict-name">{{ conflict.targetName }}</text>
        <text class="conflict-fields">冲突字段: {{ getFieldsLabel(conflict.conflictFields) }}</text>
        <view class="conflict-actions">
          <text class="action-hint">点击解决冲突 ›</text>
        </view>
      </view>

      <!-- 已解决的冲突 -->
      <view v-if="resolvedConflicts.length > 0" class="resolved-section">
        <text class="section-title">已解决</text>
        <view
          v-for="conflict in resolvedConflicts"
          :key="conflict.id"
          class="conflict-item resolved"
        >
          <view class="conflict-header">
            <view class="conflict-type">
              <text class="type-tag">{{ getTypeLabel(conflict.type) }}</text>
            </view>
            <text class="conflict-time">{{ formatTime(conflict.resolvedAt || conflict.createdAt) }}</text>
          </view>
          <text class="conflict-name">{{ conflict.targetName }}</text>
          <view class="resolve-info">
            <text class="resolve-strategy">解决方式: {{ getStrategyLabel(conflict.resolvedStrategy) }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 冲突解决弹窗 -->
    <ConflictResolver
      :visible="showResolver"
      :conflict="currentConflict"
      @close="closeResolver"
      @resolved="onConflictResolved"
      @ignored="onConflictIgnored"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ConflictResolver from '../../components/ConflictResolver.vue'
import {
  getPendingConflicts,
  getAllConflicts,
  clearAllConflicts,
  type ConflictRecord,
  type ConflictStrategy,
} from '../../services/sync/conflict-resolver.ts'

/** 是否显示解决器 */
const showResolver = ref(false)

/** 当前冲突 */
const currentConflict = ref<ConflictRecord | null>(null)

/** 所有冲突 */
const allConflicts = ref<ConflictRecord[]>([])

/** 待解决的冲突 */
const pendingConflicts = computed(() => {
  return allConflicts.value.filter((c) => !c.resolved)
})

/** 已解决的冲突 */
const resolvedConflicts = computed(() => {
  return allConflicts.value.filter((c) => c.resolved).slice(0, 10)
})

/** 统计信息 */
const stats = computed(() => {
  const total = allConflicts.value.length
  const pending = pendingConflicts.value.length
  const resolved = allConflicts.value.filter((c) => c.resolved).length
  return { total, pending, resolved }
})

/** 类型标签映射 */
const getTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    project: '项目',
    folder: '文件夹',
    artwork: '作品',
    settings: '设置',
  }
  return map[type] || type
}

/** 策略标签映射 */
const getStrategyLabel = (strategy?: ConflictStrategy): string => {
  const map: Record<string, string> = {
    local: '使用本地',
    remote: '使用远程',
    merge: '自动合并',
    manual: '手动编辑',
  }
  return map[strategy || ''] || '未知'
}

/** 字段标签映射 */
const getFieldsLabel = (fields: string[]): string => {
  const map: Record<string, string> = {
    name: '名称',
    description: '描述',
    tags: '标签',
    canvasData: '画布',
    thumbnail: '缩略图',
    folderId: '文件夹',
    isPublic: '公开状态',
    points: '积分',
    bio: '简介',
    avatar: '头像',
  }
  return fields.map((f) => map[f] || f).join('、')
}

/** 格式化时间 */
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/** 加载冲突列表 */
const loadConflicts = () => {
  allConflicts.value = getAllConflicts()
}

/** 打开冲突解决器 */
const openConflict = (conflict: ConflictRecord) => {
  currentConflict.value = conflict
  showResolver.value = true
}

/** 关闭解决器 */
const closeResolver = () => {
  showResolver.value = false
  currentConflict.value = null
}

/** 冲突已解决 */
const onConflictResolved = () => {
  loadConflicts()
  uni.showToast({ title: '冲突已解决', icon: 'success' })
}

/** 冲突被忽略 */
const onConflictIgnored = () => {
  // 可以在这里添加提示
}

/** 清除所有冲突 */
const clearAll = () => {
  uni.showModal({
    title: '确认清除',
    content: '确定要清除所有冲突记录吗？未解决的冲突将使用远程版本。',
    success: (res) => {
      if (res.confirm) {
        clearAllConflicts()
        loadConflicts()
        uni.showToast({ title: '已清除', icon: 'success' })
      }
    },
  })
}

/** 返回 */
const goBack = () => {
  uni.navigateBack()
}

onMounted(() => {
  loadConflicts()
})
</script>

<style scoped>
.conflicts-page {
  min-height: 100vh;
  background: var(--color-bg-page);
}

.page-nav {
  height: 88rpx;
  padding: 0 24rpx;
  background-color: var(--color-bg-panel);
  border-bottom: 1rpx solid var(--color-divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.nav-back,
.nav-placeholder {
  width: 80rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
}

.back-icon {
  font-size: 42rpx;
  color: var(--color-text-primary);
}

.nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 34rpx;
  font-weight: 700;
  color: var(--color-text-primary);
}

/* 统计卡片 */
.stats-card {
  margin: 24rpx;
  background: var(--color-bg-panel);
  border-radius: var(--radius-xl);
  padding: 24rpx;
  box-shadow: var(--shadow-md);
}

.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.stats-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.clear-btn {
  padding: 8rpx 16rpx;
  background: var(--color-error-light);
  border-radius: var(--radius-sm);
}

.clear-text {
  font-size: 24rpx;
  color: var(--color-error);
}

.stats-grid {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 4rpx;
}

.stat-label {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

/* 冲突列表 */
.conflicts-list {
  height: calc(100vh - 200rpx);
  padding: 0 24rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
}

.empty-icon {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 32rpx;
  opacity: 0.6;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.conflict-item {
  background: var(--color-bg-panel);
  border-radius: var(--radius-lg);
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: var(--shadow-sm);
}

.conflict-item.resolved {
  opacity: 0.7;
}

.conflict-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.type-tag {
  font-size: 22rpx;
  color: var(--color-text-inverse);
  background: var(--color-warning);
  padding: 4rpx 12rpx;
  border-radius: var(--radius-sm);
}

.conflict-item.resolved .type-tag {
  background: var(--color-success);
}

.conflict-time {
  font-size: 22rpx;
  color: var(--color-text-tertiary);
}

.conflict-name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 8rpx;
}

.conflict-fields {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-bottom: 16rpx;
}

.conflict-actions {
  display: flex;
  justify-content: flex-end;
}

.action-hint {
  font-size: 24rpx;
  color: var(--color-primary);
}

.resolve-info {
  padding-top: 12rpx;
  border-top: 1rpx solid var(--color-divider);
}

.resolve-strategy {
  font-size: 24rpx;
  color: var(--color-success);
}

/* 已解决区域 */
.resolved-section {
  margin-top: 32rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 16rpx;
  display: block;
}
</style>
