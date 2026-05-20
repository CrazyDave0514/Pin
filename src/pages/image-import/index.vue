<template>
  <view class="image-import-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">导入图片</text>
      <text class="page-subtitle">选择图片并转换为拼豆图纸</text>
    </view>

    <!-- 图片选择区域 -->
    <view class="upload-section">
      <!-- 已选择图片 -->
      <view v-if="selectedImage" class="preview-container">
        <image
          :src="selectedImage"
          mode="aspectFit"
          class="preview-image"
        ></image>
        <view class="preview-overlay">
          <text class="change-btn" @click="chooseImage">更换图片</text>
          <text class="remove-btn" @click="removeImage">删除</text>
        </view>
      </view>

      <!-- 上传提示 -->
      <view v-else class="upload-area" @click="chooseImage">
        <view class="upload-icon">
          <text class="icon-text">📷</text>
        </view>
        <text class="upload-text">点击选择图片</text>
        <text class="upload-hint">支持 JPG、PNG 格式</text>
      </view>
    </view>

    <!-- 图片处理设置 -->
    <view v-if="selectedImage" class="settings-section">
      <text class="section-title">图纸设置</text>

      <!-- 输出尺寸 -->
      <view class="setting-item">
        <text class="setting-label">输出尺寸（拼豆格子数）</text>
        <view class="size-inputs">
          <view class="input-group">
            <text class="input-label">宽</text>
            <input
              type="number"
              v-model="outputWidth"
              class="size-input"
              @input="onSizeChange"
            />
            <text class="input-unit">格</text>
          </view>
          <text class="size-separator">×</text>
          <view class="input-group">
            <text class="input-label">高</text>
            <input
              type="number"
              v-model="outputHeight"
              class="size-input"
              @input="onSizeChange"
            />
            <text class="input-unit">格</text>
          </view>
        </view>
        <view class="size-presets">
          <text
            v-for="size in sizePresets"
            :key="size.label"
            :class="['preset-btn', activePreset === size.label ? 'active' : '']"
            @click="applyPreset(size)"
          >
            {{ size.label }}
          </text>
        </view>
      </view>

      <!-- 颜色数量 -->
      <view class="setting-item">
        <text class="setting-label">最大颜色数量</text>
        <view class="color-limit-options">
          <text
            v-for="limit in colorLimits"
            :key="limit"
            :class="['limit-btn', colorLimit === limit ? 'active' : '']"
            @click="colorLimit = limit"
          >
            {{ limit }}色
          </text>
        </view>
      </view>

      <!-- 颜色映射预览 -->
      <view class="setting-item">
        <text class="setting-label">检测到的颜色</text>
        <view class="detected-colors">
          <view
            v-for="(color, index) in detectedColors"
            :key="index"
            class="detected-color-item"
          >
            <view
              class="color-swatch"
              :style="{ backgroundColor: color }"
            ></view>
            <text class="color-value">{{ color }}</text>
          </view>
          <view v-if="detectedColors.length === 0" class="no-colors">
            <text>点击"生成图纸"分析颜色</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="bottom-actions">
      <button
        class="btn-generate"
        :disabled="!selectedImage || isProcessing"
        @click="generateBlueprint"
      >
        <text v-if="isProcessing">分析中...</text>
        <text v-else>生成图纸</text>
      </button>
    </view>

    <!-- 生成结果预览 -->
    <view v-if="generatedBlueprint" class="result-section">
      <text class="section-title">生成结果</text>
      <view class="result-preview">
        <canvas
          canvas-id="blueprintCanvas"
          id="blueprintCanvas"
          class="blueprint-canvas"
          :style="{ width: canvasPreviewSize.width + 'px', height: canvasPreviewSize.height + 'px' }"
        ></canvas>
      </view>
      <view class="result-stats">
        <text class="stat-item">总格子数：{{ totalCells }}</text>
        <text class="stat-item">使用颜色：{{ detectedColors.length }}</text>
      </view>
      <button class="btn-start-creation" @click="startCreation">
        开始创作
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

// ==================== 常量定义 ====================
// 尺寸预设
const sizePresets = [
  { label: '小(20x20)', width: 20, height: 20 },
  { label: '中(30x30)', width: 30, height: 30 },
  { label: '大(40x40)', width: 40, height: 40 },
]

// 颜色数量限制
const colorLimits = [8, 16, 24, 32]

// 拼豆可用颜色池（简化版，实际可扩展）
const beadColorPool = [
  '#FFFFFF', '#1A1A1A', '#FF0000', '#FF4500', '#FF6347', '#FF8C00', '#FFA500', '#FFD700',
  '#FFFF00', '#9ACD32', '#32CD32', '#00FF00', '#00FA9A', '#00CED1', '#00BFFF', '#1E90FF',
  '#0000FF', '#4169E1', '#8A2BE2', '#FF00FF', '#FF1493', '#FF69B4', '#FFC0CB', '#DDA0DD',
  '#9370DB', '#8B4513', '#A0522D', '#D2691E', '#CD853F', '#F5DEB3', '#DEB887', '#D2B48C',
]

// ==================== 状态定义 ====================
// 选中的图片
const selectedImage = ref('')

// 输出尺寸
const outputWidth = ref(30)
const outputHeight = ref(30)
const activePreset = ref('中(30x30)')

// 颜色限制
const colorLimit = ref(16)

// 检测到的颜色
const detectedColors = ref<string[]>([])

// 是否正在处理
const isProcessing = ref(false)

// 生成的图纸数据
const generatedBlueprint = ref<any>(null)

// ==================== 计算属性 ====================
// 总格子数
const totalCells = computed(() => outputWidth.value * outputHeight.value)

// 画布预览尺寸（限制最大200px）
const canvasPreviewSize = computed(() => {
  const maxSize = 200
  const ratio = outputWidth.value / outputHeight.value
  if (ratio > 1) {
    return { width: maxSize, height: Math.round(maxSize / ratio) }
  } else {
    return { width: Math.round(maxSize * ratio), height: maxSize }
  }
})

// ==================== 方法定义 ====================

/**
 * 选择图片
 */
const chooseImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      selectedImage.value = res.tempFilePaths[0]
      // 清空之前的结果
      generatedBlueprint.value = null
      detectedColors.value = []
    }
  })
}

/**
 * 移除图片
 */
const removeImage = () => {
  selectedImage.value = ''
  generatedBlueprint.value = null
  detectedColors.value = []
}

/**
 * 应用预设尺寸
 * @param size - 预设尺寸
 */
const applyPreset = (size: { label: string, width: number, height: number }) => {
  activePreset.value = size.label
  outputWidth.value = size.width
  outputHeight.value = size.height
}

/**
 * 尺寸变化时清除预设选中
 */
const onSizeChange = () => {
  activePreset.value = ''
  // 限制尺寸范围
  if (outputWidth.value < 5) outputWidth.value = 5
  if (outputWidth.value > 100) outputWidth.value = 100
  if (outputHeight.value < 5) outputHeight.value = 5
  if (outputHeight.value > 100) outputHeight.value = 100
}

/**
 * 生成图纸
 */
const generateBlueprint = async () => {
  if (!selectedImage.value) return

  isProcessing.value = true
  uni.showLoading({ title: '分析图片中...' })

  try {
    // 获取图片信息
    const imageInfo = await getImageInfo(selectedImage.value)

    // 模拟颜色分析（实际需要 canvas 和 imageData）
    // 这里简化处理，随机生成一些颜色作为演示
    const mockColors = generateMockColors(colorLimit.value)
    detectedColors.value = mockColors

    // 生成图纸数据
    const blueprintData = {
      width: outputWidth.value,
      height: outputHeight.value,
      colors: mockColors,
      pixelData: generateMockPixelData(outputWidth.value, outputHeight.value, mockColors),
      backgroundColor: '#FFFFFF',
      showGrid: true,
      gridColor: '#CCCCCC',
      beads: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    generatedBlueprint.value = blueprintData

    // 绘制预览
    drawPreview(mockColors)

    uni.hideLoading()
    uni.showToast({ title: '生成成功', icon: 'success' })
  } catch (error) {
    console.error('生成图纸失败:', error)
    uni.hideLoading()
    uni.showToast({ title: '生成失败，请重试', icon: 'none' })
  } finally {
    isProcessing.value = false
  }
}

/**
 * 获取图片信息
 * @param path - 图片路径
 */
const getImageInfo = (path: string): Promise<{ width: number, height: number }> => {
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src: path,
      success: (res) => resolve({ width: res.width, height: res.height }),
      fail: reject
    })
  })
}

/**
 * 生成模拟颜色（实际需要图片分析）
 * @param count - 颜色数量
 */
const generateMockColors = (count: number): string[] => {
  const colors: string[] = []
  const used = new Set<string>()

  // 先添加黑白
  colors.push('#FFFFFF')
  colors.push('#1A1A1A')
  used.add('#FFFFFF')
  used.add('#1A1A1A')

  // 随机选择颜色
  while (colors.length < count && colors.length < beadColorPool.length) {
    const randomIndex = Math.floor(Math.random() * beadColorPool.length)
    const color = beadColorPool[randomIndex]
    if (!used.has(color)) {
      colors.push(color)
      used.add(color)
    }
  }

  return colors
}

/**
 * 生成模拟像素数据（实际需要图片分析）
 * @param width - 宽度
 * @param height - 高度
 * @param colors - 颜色列表
 */
const generateMockPixelData = (width: number, height: number, colors: string[]): string[][] => {
  const data: string[][] = []
  for (let y = 0; y < height; y++) {
    const row: string[] = []
    for (let x = 0; x < width; x++) {
      // 随机分配颜色
      const colorIndex = Math.floor(Math.random() * colors.length)
      row.push(colors[colorIndex])
    }
    data.push(row)
  }
  return data
}

/**
 * 绘制预览
 * @param colors - 颜色列表
 */
const drawPreview = (colors: string[]) => {
  // 在实际实现中，这里需要使用 canvas 来绘制预览
  // uni-app 中使用 canvas 组件
}

/**
 * 开始创作
 */
const startCreation = () => {
  if (!generatedBlueprint.value) return

  // 将检测到的颜色和图纸数据传递到画布编辑器
  uni.navigateTo({
    url: `/pages/canvas-editor/index?mode=blueprint&data=${encodeURIComponent(
      JSON.stringify(generatedBlueprint.value)
    )}`
  })
}
</script>

<style scoped>
.image-import-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 160rpx;
}

/* 页面标题 */
.page-header {
  padding: 32rpx;
  background-color: #FFFFFF;
  margin-bottom: 24rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2D2D2D;
  display: block;
}

.page-subtitle {
  font-size: 26rpx;
  color: #999999;
  margin-top: 8rpx;
}

/* 上传区域 */
.upload-section {
  padding: 0 32rpx;
  margin-bottom: 24rpx;
}

.upload-area {
  height: 400rpx;
  background-color: #FFFFFF;
  border-radius: 24rpx;
  border: 4rpx dashed #E8E8E8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  width: 120rpx;
  height: 120rpx;
  background-color: #F5F5F5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.icon-text {
  font-size: 64rpx;
}

.upload-text {
  font-size: 32rpx;
  color: #2D2D2D;
  margin-bottom: 8rpx;
}

.upload-hint {
  font-size: 24rpx;
  color: #999999;
}

/* 预览区域 */
.preview-container {
  position: relative;
  background-color: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  max-height: 500rpx;
}

.preview-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
  display: flex;
  justify-content: flex-end;
  gap: 24rpx;
}

.change-btn, .remove-btn {
  font-size: 26rpx;
  color: #FFFFFF;
  padding: 8rpx 24rpx;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 32rpx;
}

/* 设置区块 */
.settings-section {
  padding: 32rpx;
  background-color: #FFFFFF;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2D2D2D;
  margin-bottom: 24rpx;
  display: block;
}

.setting-item {
  margin-bottom: 32rpx;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-label {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 16rpx;
  display: block;
}

/* 尺寸输入 */
.size-inputs {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.input-group {
  display: flex;
  align-items: center;
  background-color: #F5F5F5;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
}

.input-label {
  font-size: 26rpx;
  color: #666666;
  margin-right: 12rpx;
}

.size-input {
  width: 80rpx;
  font-size: 28rpx;
  color: #2D2D2D;
  text-align: center;
}

.input-unit {
  font-size: 24rpx;
  color: #999999;
  margin-left: 8rpx;
}

.size-separator {
  font-size: 32rpx;
  color: #999999;
  margin: 0 24rpx;
}

/* 尺寸预设按钮 */
.size-presets {
  display: flex;
  justify-content: center;
  gap: 16rpx;
}

.preset-btn {
  padding: 12rpx 24rpx;
  background-color: #F5F5F5;
  border-radius: 32rpx;
  font-size: 24rpx;
  color: #666666;
}

.preset-btn.active {
  background-color: #F0F7FF;
  color: #007AFF;
}

/* 颜色限制选项 */
.color-limit-options {
  display: flex;
  gap: 16rpx;
}

.limit-btn {
  padding: 12rpx 32rpx;
  background-color: #F5F5F5;
  border-radius: 32rpx;
  font-size: 24rpx;
  color: #666666;
}

.limit-btn.active {
  background-color: #F0F7FF;
  color: #007AFF;
}

/* 检测到的颜色 */
.detected-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.detected-color-item {
  display: flex;
  align-items: center;
  background-color: #F5F5F5;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.color-swatch {
  width: 32rpx;
  height: 32rpx;
  border-radius: 6rpx;
  margin-right: 12rpx;
  border: 1rpx solid #E8E8E8;
}

.color-value {
  font-size: 22rpx;
  color: #666666;
  font-family: monospace;
}

.no-colors {
  font-size: 24rpx;
  color: #CCCCCC;
}

/* 底部按钮 */
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: #FFFFFF;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.btn-generate {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #007AFF, #0056CC);
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
}

.btn-generate[disabled] {
  background: #CCCCCC;
}

/* 生成结果 */
.result-section {
  padding: 32rpx;
  background-color: #FFFFFF;
  margin-top: 24rpx;
}

.result-preview {
  display: flex;
  justify-content: center;
  margin-bottom: 24rpx;
  background-color: #F5F5F5;
  padding: 24rpx;
  border-radius: 16rpx;
}

.blueprint-canvas {
  background-color: #FFFFFF;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 32rpx;
  margin-bottom: 24rpx;
}

.stat-item {
  font-size: 26rpx;
  color: #666666;
}

.btn-start-creation {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #34C759, #28A745);
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
}
</style>
