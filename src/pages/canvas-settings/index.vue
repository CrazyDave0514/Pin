<template>
  <view class="canvas-settings-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">画布设置</text>
    </view>

    <!-- 画布尺寸设置 -->
    <view class="settings-section">
      <text class="section-title">画布尺寸</text>
      <view class="size-presets">
        <view
          v-for="preset in sizePresets"
          :key="preset.label"
          :class="['preset-item', selectedPreset === preset.label ? 'active' : '']"
          @click="selectPreset(preset)"
        >
          <text class="preset-label">{{ preset.label }}</text>
          <text class="preset-size">{{ preset.width }}×{{ preset.height }}</text>
        </view>
      </view>

      <!-- 自定义尺寸 -->
      <view class="custom-size">
        <text class="custom-label">自定义尺寸</text>
        <view class="size-inputs">
          <view class="input-group">
            <text class="input-label">宽</text>
            <input
              type="number"
              v-model="customWidth"
              class="size-input"
              placeholder="10-200"
              @input="onCustomSizeChange"
            />
            <text class="input-unit">格</text>
          </view>
          <text class="size-separator">×</text>
          <view class="input-group">
            <text class="input-label">高</text>
            <input
              type="number"
              v-model="customHeight"
              class="size-input"
              placeholder="10-200"
              @input="onCustomSizeChange"
            />
            <text class="input-unit">格</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 画布背景设置 -->
    <view class="settings-section">
      <text class="section-title">画布背景</text>
      <view class="bg-options">
        <view
          v-for="bg in bgOptions"
          :key="bg.value"
          :class="['bg-item', selectedBg === bg.value ? 'active' : '']"
          @click="selectBg(bg.value)"
        >
          <view
            class="bg-preview"
            :style="bg.style"
          ></view>
          <text class="bg-label">{{ bg.label }}</text>
        </view>
      </view>

      <!-- 自定义背景色 -->
      <view v-if="selectedBg === 'custom'" class="custom-bg">
        <view class="color-picker">
          <view
            v-for="color in presetColors"
            :key="color"
            class="color-swatch"
            :style="{ backgroundColor: color }"
            @click="selectCustomColor(color)"
          ></view>
        </view>
        <view class="color-input-row">
          <text class="color-label">自定义</text>
          <input
            type="text"
            v-model="customColor"
            class="color-input"
            placeholder="#FFFFFF"
            @input="onColorInput"
          />
          <view
            class="color-preview"
            :style="{ backgroundColor: isValidColor ? customColor : '#FFFFFF' }"
          ></view>
        </view>
      </view>
    </view>

    <!-- 辅助功能 -->
    <view class="settings-section">
      <text class="section-title">辅助功能</text>
      <view class="toggle-item">
        <text class="toggle-label">显示网格线</text>
        <switch
          :checked="showGrid"
          @change="showGrid = !showGrid"
          color="#F5A623"
        />
      </view>
      <view class="toggle-item">
        <text class="toggle-label">网格线颜色</text>
        <view class="grid-color-picker">
          <view
            v-for="color in gridColors"
            :key="color"
            class="grid-color-swatch"
            :style="{ backgroundColor: color, borderColor: gridColor === color ? '#F5A623' : 'transparent' }"
            @click="gridColor = color"
          ></view>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-actions">
      <button class="btn-create" @click="createCanvas">开始创作</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

// ==================== 状态定义 ====================
// 尺寸预设选项
const sizePresets = [
  { label: '小', width: 20, height: 20 },
  { label: '中', width: 30, height: 30 },
  { label: '大', width: 40, height: 40 },
  { label: '超大', width: 60, height: 60 },
]

// 当前选中的预设
const selectedPreset = ref('中')

// 自定义尺寸
const customWidth = ref(30)
const customHeight = ref(30)

// 背景选项
const bgOptions = [
  { value: 'white', label: '白色', style: { backgroundColor: '#FFFFFF' } },
  { value: 'black', label: '黑色', style: { backgroundColor: '#1A1A1A' } },
  { value: 'gray', label: '灰色', style: { backgroundColor: '#E8E8E8' } },
  { value: 'custom', label: '自定义', style: { background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4)' } },
]

// 当前选中的背景
const selectedBg = ref('white')

// 预设颜色
const presetColors = ['#FFFFFF', '#1A1A1A', '#FF6B6B', '#FF8E53', '#FFCE00', '#96CEB4', '#45B7D1', '#4ECDC4', '#A8E6CF', '#DDA0DD']

// 自定义颜色
const customColor = ref('#FFFFFF')

// 网格线颜色选项
const gridColors = ['#CCCCCC', '#999999', '#666666', '#333333']

// 辅助功能状态
const showGrid = ref(true)
const gridColor = ref('#CCCCCC')
const targetFolderId = ref('')

onLoad((options) => {
  targetFolderId.value = String(options?.folderId || '')
})

// ==================== 方法定义 ====================

/**
 * 选择预设尺寸
 * @param preset - 选中的预设尺寸对象
 */
const selectPreset = (preset: { label: string, width: number, height: number }) => {
  selectedPreset.value = preset.label
  customWidth.value = preset.width
  customHeight.value = preset.height
}

/**
 * 自定义尺寸变化时清除预设选中状态
 */
const onCustomSizeChange = () => {
  selectedPreset.value = ''
  // 限制尺寸范围
  if (customWidth.value < 10) customWidth.value = 10
  if (customWidth.value > 200) customWidth.value = 200
  if (customHeight.value < 10) customHeight.value = 10
  if (customHeight.value > 200) customHeight.value = 200
}

/**
 * 选择背景类型
 * @param bg - 背景值
 */
const selectBg = (bg: string) => {
  selectedBg.value = bg
}

/**
 * 选择预设颜色
 * @param color - 颜色值
 */
const selectCustomColor = (color: string) => {
  customColor.value = color
}

/**
 * 颜色输入变化
 */
const onColorInput = () => {
  // 简单验证hex颜色格式
  if (/^#[0-9A-Fa-f]{6}$/.test(customColor.value)) {
    // 有效颜色
  }
}

/**
 * 验证颜色是否有效
 */
const isValidColor = computed(() => {
  return /^#[0-9A-Fa-f]{6}$/.test(customColor.value)
})

/**
 * 创建画布
 */
const createCanvas = () => {
  // 获取最终使用的背景色
  let bgColor = '#FFFFFF'
  if (selectedBg.value === 'white') bgColor = '#FFFFFF'
  else if (selectedBg.value === 'black') bgColor = '#1A1A1A'
  else if (selectedBg.value === 'gray') bgColor = '#E8E8E8'
  else if (selectedBg.value === 'custom') bgColor = customColor.value

  // 创建画布数据
  const canvasData = {
    width: customWidth.value,
    height: customHeight.value,
    backgroundColor: bgColor,
    showGrid: showGrid.value,
    gridColor: gridColor.value,
    beads: [], // 存储拼豆位置和颜色
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  // 跳转到画布编辑器
  uni.navigateTo({
    url: `/pages/canvas-editor/index?mode=create&folderId=${targetFolderId.value}&data=${encodeURIComponent(JSON.stringify(canvasData))}`
  })
}

</script>

<style scoped>
.canvas-settings-page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
  padding-bottom: 160rpx;
}

/* 页面标题 */
.page-header {
  padding: 32rpx;
  background-color: var(--color-bg-panel);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.page-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

/* 设置区块 */
.settings-section {
  margin-top: 24rpx;
  padding: 32rpx;
  background-color: var(--color-bg-panel);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 24rpx;
  display: block;
}

/* 尺寸预设 */
.size-presets {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 32rpx;
}

.preset-item {
  width: calc(50% - 16rpx);
  padding: 24rpx;
  background-color: var(--color-bg-page);
  border-radius: var(--radius-lg);
  margin-right: 32rpx;
  margin-bottom: 16rpx;
  border: 4rpx solid transparent;
}

.preset-item:nth-child(2n) {
  margin-right: 0;
}

.preset-item.active {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.preset-label {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 8rpx;
}

.preset-size {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

/* 自定义尺寸 */
.custom-size {
  padding-top: 24rpx;
  border-top: 2rpx solid var(--color-border);
}

.custom-label {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  margin-bottom: 16rpx;
  display: block;
}

.size-inputs {
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-group {
  display: flex;
  align-items: center;
  background-color: var(--color-bg-page);
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
}

.input-label {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  margin-right: 12rpx;
}

.size-input {
  width: 100rpx;
  font-size: 28rpx;
  color: var(--color-text-primary);
  text-align: center;
}

.input-unit {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  margin-left: 8rpx;
}

.size-separator {
  font-size: 32rpx;
  color: var(--color-text-tertiary);
  margin: 0 24rpx;
}

/* 背景选项 */
.bg-options {
  display: flex;
  flex-wrap: wrap;
}

.bg-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 32rpx;
  margin-bottom: 24rpx;
}

.bg-preview {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  border: 2rpx solid var(--color-border);
  margin-bottom: 8rpx;
}

.bg-item.active .bg-preview {
  border: 4rpx solid var(--color-primary);
}

.bg-label {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}

/* 自定义背景色 */
.custom-bg {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid var(--color-border);
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 24rpx;
}

.color-swatch {
  width: 56rpx;
  height: 56rpx;
  border-radius: 8rpx;
  margin-right: 16rpx;
  margin-bottom: 16rpx;
  border: 2rpx solid var(--color-border);
}

.color-input-row {
  display: flex;
  align-items: center;
}

.color-label {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  margin-right: 16rpx;
}

.color-input {
  flex: 1;
  height: 64rpx;
  background-color: var(--color-bg-page);
  border-radius: 8rpx;
  padding: 0 16rpx;
  font-size: 26rpx;
  color: var(--color-text-primary);
}

.color-preview {
  width: 64rpx;
  height: 64rpx;
  border-radius: 8rpx;
  border: 2rpx solid var(--color-border);
  margin-left: 16rpx;
}

/* 辅助功能 */
.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 2rpx solid var(--color-divider);
}

.toggle-item:last-child {
  border-bottom: none;
}

.toggle-label {
  font-size: 28rpx;
  color: var(--color-text-primary);
}

.grid-color-picker {
  display: flex;
}

.grid-color-swatch {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
  margin-left: 12rpx;
  border-width: 4rpx;
  border-style: solid;
}

/* 底部按钮 */
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: var(--color-bg-panel);
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.btn-create {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: var(--color-text-inverse);
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-create:active {
  opacity: 0.9;
}
</style>
