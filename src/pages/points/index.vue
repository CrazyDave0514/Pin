<template>
  <!-- 积分中心页面 -->
  <view class="points-page">
    <!-- 积分卡片 -->
    <view class="points-card">
      <view class="points-header">
        <text class="points-label">我的积分</text>
        <view class="points-value">
          <text class="points-icon">💎</text>
          <text class="points-number">{{ userPoints }}</text>
        </view>
      </view>
      <view class="points-actions">
        <view class="action-btn primary" @click="showExchangeModal = true">
          <text class="btn-text">兑换</text>
        </view>
        <view class="action-btn" @click="showEarnModal = true">
          <text class="btn-text">赚取</text>
        </view>
      </view>
    </view>

    <!-- 积分明细 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">积分明细</text>
        <view class="filter-tabs">
          <view 
            v-for="tab in filterTabs" 
            :key="tab.key"
            :class="['filter-tab', activeFilter === tab.key ? 'active' : '']"
            @click="activeFilter = tab.key"
          >
            <text class="tab-text">{{ tab.label }}</text>
          </view>
        </view>
      </view>

      <view class="records-list">
        <view v-if="filteredRecords.length === 0" class="empty-state">
          <text class="empty-text">暂无记录</text>
        </view>
        <view 
          v-for="record in filteredRecords" 
          :key="record.id"
          class="record-item"
        >
          <view class="record-info">
            <text class="record-title">{{ record.title }}</text>
            <text class="record-time">{{ formatTime(record.time) }}</text>
          </view>
          <text :class="['record-amount', record.amount > 0 ? 'positive' : 'negative']">
            {{ record.amount > 0 ? '+' : '' }}{{ record.amount }}
          </text>
        </view>
      </view>
    </view>

    <!-- 兑换弹窗 -->
    <view v-if="showExchangeModal" class="modal-overlay" @click="showExchangeModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">兑换积分</text>
          <text class="modal-close" @click="showExchangeModal = false">×</text>
        </view>
        <view class="modal-body">
          <text class="modal-desc">兑换功能即将上线，敬请期待！</text>
          <text class="modal-hint">积分可用于解锁高级模板、兑换实物奖品等</text>
        </view>
        <view class="modal-footer">
          <view class="modal-btn" @click="showExchangeModal = false">
            <text class="btn-text">知道了</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 赚取积分弹窗 -->
    <view v-if="showEarnModal" class="modal-overlay" @click="showEarnModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">赚取积分</text>
          <text class="modal-close" @click="showEarnModal = false">×</text>
        </view>
        <view class="modal-body">
          <view class="earn-list">
            <view v-for="task in earnTasks" :key="task.key" class="earn-item">
              <view class="earn-info">
                <text class="earn-title">{{ task.title }}</text>
                <text class="earn-desc">{{ task.desc }}</text>
              </view>
              <view class="earn-reward">
                <text class="reward-text">+{{ task.points }}💎</text>
              </view>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn" @click="showEarnModal = false">
            <text class="btn-text">关闭</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

/** 用户当前积分 */
const userPoints = ref(0)

/** 筛选标签配置 */
const filterTabs = [
  { key: 'all', label: '全部' },
  { key: 'income', label: '收入' },
  { key: 'expense', label: '支出' }
]

/** 当前激活的筛选标签 */
const activeFilter = ref('all')

/** 兑换弹窗显示状态 */
const showExchangeModal = ref(false)

/** 赚取积分弹窗显示状态 */
const showEarnModal = ref(false)

/** 积分记录列表 */
const records = ref<any[]>([])

/** 赚取积分任务列表 */
const earnTasks = [
  { key: 'daily', title: '每日签到', desc: '每天登录即可获得积分', points: 5 },
  { key: 'create', title: '发布作品', desc: '发布公开作品到社区', points: 10 },
  { key: 'share', title: '分享作品', desc: '将作品分享给好友', points: 5 },
  { key: 'like', title: '点赞互动', desc: '给喜欢的作品点赞', points: 1 },
  { key: 'invite', title: '邀请好友', desc: '成功邀请好友注册', points: 50 }
]

/**
 * 根据当前筛选条件过滤积分记录
 */
const filteredRecords = computed(() => {
  if (activeFilter.value === 'all') return records.value
  if (activeFilter.value === 'income') return records.value.filter(r => r.amount > 0)
  return records.value.filter(r => r.amount < 0)
})

/**
 * 加载积分数据
 */
const loadPointsData = () => {
  // 加载用户积分
  userPoints.value = uni.getStorageSync('pin_points') || 0
  
  // 加载积分记录
  const savedRecords = uni.getStorageSync('pin_points_records') || []
  if (savedRecords.length > 0) {
    records.value = savedRecords
  } else {
    // 默认示例数据
    records.value = [
      { id: '1', title: '注册奖励', amount: 100, time: Date.now() - 86400000 * 2 },
      { id: '2', title: '每日签到', amount: 5, time: Date.now() - 86400000 },
      { id: '3', title: '发布作品', amount: 10, time: Date.now() - 3600000 }
    ]
    uni.setStorageSync('pin_points_records', records.value)
  }
}

/**
 * 格式化时间
 * @param timestamp 时间戳
 * @returns 格式化后的时间字符串
 */
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 小于1小时显示"X分钟前"
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return minutes < 1 ? '刚刚' : `${minutes}分钟前`
  }
  // 小于24小时显示"X小时前"
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }
  // 小于7天显示"X天前"
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`
  }
  
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

onMounted(() => {
  loadPointsData()
})
</script>

<style scoped>
.points-page {
  min-height: 100vh;
  background: var(--color-bg-page);
  padding-bottom: 40rpx;
}

/* 积分卡片 */
.points-card {
  background: linear-gradient(135deg, var(--color-text-primary) 0%, rgba(255,255,255,0.15) 100%);
  margin: 24rpx;
  border-radius: var(--radius-xl);
  padding: 40rpx;
  color: var(--color-text-inverse);
  box-shadow: var(--shadow-lg);
}

.points-header {
  margin-bottom: 32rpx;
}

.points-label {
  font-size: 24rpx;
  opacity: 0.8;
  display: block;
  margin-bottom: 8rpx;
}

.points-value {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.points-icon {
  font-size: 48rpx;
}

.points-number {
  font-size: 64rpx;
  font-weight: 600;
}

.points-actions {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  flex: 1;
  height: 72rpx;
  border-radius: 36rpx;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn.primary {
  background: var(--color-primary);
}

.action-btn.primary .btn-text {
  color: var(--color-text-inverse);
  font-weight: 600;
}

.action-btn .btn-text {
  font-size: 28rpx;
  color: var(--color-text-inverse);
}

/* 积分明细 */
.section {
  background: var(--color-bg-panel);
  margin: 0 24rpx;
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.section-header {
  padding: 24rpx;
  border-bottom: 1rpx solid var(--color-divider);
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16rpx;
  display: block;
}

.filter-tabs {
  display: flex;
  gap: 24rpx;
}

.filter-tab {
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  background: var(--color-bg-page);
}

.filter-tab.active {
  background: var(--color-primary);
}

.filter-tab .tab-text {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.filter-tab.active .tab-text {
  color: var(--color-text-inverse);
}

/* 记录列表 */
.records-list {
  padding: 0 24rpx;
}

.empty-state {
  padding: 80rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: var(--color-text-tertiary);
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--color-divider);
}

.record-item:last-child {
  border-bottom: none;
}

.record-info {
  flex: 1;
}

.record-title {
  font-size: 28rpx;
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 8rpx;
}

.record-time {
  font-size: 22rpx;
  color: var(--color-text-tertiary);
}

.record-amount {
  font-size: 32rpx;
  font-weight: 600;
}

.record-amount.positive {
  color: var(--color-success);
}

.record-amount.negative {
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
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid var(--color-divider);
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.modal-close {
  font-size: 40rpx;
  color: var(--color-text-tertiary);
  line-height: 1;
}

.modal-body {
  padding: 40rpx 24rpx;
  text-align: center;
}

.modal-desc {
  font-size: 28rpx;
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 16rpx;
}

.modal-hint {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

/* 赚取列表 */
.earn-list {
  text-align: left;
}

.earn-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--color-divider);
}

.earn-item:last-child {
  border-bottom: none;
}

.earn-title {
  font-size: 28rpx;
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 4rpx;
}

.earn-desc {
  font-size: 22rpx;
  color: var(--color-text-tertiary);
}

.reward-text {
  font-size: 28rpx;
  color: var(--color-success);
  font-weight: 600;
}

.modal-footer {
  padding: 24rpx;
  border-top: 1rpx solid var(--color-divider);
}

.modal-btn {
  height: 80rpx;
  background: var(--color-primary);
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-btn .btn-text {
  font-size: 28rpx;
  color: var(--color-text-inverse);
  font-weight: 600;
}
</style>
