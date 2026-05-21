<template>
  <view class="canvas-editor-page">
    <!-- 自定义顶部导航 -->
    <view class="editor-nav">
      <view class="nav-left">
        <text class="nav-btn" @click="goBack">取消</text>
      </view>
      <text class="nav-title">{{ isEditMode ? '编辑画布' : '画布编辑' }}</text>
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

      <!-- 顶部工具按钮：定位 + 网格 -->
      <view class="tool-group">
        <view class="tool-item" @click="resetView">
          <text class="tool-icon">🎯</text>
          <text class="tool-label">定位</text>
        </view>
        <view
          :class="['tool-item', canvasData.showGrid ? 'active' : '']"
          @click="toggleGrid"
        >
          <text class="tool-icon">{{ canvasData.showGrid ? '📐' : '📐' }}</text>
          <text class="tool-label">网格</text>
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
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
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
import { ref, reactive, computed, onMounted, getCurrentInstance } from 'vue'

// ==================== 类型定义 ====================

/** 拼豆数据结构 */
interface Bead {
  x: number
  y: number
  color: string
}

/** 画布数据结构 */
interface CanvasData {
  width: number
  height: number
  backgroundColor: string
  showGrid: boolean
  gridColor: string
  beads: Bead[]
  createdAt: number
  updatedAt: number
}

/** 项目数据结构 */
interface ProjectData {
  id: string
  name: string
  canvasData: CanvasData
  createdAt: number
  updatedAt: number
  thumbnail: string
}

/** 工具定义结构 */
interface ToolItem {
  id: string
  label: string
  icon: string
}

// ==================== 常量定义 ====================

/** 每个格子的像素大小 */
const cellSize = 20

/** 常用颜色列表 */
const commonColors = [
  '#FFFFFF', '#1A1A1A', '#FF0000', '#FF5500', '#FF8C00', '#FFD700', '#FFFF00', '#9ACD32',
  '#00FF00', '#00FA9A', '#00CED1', '#00BFFF', '#1E90FF', '#0000FF', '#8A2BE2', '#FF00FF',
  '#FF1493', '#FFB6C1', '#DDA0DD', '#D2691E', '#8B4513', '#A0522D', '#696969', '#2F4F4F',
]

/** 全部颜色列表（扩展版） */
const allColors = [
  ...commonColors,
  '#F5F5DC', '#FFE4C4', '#DEB887', '#D2B48C', '#BC8F8F', '#F4A460', '#CD853F', '#B8860B',
  '#6B8E23', '#556B2F', '#808000', '#6B8E23', '#2E8B57', '#3CB371', '#20B2AA', '#48D1CC',
  '#40E0D0', '#7FFFD4', '#B0E0E6', '#87CEEB', '#87CEFA', '#ADD8E6', '#B0C4DE', '#778899',
]

/** 工具选项列表 */
const tools: ToolItem[] = [
  { id: 'draw', label: '绘制', icon: '✏️' },
  { id: 'erase', label: '橡皮', icon: '🧹' },
  { id: 'fill', label: '填充', icon: '🪣' },
  { id: 'pan', label: '拖动', icon: '✋' },
  { id: 'picker', label: '取色', icon: '💉' },
]

/** 缩放范围限制 */
const SCALE_MIN = 0.25
const SCALE_MAX = 5
const SCALE_STEP = 0.25

// ==================== 状态定义 ====================

/** 画布数据 */
const canvasData = reactive<CanvasData>({
  width: 30,
  height: 30,
  backgroundColor: '#FFFFFF',
  showGrid: true,
  gridColor: '#CCCCCC',
  beads: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

/** 当前选中的颜色 */
const selectedColor = ref('#FF0000')

/** 是否显示颜色选择器 */
const showColorPicker = ref(false)

/** 自定义颜色输入 */
const customColor = ref('#FF0000')

/** 当前工具 */
const activeTool = ref('draw')

/** 缩放比例 */
const scale = ref(1)

/** 画布偏移量（像素） */
const offsetX = ref(0)
const offsetY = ref(0)

/** 是否正在触摸 */
const isTouching = ref(false)

/** 是否正在拖动画布 */
const isPanning = ref(false)

/** 拖动起始位置 */
const panStartX = ref(0)
const panStartY = ref(0)
const panStartOffsetX = ref(0)
const panStartOffsetY = ref(0)

/** 双指缩放状态 */
const pinchStartDistance = ref(0)
const pinchStartScale = ref(1)

/** 预览拼豆 */
const previewBead = reactive({
  visible: false,
  x: 0,
  y: 0,
})

/** 历史记录（用于撤销/重做） */
const history = ref<Bead[][]>([])
const historyIndex = ref(-1)

/** 收藏颜色 */
const favoriteColors = ref<string[]>([])

/** 编辑模式标志：是否为编辑已有项目 */
const isEditMode = ref(false)

/** 编辑中的项目 ID */
const editingProjectId = ref('')

/** 编辑中的项目名称 */
const editingProjectName = ref('')

/** requestAnimationFrame 节流标记 */
let rafId: number | null = null

/** 画布容器的位置缓存 */
let containerRectCache: { left: number; top: number } | null = null

/** 组件实例 */
const instance = getCurrentInstance()

// ==================== 计算属性 ====================

/** 画布总宽度（像素） */
const canvasWidth = computed(() => canvasData.width * cellSize)

/** 画布总高度（像素） */
const canvasHeight = computed(() => canvasData.height * cellSize)

/** 判断当前选中颜色是否为浅色 */
const selectedColorLight = computed(() => {
  const color = selectedColor.value.replace('#', '')
  const r = parseInt(color.substr(0, 2), 16)
  const g = parseInt(color.substr(2, 2), 16)
  const b = parseInt(color.substr(4, 2), 16)
  return (r * 0.299 + g * 0.587 + b * 0.114) > 150
})

// ==================== 生命周期 ====================

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.options || {}

  if (options.mode === 'edit' && options.projectId) {
    /** 编辑已有项目：从本地存储加载 */
    loadProject(options.projectId)
  } else if (options.mode === 'create' && options.data) {
    /** 新建项目：从 URL 参数解析画布数据 */
    try {
      const data = JSON.parse(decodeURIComponent(options.data))
      Object.assign(canvasData, data)
    } catch (e) {
      console.error('解析画布数据失败:', e)
    }
  }

  /** 加载收藏颜色 */
  const savedFavorites = uni.getStorageSync('pin_favorite_colors')
  if (savedFavorites) {
    favoriteColors.value = savedFavorites
  }

  /** 保存初始状态到历史 */
  saveHistory()
})

// ==================== 项目加载 ====================

/**
 * 从本地存储加载已有项目
 * @param projectId - 项目 ID
 */
const loadProject = (projectId: string) => {
  const projects: ProjectData[] = uni.getStorageSync('pin_projects') || []
  const project = projects.find((p) => p.id === projectId)

  if (project) {
    isEditMode.value = true
    editingProjectId.value = project.id
    editingProjectName.value = project.name

    /** 深拷贝画布数据，避免引用污染 */
    const clonedData = JSON.parse(JSON.stringify(project.canvasData)) as CanvasData
    Object.assign(canvasData, clonedData)
  } else {
    uni.showToast({ title: '项目不存在', icon: 'none' })
  }
}

// ==================== 颜色选择 ====================

/**
 * 选择颜色并切换到绘制工具
 * @param color - 颜色值
 */
const selectColor = (color: string) => {
  selectedColor.value = color
  activeTool.value = 'draw'
}

/**
 * 确认自定义颜色输入
 */
const confirmCustomColor = () => {
  if (/^#[0-9A-Fa-f]{6}$/.test(customColor.value)) {
    selectedColor.value = customColor.value
    showColorPicker.value = false
  } else {
    uni.showToast({ title: '请输入正确的颜色代码', icon: 'none' })
  }
}

// ==================== 触摸处理 ====================

/**
 * 计算两指之间的距离
 * @param touch1 - 第一个触摸点
 * @param touch2 - 第二个触摸点
 * @returns 两指之间的欧几里得距离
 */
const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
  const dx = touch1.clientX - touch2.clientX
  const dy = touch1.clientY - touch2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 触摸开始事件处理
 * - 双指触摸：初始化缩放
 * - 单指触摸：根据工具类型执行对应操作
 * @param e - 触摸事件
 */
const onTouchStart = (e: TouchEvent) => {
  const touches = e.touches

  /** 双指触摸：进入缩放模式 */
  if (touches.length === 2) {
    pinchStartDistance.value = getTouchDistance(touches[0], touches[1])
    pinchStartScale.value = scale.value
    isPanning.value = false
    isTouching.value = false
    previewBead.visible = false
    return
  }

  isTouching.value = true

  /** 拖动工具：记录起始位置 */
  if (activeTool.value === 'pan') {
    isPanning.value = true
    panStartX.value = touches[0].clientX
    panStartY.value = touches[0].clientY
    panStartOffsetX.value = offsetX.value
    panStartOffsetY.value = offsetY.value
    return
  }

  /** 填充工具：仅在 touchstart 时触发一次 */
  if (activeTool.value === 'fill') {
    handleTouch(e)
    return
  }

  /** 绘制/橡皮/取色工具：正常处理 */
  handleTouch(e)
}

/**
 * 触摸移动事件处理（已通过 @touchmove.prevent 阻止默认滚动）
 * - 双指移动：处理缩放
 * - 拖动工具：平移画布
 * - 其他工具：使用 rAF 节流处理
 * @param e - 触摸事件
 */
const onTouchMove = (e: TouchEvent) => {
  const touches = e.touches

  /** 双指缩放处理 */
  if (touches.length === 2) {
    const currentDistance = getTouchDistance(touches[0], touches[1])
    const distanceDelta = currentDistance / pinchStartDistance.value
    const newScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, pinchStartScale.value * distanceDelta))
    scale.value = newScale
    return
  }

  /** 拖动工具：平移画布 */
  if (isPanning.value && activeTool.value === 'pan') {
    const dx = (touches[0].clientX - panStartX.value) / scale.value
    const dy = (touches[0].clientY - panStartY.value) / scale.value
    offsetX.value = panStartOffsetX.value + dx
    offsetY.value = panStartOffsetY.value + dy
    return
  }

  if (!isTouching.value) return

  /** 填充工具在 move 时不重复触发 */
  if (activeTool.value === 'fill') return

  /** 使用 requestAnimationFrame 节流 */
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    handleTouch(e)
    rafId = null
  })
}

/**
 * 触摸结束事件处理
 * - 保存历史记录
 * - 清理预览状态
 * @param _e - 触摸事件
 */
const onTouchEnd = (_e: TouchEvent) => {
  isTouching.value = false
  isPanning.value = false
  pinchStartDistance.value = 0
  previewBead.visible = false
  containerRectCache = null

  /** 仅在非拖动、非缩放时保存历史 */
  if (activeTool.value !== 'pan') {
    saveHistory()
  }
}

/**
 * 获取画布容器的位置信息（使用 uni.createSelectorQuery，兼容多端）
 * @returns 容器的 left/top 坐标，获取失败返回 null
 */
const getContainerRect = (): Promise<{ left: number; top: number } | null> => {
  return new Promise((resolve) => {
    if (!instance) {
      resolve(null)
      return
    }
    const query = uni.createSelectorQuery().in(instance)
    query
      .select('.canvas-container')
      .boundingClientRect((rect: any) => {
        if (rect) {
          containerRectCache = { left: rect.left, top: rect.top }
          resolve({ left: rect.left, top: rect.top })
        } else {
          resolve(null)
        }
      })
      .exec()
  })
}

/**
 * 处理触摸逻辑的核心方法
 * - 计算触摸点在画布网格中的坐标
 * - 根据当前工具执行对应操作（绘制/橡皮/填充/取色）
 * @param e - 触摸事件
 */
const handleTouch = async (e: TouchEvent) => {
  const touch = e.touches[0]
  if (!touch) return

  /** 使用 uni.createSelectorQuery 获取容器位置 */
  const rect = await getContainerRect()
  if (!rect) return

  /** 计算相对于画布的位置（考虑缩放和偏移） */
  const relativeX = (touch.clientX - rect.left) / scale.value - offsetX.value
  const relativeY = (touch.clientY - rect.top) / scale.value - offsetY.value

  /** 计算格子坐标 */
  const gridX = Math.floor(relativeX / cellSize)
  const gridY = Math.floor(relativeY / cellSize)

  /** 边界检查 */
  if (gridX < 0 || gridX >= canvasData.width || gridY < 0 || gridY >= canvasData.height) {
    previewBead.visible = false
    return
  }

  /** 更新预览位置 */
  previewBead.x = gridX
  previewBead.y = gridY
  previewBead.visible = true

  /** 根据工具执行操作 */
  switch (activeTool.value) {
    case 'draw':
      placeBead(gridX, gridY, selectedColor.value)
      break
    case 'erase':
      eraseBead(gridX, gridY)
      break
    case 'fill':
      fillArea(gridX, gridY, selectedColor.value)
      break
    case 'picker':
      pickColor(gridX, gridY)
      break
    default:
      break
  }
}

// ==================== 画布操作 ====================

/**
 * 放置拼豆到指定位置
 * - 如果该位置已有拼豆则更新颜色
 * - 否则添加新拼豆
 * @param x - 网格 X 坐标
 * @param y - 网格 Y 坐标
 * @param color - 拼豆颜色
 */
const placeBead = (x: number, y: number, color: string) => {
  const existingIndex = canvasData.beads.findIndex((b) => b.x === x && b.y === y)
  if (existingIndex >= 0) {
    canvasData.beads[existingIndex].color = color
  } else {
    canvasData.beads.push({ x, y, color })
  }
}

/**
 * 擦除指定位置的拼豆
 * @param x - 网格 X 坐标
 * @param y - 网格 Y 坐标
 */
const eraseBead = (x: number, y: number) => {
  const index = canvasData.beads.findIndex((b) => b.x === x && b.y === y)
  if (index >= 0) {
    canvasData.beads.splice(index, 1)
  }
}

/**
 * 填充区域（Flood Fill 洪水填充算法）
 * - 从指定位置开始，将相邻且颜色相同的区域填充为目标颜色
 * @param startX - 起始网格 X 坐标
 * @param startY - 起始网格 Y 坐标
 * @param fillColor - 填充颜色
 */
const fillArea = (startX: number, startY: number, fillColor: string) => {
  /** 获取指定位置当前拼豆的颜色 */
  const getBeadColor = (x: number, y: number): string | null => {
    const bead = canvasData.beads.find((b) => b.x === x && b.y === y)
    return bead ? bead.color : null
  }

  const targetColor = getBeadColor(startX, startY)

  /** 如果目标颜色与填充颜色相同，无需操作 */
  if (targetColor === fillColor) return

  /** BFS 洪水填充 */
  const visited = new Set<string>()
  const queue: [number, number][] = [[startX, startY]]

  while (queue.length > 0) {
    const [x, y] = queue.shift()!
    const key = `${x},${y}`

    if (visited.has(key)) continue
    if (x < 0 || x >= canvasData.width || y < 0 || y >= canvasData.height) continue

    const currentColor = getBeadColor(x, y)
    if (currentColor !== targetColor) continue

    visited.add(key)
    placeBead(x, y, fillColor)

    /** 向四个方向扩展 */
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }
}

/**
 * 从画布上吸取颜色（取色器工具）
 * - 如果该位置有拼豆，则选中拼豆颜色
 * - 如果没有拼豆，则选中画布背景色
 * @param x - 网格 X 坐标
 * @param y - 网格 Y 坐标
 */
const pickColor = (x: number, y: number) => {
  const bead = canvasData.beads.find((b) => b.x === x && b.y === y)
  if (bead) {
    selectedColor.value = bead.color
    uni.showToast({ title: `取色: ${bead.color}`, icon: 'none' })
  } else {
    selectedColor.value = canvasData.backgroundColor
    uni.showToast({ title: `取色: ${canvasData.backgroundColor}`, icon: 'none' })
  }
  /** 取色后自动切回绘制工具 */
  activeTool.value = 'draw'
}

/**
 * 移除指定索引的拼豆
 * @param index - 拼豆在 beads 数组中的索引
 */
const removeBead = (index: number) => {
  canvasData.beads.splice(index, 1)
  saveHistory()
}

// ==================== 历史记录 ====================

/**
 * 保存当前拼豆状态到历史记录
 * - 深拷贝当前 beads 数组
 * - 截断当前位置之后的历史
 * - 限制最大历史记录数为 50 条
 */
const saveHistory = () => {
  const snapshot = JSON.parse(JSON.stringify(canvasData.beads)) as Bead[]
  history.value = history.value.slice(0, historyIndex.value + 1)
  history.value.push(snapshot)
  historyIndex.value = history.value.length - 1

  /** 限制历史记录数量 */
  if (history.value.length > 50) {
    history.value.shift()
    historyIndex.value--
  }
}

/**
 * 撤销操作：恢复到上一个历史状态
 */
const undo = () => {
  if (historyIndex.value > 0) {
    historyIndex.value--
    canvasData.beads = JSON.parse(JSON.stringify(history.value[historyIndex.value])) as Bead[]
  }
}

/**
 * 重做操作：恢复到下一个历史状态
 */
const redo = () => {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    canvasData.beads = JSON.parse(JSON.stringify(history.value[historyIndex.value])) as Bead[]
  }
}

// ==================== 画布控制 ====================

/**
 * 清空画布（需用户确认）
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
    },
  })
}

/**
 * 放大画布
 */
const zoomIn = () => {
  if (scale.value < SCALE_MAX) {
    scale.value = Math.min(SCALE_MAX, scale.value + SCALE_STEP)
  }
}

/**
 * 缩小画布
 */
const zoomOut = () => {
  if (scale.value > SCALE_MIN) {
    scale.value = Math.max(SCALE_MIN, scale.value - SCALE_STEP)
  }
}

/**
 * 重置视图：回到画布中心，缩放比例归 1
 */
const resetView = () => {
  scale.value = 1
  offsetX.value = 0
  offsetY.value = 0
}

/**
 * 切换网格显示/隐藏
 */
const toggleGrid = () => {
  canvasData.showGrid = !canvasData.showGrid
}

// ==================== 导航与保存 ====================

/**
 * 返回上一页
 * - 如果画布有内容，提示用户确认
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
      },
    })
  } else {
    uni.navigateBack()
  }
}

/**
 * 保存画布到本地存储
 * - 编辑模式：更新已有项目数据
 * - 新建模式：创建新项目并添加到列表头部
 */
const saveCanvas = () => {
  /** 编辑模式使用已有项目名称，新建模式弹出输入框 */
  if (isEditMode.value) {
    doSave(editingProjectName.value)
    return
  }

  uni.showModal({
    title: '保存画布',
    content: '请输入画布名称',
    editable: true,
    placeholderText: '我的拼豆作品',
    success: (res) => {
      if (res.confirm && res.content) {
        doSave(res.content || '未命名作品')
      }
    },
  })
}

/**
 * 执行保存操作
 * - 深拷贝画布数据避免引用污染
 * - 编辑模式更新已有项目，新建模式插入到列表头部
 * @param projectName - 项目名称
 */
const doSave = (projectName: string) => {
  /** 深拷贝画布数据，确保 beads 数组是独立副本 */
  const clonedCanvasData = JSON.parse(JSON.stringify(canvasData)) as CanvasData
  clonedCanvasData.updatedAt = Date.now()

  const projects: ProjectData[] = uni.getStorageSync('pin_projects') || []

  if (isEditMode.value && editingProjectId.value) {
    /** 编辑模式：找到并更新已有项目 */
    const index = projects.findIndex((p) => p.id === editingProjectId.value)
    if (index >= 0) {
      projects[index].name = projectName
      projects[index].canvasData = clonedCanvasData
      projects[index].updatedAt = Date.now()
    }
  } else {
    /** 新建模式：创建新项目 */
    const projectData: ProjectData = {
      id: 'project_' + Date.now(),
      name: projectName,
      canvasData: clonedCanvasData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      thumbnail: '',
    }
    projects.unshift(projectData)
  }

  uni.setStorageSync('pin_projects', projects)
  uni.showToast({ title: '保存成功', icon: 'success' })

  /** 延迟返回项目列表并刷新 */
  setTimeout(() => {
    uni.switchTab({
      url: '/pages/project/index',
      success: () => {
        uni.$emit('projectSaved')
      },
    })
  }, 1000)
}
</script>

<style scoped>
.canvas-editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #F5F5F5;
  overflow: hidden;
}

/* 顶部导航 - 增加状态栏高度适配 */
.editor-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: calc(88rpx + var(--status-bar-height));
  padding: 0 24rpx;
  padding-top: var(--status-bar-height);
  background-color: #FFFFFF;
  border-bottom: 2rpx solid #E8E8E8;
  flex-shrink: 0;
}

.nav-left, .nav-right {
  width: 120rpx;
}

/* 导航按钮 - 增加 padding 扩大热区 */
.nav-btn {
  font-size: 28rpx;
  color: #666666;
  padding: 16rpx 12rpx;
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

/* 工具项 - 增加 padding 扩大热区 */
.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 16rpx;
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
