<template>
  <view class="create-page">
    <!-- 功能入口网格 -->
    <view class="function-grid">
      <view
        v-for="(entry, index) in functionEntries"
        :key="index"
        class="function-card"
        @click="handleEntryClick(entry.path)"
      >
        <text class="function-icon">{{ entry.icon }}</text>
        <text class="function-name">{{ entry.name }}</text>
      </view>
    </view>

    <!-- 项目管理模块 -->
    <view class="project-module" @click="handleEntryClick('/pages/projects/index')">
      <text class="project-icon">📁</text>
      <view class="project-info">
        <text class="project-title">项目管理</text>
        <text class="project-desc">管理你的创作项目</text>
      </view>
      <text class="project-arrow">→</text>
    </view>
  </view>
</template>

<script setup lang="ts">
const functionEntries = [
  { icon: '🎨', name: '创建画布', path: '/pages/canvas/index' },
  { icon: '🖼️', name: '导入图片', path: '/pages/import-image/index' },
  { icon: '📄', name: '导入图纸', path: '/pages/import-pattern/index' },
  { icon: '🫘', name: '豆仓管理', path: '/pages/bead-inventory/index' },
]

const handleEntryClick = (path: string) => {
  uni.navigateTo({ url: path })
}
</script>

<style scoped>
.create-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding: 16px;
}

.function-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.function-card {
  width: calc(50% - 6px);
  height: 140px;
  background-color: #FFFFFF;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.function-card:active {
  transform: scale(0.98);
}

.function-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.function-name {
  font-size: 14px;
  color: #2D2D2D;
  font-weight: 500;
}

.project-module {
  display: flex;
  align-items: center;
  background-color: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.project-icon {
  font-size: 28px;
  margin-right: 12px;
}

.project-info {
  flex: 1;
}

.project-title {
  display: block;
  font-size: 15px;
  color: #2D2D2D;
  font-weight: 500;
  margin-bottom: 4px;
}

.project-desc {
  display: block;
  font-size: 12px;
  color: #999999;
}

.project-arrow {
  font-size: 16px;
  color: #CCCCCC;
}
</style>
