<!--
  冲突通知组件
  用于在设置页面显示未解决的冲突提示
-->
<template>
  <view v-if="hasConflicts" class="conflict-notification" @click="goToConflictList">
    <view class="notification-content">
      <view class="notification-icon">
        <text class="icon-text">⚠️</text>
      </view>
      <view class="notification-text">
        <text class="notification-title">数据同步冲突</text>
        <text class="notification-desc">{{ conflictDesc }}</text>
      </view>
      <view class="notification-arrow">
        <text class="arrow-text">›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getPendingConflicts, hasPendingConflicts } from '../services/sync/conflict-resolver.ts'

/** 是否有冲突 */
const hasConflicts = ref(false)

/** 冲突数量 */
const conflictCount = ref(0)

/** 冲突描述 */
const conflictDesc = computed(() => {
  if (conflictCount.value === 1) {
    return '有 1 个数据冲突需要解决'
  }
  return `有 ${conflictCount.value} 个数据冲突需要解决`
})

/** 检查冲突 */
const checkConflicts = () => {
  hasConflicts.value = hasPendingConflicts()
  if (hasConflicts.value) {
    conflictCount.value = getPendingConflicts().length
  }
}

/** 跳转到冲突列表 */
const goToConflictList = () => {
  uni.navigateTo({
    url: '/pages/settings/conflicts'
  })
}

/** 定时器 */
let timer: number | null = null

onMounted(() => {
  checkConflicts()
  // 每5秒检查一次
  timer = window.setInterval(checkConflicts, 5000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.conflict-notification {
  margin: 24rpx;
  background: var(--color-warning-light);
  border-radius: var(--radius-lg);
  border: 2rpx solid var(--color-warning);
}

.notification-content {
  display: flex;
  align-items: center;
  padding: 24rpx;
}

.notification-icon {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.icon-text {
  font-size: 32rpx;
}

.notification-text {
  flex: 1;
}

.notification-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 4rpx;
}

.notification-desc {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.notification-arrow {
  width: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow-text {
  font-size: 32rpx;
  color: var(--color-text-tertiary);
}
</style>
