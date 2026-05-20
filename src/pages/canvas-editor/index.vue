<template>
  <view class="canvas-editor-page">
    <!-- 自定义顶部导航 -->
    <view class="editor-nav">
      <view class="nav-left">
        <text class="nav-btn" @click="goBack">取消</text>
      </view>
      <text class="nav-title">画布编辑</text>
      <view class="nav-right">
        <text class="nav-btn primary" @click="saveCanvas">保存</text>
      </view>
    </view>

    <!-- 工具栏 -->
    <view class="toolbar">
      <!-- 工具模式 -->
      <view class="tool-group">
        <view
          v-for="tool in tools"
          :key="tool.id"
          :class="['tool-item', activeTool === tool.id ? 'active' : '']"
          @click="activeTool = tool.id"
        >
          <text class="tool-icon">{{ tool.icon }}</text>
          <text class="tool-label">{{ tool.label }}</text>
        </view>
      </view>

      <view class="tool-divider"></view>

      <!-- 操作按钮 -->
      <view class="tool-group">
        <view class="tool-item" @click="undo">
          <text class="tool-icon">↩️</text>
          <text class="tool-label">撤销</text>
        </view>
        <view class="tool-item" @click="redo">
          <text class="tool-icon">↪️</text>
          <text class="tool-label">重做</text>
        </view>
        <view class="tool-item" @click="clearCanvas">
          <text class="tool-icon">🗑️</text>
          <text class="tool-label">清空</text>
        </view>
      </view>

      <view class="tool-divider"></view>

      <!-- 缩放控制 -->
      <view class="tool-group zoom-group">
        <view class="tool-item" @click="zoomOut">
          <text class="tool-icon">➖</text>
        </view>
        <text class="zoom-value">{{ Math.round(scale * 100) }}%</text>
        <view class="tool-item" @click="zoomIn">
          <text class="tool-icon">➕</text>
        </view>
      </view>
    </view>

    <!-- 画布区域 -->
    <view
      class="canvas-container"
      :style="{ backgroundColor: canvasData.backgroundColor }"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <view
        class="canvas-wrapper"
        :style="{
          width: canvasWidth + 'px',
          height: canvasHeight + 'px',
          transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`,
        }"
      >
        <!-- 网格背景 -->
        <view
          v-if="canvasData.showGrid"
          class="grid-layer"
          :style="{ gridTemplateColumns: `repeat(${canvasData.width}, ${cellSize}px)`, gridTemplateRows: `repeat(${canvasData.height}, ${cellSize}px)` }"
        >
          <view
            v-for="i in canvasData.width * canvasData.height"
            :key="i"
            class="grid-cell"
            :style="{ borderColor: canvasData.gridColor }"
          ></view>
        </view>

        <!-- 拼豆层 -->
        <view class="beads-layer">
          <view
            v-for="(bead, index) in canvasData.beads"
            :key="`bead-${index}`"
            class="bead"
            :style="{
              left: (bead.x * cellSize) + 'px',
              top: (bead.y * cellSize) + 'px',
              width: cellSize + 'px',
              height: cellSize + 'px',
              backgroundColor: bead.color,
            }"
            @click.stop="removeBead(index)"
          ></view>
        </view>

        <!-- 触摸预览 -->
        <view
          v-if="previewBead.visible"
          class="bead preview"
          :style="{
            left: (previewBead.x * cellSize) + 'px',
            top: (previewBead.y * cellSize) + 'px',
            width: cellSize + 'px',
            height: cellSize + 'px',
            backgroundColor: selectedColor,
          }"
        ></view>
      </view>
    </view>

    <!-- 底部颜色选择器 -->
    <view class="color-panel">
      <!-- 当前颜色 -->
      <view class="current-color-section">
        <view class="current-color" :style="{ backgroundColor: selectedColor }">
          <text class="current-color-text" :style="{ color: selectedColorLight ? '#333' : '#FFF' }">
            {{ selectedColor }}
          </text>
        </view>
        <text class="current-color-label">当前颜色</text>
      </view>

      <!-- 常用颜色 -->
      <scroll-view class="color-scroll" scroll-x>
        <view class="color-list">
          <view
            v-for="color in commonColors"
            :key="color"
            class="color-item"
            :style="{ backgroundColor: color }"
            @click="selectColor(color)"
          >
            <view v-if="selectedColor === color" class="color-check">✓</view>
          </view>
          <!-- 更多颜色按钮 -->
          <view class="color-item more-colors" @click="showColorPicker = true">
            <text class="more-colors-text">+</text>
          </view>
        </view>
      </scroll-view>

      <!-- 收藏颜色 -->
      <view class="favorite-colors">
        <text class="favorite-title">收藏</text>
        <view class="favorite-list">
          <view
            v-for="(color, index) in favoriteColors"
            :key="index"
            class="color-item small"
            :style="{ backgroundColor: color }"
            @click="selectColor(color)"
          >
            <view v-if="selectedColor === color" class="color-check">✓</view>
          </view>
          <view v-if="favoriteColors.length === 0" class="no-favorites">
            <text>长按颜色添加收藏</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 颜色选择器弹窗 -->
    <view v-if="showColorPicker" class="color-picker-modal" @click="showColorPicker = false">
      <view class="color-picker-content" @click.stop>
        <text class="picker-title">选择颜色</text>
        <view class="color-grid">
          <view
            v-for="color in allColors"
            :key="color"
            class="color-grid-item"
            :style="{ backgroundColor: color }"
            @click="selectColor(color); showColorPicker = false"
          ></view>
        </view>
        <view class="color-input-section">
          <input
            type="text"
            v-model="customColor"
            class="color-text-input"
            placeholder="输入颜色代码如 #FF5500"
          />
          <view
            class="color-preview"
            :style="{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(customColor) ? customColor : '#FFFFFF' }"
          ></view>
          <button class="btn-confirm" @click="confirmCustomColor">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

// ==================== 常量定义 ====================
// 每个格子的像素大小
const cellSize = 20

// 常用颜色
const commonColors = [
  '#FFFFFF', '#1A1A1A', '#FF0000', '#FF5500', '#FF8C00', '#FFD700', '#FFFF00', '#9ACD32',
  '#00FF00', '#00FA9A', '#00CED1', '#00BFFF', '#1E90FF', '#0000FF', '#8A2BE2', '#FF00FF',
  '#FF1493', '#FFB6C1', '#DDA0DD', '#D2691E', '#8B4513', '#A0522D', '#696969', '#2F4F4F',
]

// 全部颜色（扩展版）
const allColors = [
  ...commonColors,
  '#F5F5DC', '#FFE4C4', '#DEB887', '#D2B48C', '#BC8F8F', '#F4A460', '#CD853F', '#B8860B',
  '#6B8E23', '#556B2F', '#808000', '#6B8E23', '#2E8B57', '#3CB371', '#20B2AA', '#48D1CC',
  '#40E0D0', '#7FFFD4', '#B0E0E6', '#87CEEB', '#87CEFA', '#ADD8E6', '#B0C4DE', '#778899',
]

// 工具选项
const tools = [
  { id: 'draw', label: '绘制', icon: '✏️' },
  { id: 'erase', label: '橡皮', icon: '🧹' },
  { id: 'fill', label: '填充', icon: '🪣' },
]

// ==================== 状态定义 ====================
// 画布数据
const canvasData = reactive({
  width: 30,
  height: 30,
  backgroundColor: '#FFFFFF',
  showGrid: true,
  gridColor: '#CCCCCC',
  beads: [] as Array<{ x: number, y: number, color: string }>,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

// 当前选中的颜色
const selectedColor = ref('#FF0000')

// 是否显示颜色选择器
const showColorPicker = ref(false)

// 自定义颜色输入
const customColor = ref('#FF0000')

// 当前工具
const activeTool = ref('draw')

// 缩放比例
const scale = ref(1)

// 偏移量
const offsetX = ref(0)
const offsetY = ref(0)

// 是否正在触摸
const isTouching = ref(false)

// 预览拼豆
const previewBead = reactive({
  visible: false,
  x: 0,
  y: 0,
})

// 历史记录（用于撤销/重做）
const history = ref<Array<Array<{ x: number, y: number, color: string }>>>([])
const historyIndex = ref(-1)

// 收藏颜色
const favoriteColors = ref<string[]>([])

// ==================== 计算属性 ====================
// 画布总宽度
const canvasWidth = computed(() => canvasData.width * cellSize)

// 画布总高度
const canvasHeight = computed(() => canvasData.height * cellSize)

// 判断颜色是否为浅色
const selectedColorLight = computed(() => {
  const color = selectedColor.value.replace('#', '')
  const r = parseInt(color.substr(0, 2), 16)
  const g = parseInt(color.substr(2, 2), 16)
  const b = parseInt(color.substr(4, 2), 16)
  return (r * 0.299 + g * 0.587 + b * 0.114) > 150
})

// ==================== 生命周期 ====================
onMounted(() => {
  // 从 URL 参数获取画布数据
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.options || {}

  if (options.mode === 'create' && options.data) {
    try {
      const data = JSON.parse(decodeURIComponent(options.data))
      Object.assign(canvasData, data)
    } catch (e) {
      console.error('解析画布数据失败:', e)
    }
  }

  // 加载收藏颜色
  const savedFavorites = uni.getStorageSync('pin_favorite_colors')
  if (savedFavorites) {
    favoriteColors.value = savedFavorites
  }

  // 保存初始状态到历史
  saveHistory()
})

// ==================== 方法定义 ====================

/**
 * 选择颜色
 * @param color - 颜色值
 */
const selectColor = (color: string) => {
  selectedColor.value = color
  activeTool.value = 'draw'
}

/**
 * 确认自定义颜色
 */
const confirmCustomColor = () => {
  if (/^#[0-9A-Fa-f]{6}$/.test(customColor.value)) {
    selectedColor.value = customColor.value
    showColorPicker.value = false
  } else {
    uni.showToast({ title: '请输入正确的颜色代码', icon: 'none' })
  }
}

/**
 * 触摸开始
 */
const onTouchStart = (e: TouchEvent) => {
  isTouching.value = true
  handleTouch(e)
}

/**
 * 触摸移动
 */
const onTouchMove = (e: TouchEvent) => {
  if (isTouching.value) {
    handleTouch(e)
  }
}

/**
 * 触摸结束
 */
const onTouchEnd = (e: TouchEvent) => {
  isTouching.value = false
  previewBead.visible = false
  saveHistory()
}

/**
 * 处理触摸逻辑
 */
const handleTouch = (e: TouchEvent) => {
  const touch = e.touches[0]
  if (!touch) return

  // 获取画布容器的位置信息
  const container = uni.createSelectorQuery().in(getCurrentInstance())
  // 简化处理，直接计算位置
  const rect = (e.target as any)?.getBoundingClientRect?.() || { left: 0, top: 0 }

  // 计算相对于画布的位置（考虑缩放和偏移）
  const canvasContainer = document.querySelector('.canvas-container')
  if (!canvasContainer) return

  const containerRect = canvasContainer.getBoundingClientRect()
  const relativeX = (touch.clientX - containerRect.left) / scale.value - offsetX.value
  const relativeY = (touch.clientY - containerRect.top) / scale.value - offsetY.value

  // 计算格子坐标
  const gridX = Math.floor(relativeX / cellSize)
  const gridY = Math.floor(relativeY / cellSize)

  // 边界检查
  if (gridX < 0 || gridX >= canvasData.width || gridY < 0 || gridY >= canvasData.height) {
    previewBead.visible = false
    return
  }

  // 更新预览位置
  previewBead.x = gridX
  previewBead.y = gridY
  previewBead.visible = true

  // 根据工具执行操作
  if (activeTool.value === 'draw') {
    placeBead(gridX, gridY, selectedColor.value)
  } else if (activeTool.value === 'erase') {
    eraseBead(gridX, gridY)
  } else if (activeTool.value === 'fill') {
    fillArea(gridX, gridY, selectedColor.value)
  }
}

/**
 * 放置拼豆
 * @param x - X坐标
 * @param y - Y坐标
 * @param color - 颜色
 */
const placeBead = (x: number, y: number, color: string) => {
  // 检查是否已有相同位置的拼豆
  const existingIndex = canvasData.beads.findIndex(b => b.x === x && b.y === y)
  if (existingIndex >= 0) {
    // 更新颜色
    canvasData.beads[existingIndex].color = color
  } else {
    // 添加新拼豆
    canvasData.beads.push({ x, y, color })
  }
}

/**
 * 擦除拼豆
 * @param x - X坐标
 * @param y - Y坐标
 */
const eraseBead = (x: number, y: number) => {
  const index = canvasData.beads.findIndex(b => b.x === x && b.y === y)
  if (index >= 0) {
    canvasData.beads.splice(index, 1)
  }
}

/**
 * 填充区域（简单版本，只填充单个格子）
 * @param x - X坐标
 * @param y - Y坐标
 * @param color - 颜色
 */
const fillArea = (x: number, y: number, color: string) => {
  placeBead(x, y, color)
}

/**
 * 移除拼豆
 * @param index - 拼豆索引
 */
const removeBead = (index: number) => {
  canvasData.beads.splice(index, 1)
  saveHistory()
}

/**
 * 保存历史记录
 */
const saveHistory = () => {
  // 复制当前状态
  const snapshot = JSON.parse(JSON.stringify(canvasData.beads))
  // 删除当前位置之后的历史
  history.value = history.value.slice(0, historyIndex.value + 1)
  // 添加新状态
  history.value.push(snapshot)
  historyIndex.value = history.value.length - 1
  // 限制历史记录数量
  if (history.value.length > 50) {
    history.value.shift()
    historyIndex.value--
  }
}

/**
 * 撤销
 */
const undo = () => {
  if (historyIndex.value > 0) {
    historyIndex.value--
    canvasData.beads = JSON.parse(JSON.stringify(history.value[historyIndex.value]))
  }
}

/**
 * 重做
 */
const redo = () => {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    canvasData.beads = JSON.parse(JSON.stringify(history.value[historyIndex.value]))
  }
}

/**
 * 清空画布
 */
const clearCanvas = () => {
  uni.showModal({
    title: '确认清空',
    content: '确定要清空画布吗？此操作不可撤销。',
    confirmColor: '#FF3B30',
    success: (res) => {
      if (res.confirm) {
        canvasData.beads = []
        saveHistory()
      }
    }
  })
}

/**
 * 放大
 */
const zoomIn = () => {
  if (scale.value < 3) {
    scale.value = Math.min(3, scale.value + 0.25)
  }
}

/**
 * 缩小
 */
const zoomOut = () => {
  if (scale.value > 0.5) {
    scale.value = Math.max(0.5, scale.value - 0.25)
  }
}

/**
 * 返回
 */
const goBack = () => {
  if (canvasData.beads.length > 0) {
    uni.showModal({
      title: '确认离开',
      content: '画布有未保存的内容，确定要离开吗？',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          uni.navigateBack()
        }
      }
    })
  } else {
    uni.navigateBack()
  }
}

/**
 * 保存画布
 */
const saveCanvas = () => {
  // 显示保存对话框
  uni.showModal({
    title: '保存画布',
    content: '请输入画布名称',
    editable: true,
    placeholderText: '我的拼豆作品',
    success: async (res) => {
      if (res.confirm && res.content) {
        const projectName = res.content || '未命名作品'

        // 构建项目数据
        const projectData = {
          id: 'project_' + Date.now(),
          name: projectName,
          canvasData: {
            ...canvasData,
            updatedAt: Date.now(),
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          thumbnail: '', // 可以后续生成缩略图
        }

        // 保存到本地存储
        const projects = uni.getStorageSync('pin_projects') || []
        projects.unshift(projectData)
        uni.setStorageSync('pin_projects', projects)

        uni.showToast({ title: '保存成功', icon: 'success' })

        // 延迟返回项目列表并刷新
        setTimeout(() => {
          // 返回到项目页面
          uni.switchTab({
            url: '/pages/project/index',
            success: () => {
              // 通知项目页面刷新
              uni.$emit('projectSaved')
            }
          })
        }, 1000)
      }
    }
  })
}

// 获取当前组件实例（用于 uni.createSelectorQuery）
import { getCurrentInstance } from 'vue'
</script>

<style scoped>
.canvas-editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #F5F5F5;
  overflow: hidden;
}

/* 顶部导航 */
.editor-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background-color: #FFFFFF;
  border-bottom: 2rpx solid #E8E8E8;
  flex-shrink: 0;
}

.nav-left, .nav-right {
  width: 120rpx;
}

.nav-btn {
  font-size: 28rpx;
  color: #666666;
}

.nav-btn.primary {
  color: #007AFF;
  font-weight: 600;
  text-align: right;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2D2D2D;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background-color: #FFFFFF;
  border-bottom: 2rpx solid #E8E8E8;
  flex-shrink: 0;
  overflow-x: auto;
}

.tool-group {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
  min-width: 80rpx;
}

.tool-item.active {
  background-color: #F0F7FF;
}

.tool-icon {
  font-size: 32rpx;
  margin-bottom: 4rpx;
}

.tool-label {
  font-size: 20rpx;
  color: #666666;
}

.tool-divider {
  width: 2rpx;
  height: 48rpx;
  background-color: #E8E8E8;
  margin: 0 16rpx;
  flex-shrink: 0;
}

.zoom-group {
  gap: 8rpx;
}

.zoom-value {
  font-size: 24rpx;
  color: #666666;
  min-width: 80rpx;
  text-align: center;
}

/* 画布容器 */
.canvas-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.canvas-wrapper {
  position: relative;
  transform-origin: center center;
}

/* 网格层 */
.grid-layer {
  position: absolute;
  top: 0;
  left: 0;
  display: grid;
  pointer-events: none;
}

.grid-cell {
  border: 1rpx solid;
  box-sizing: border-box;
}

/* 拼豆层 */
.beads-layer {
  position: absolute;
  top: 0;
  left: 0;
}

.bead {
  position: absolute;
  border-radius: 4rpx;
  box-shadow: inset 0 -4rpx 0 rgba(0, 0, 0, 0.2),
              inset 0 4rpx 0 rgba(255, 255, 255, 0.3);
  transition: transform 0.1s;
}

.bead:active {
  transform: scale(0.9);
}

.bead.preview {
  opacity: 0.6;
  pointer-events: none;
}

/* 底部颜色面板 */
.color-panel {
  background-color: #FFFFFF;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 2rpx solid #E8E8E8;
  flex-shrink: 0;
}

.current-color-section {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.current-color {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  border: 2rpx solid #E8E8E8;
  margin-right: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.current-color-text {
  font-size: 16rpx;
  font-weight: 600;
}

.current-color-label {
  font-size: 24rpx;
  color: #666666;
}

.color-scroll {
  white-space: nowrap;
  margin-bottom: 16rpx;
}

.color-list {
  display: flex;
  padding: 8rpx 0;
}

.color-item {
  width: 56rpx;
  height: 56rpx;
  border-radius: 8rpx;
  margin-right: 12rpx;
  border: 2rpx solid #E8E8E8;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.color-item.small {
  width: 40rpx;
  height: 40rpx;
}

.color-item:active {
  transform: scale(0.95);
}

.color-check {
  font-size: 20rpx;
  font-weight: bold;
  color: #007AFF;
}

.more-colors {
  background: linear-gradient(135deg, #F0F0F0, #E8E8E8);
}

.more-colors-text {
  font-size: 28rpx;
  color: #666666;
  font-weight: 600;
}

.favorite-colors {
  display: flex;
  align-items: center;
}

.favorite-title {
  font-size: 22rpx;
  color: #999999;
  margin-right: 12rpx;
  flex-shrink: 0;
}

.favorite-list {
  display: flex;
  align-items: center;
}

.no-favorites {
  font-size: 20rpx;
  color: #CCCCCC;
}

/* 颜色选择器弹窗 */
.color-picker-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.color-picker-content {
  background-color: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx;
  width: 100%;
  max-height: 70vh;
}

.picker-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2D2D2D;
  display: block;
  margin-bottom: 24rpx;
  text-align: center;
}

.color-grid {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 24rpx;
}

.color-grid-item {
  width: 64rpx;
  height: 64rpx;
  border-radius: 8rpx;
  margin: 8rpx;
  border: 2rpx solid #E8E8E8;
}

.color-grid-item:active {
  transform: scale(0.9);
}

.color-input-section {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.color-text-input {
  flex: 1;
  height: 64rpx;
  background-color: #F5F5F5;
  border-radius: 8rpx;
  padding: 0 16rpx;
  font-size: 26rpx;
}

.color-preview {
  width: 64rpx;
  height: 64rpx;
  border-radius: 8rpx;
  border: 2rpx solid #E8E8E8;
  flex-shrink: 0;
}

.btn-confirm {
  width: 120rpx;
  height: 64rpx;
  background-color: #007AFF;
  color: #FFFFFF;
  font-size: 26rpx;
  border-radius: 8rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
