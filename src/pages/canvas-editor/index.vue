<template>
  <view class="canvas-editor-page">
    <!-- 自定义顶部导航 -->
    <view class="editor-nav">
      <view class="nav-left" @tap="goBack">
        <text class="nav-btn-text">取消</text>
      </view>
      <text class="nav-title">{{ isEditMode ? '编辑画布' : '画布编辑' }}</text>
      <view class="nav-right" @tap="saveCanvas">
        <text class="nav-btn-text primary">保存</text>
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

    <!-- 画布区域（包含行列标注和画布内容，统一缩放和偏移） -->
    <view class="canvas-area">
      <view
        class="canvas-transform-wrapper"
        :style="{
          transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`,
        }"
      >
        <!-- 列标注（顶部数字） -->
        <view class="col-labels" :style="{ width: canvasWidth + 'px', paddingLeft: rowLabelWidth + 'px' }">
          <text
            v-for="col in canvasData.width"
            :key="'cl-'+col"
            class="col-label"
            :style="{ width: cellSize + 'px' }"
          >{{ col }}</text>
        </view>
        
        <view class="canvas-with-row-labels">
          <!-- 行标注（左侧数字） -->
          <view class="row-labels" :style="{ width: rowLabelWidth + 'px' }">
            <text
              v-for="row in canvasData.height"
              :key="'rl-'+row"
              class="row-label"
              :style="{ height: cellSize + 'px' }"
            >{{ row }}</text>
          </view>
          
          <!-- 画布容器 -->
          <view
            class="canvas-container"
            :style="{
              width: canvasWidth + 'px',
              height: canvasHeight + 'px',
              backgroundColor: canvasData.backgroundColor
            }"
            @touchstart="onTouchStart"
            @touchmove.prevent="onTouchMove"
            @touchend="onTouchEnd"
            @touchcancel="onTouchEnd"
          >
            <!-- 网格背景（使用 CSS 线性渐变代替 DOM 元素，大幅提升性能） -->
            <view
              v-if="canvasData.showGrid"
              class="grid-layer-optimized"
              :style="{
                width: canvasWidth + 'px',
                height: canvasHeight + 'px',
                backgroundSize: `${cellSize}px ${cellSize}px`,
                backgroundImage: `linear-gradient(to right, ${canvasData.gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${canvasData.gridColor} 1px, transparent 1px)`,
              }"
            ></view>

            <!-- 拼豆层（使用单一容器+CSS变量优化渲染性能） -->
            <view class="beads-layer">
              <view
                v-for="bead in canvasData.beads"
                :key="`${bead.x}-${bead.y}`"
                class="bead"
                :style="{
                  left: (bead.x * cellSize) + 'px',
                  top: (bead.y * cellSize) + 'px',
                  width: cellSize + 'px',
                  height: cellSize + 'px',
                  backgroundColor: bead.color,
                }"
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

    <!-- 自定义保存弹窗 -->
    <view class="save-modal-overlay" v-if="showSaveModal" @tap="showSaveModal = false">
      <view class="save-modal" @tap.stop>
        <view class="save-modal-header">
          <text class="save-modal-title">保存画布</text>
          <text class="save-modal-close" @tap="showSaveModal = false">✕</text>
        </view>
        <view class="save-modal-body">
          <input
            class="save-name-input"
            v-model="saveName"
            :placeholder="saveNamePlaceholder"
            placeholder-class="save-placeholder"
            :focus="showSaveModal"
            @input="onSaveNameInput"
          />
        </view>
        <view class="save-modal-footer">
          <view class="save-cancel-btn" @tap="showSaveModal = false"><text>取消</text></view>
          <view class="save-only-btn" @tap="confirmSave"><text>仅保存</text></view>
          <view class="save-export-btn" @tap="confirmSaveAndExport"><text>保存并导出</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, getCurrentInstance, toRaw, shallowRef, triggerRef } from 'vue'
import { consumeBlueprintData } from '@/utils/blueprint-transfer'
import { getMardCodeByHex } from '@/utils/mard-colors'

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

/** 行标注宽度 */
const rowLabelWidth = 28

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

/** 画布数据 - 使用 reactive */
const canvasData = reactive<CanvasData>({
  width: 30,
  height: 30,
  backgroundColor: '#FFFFFF',
  showGrid: true,
  gridColor: '#CCCCCC',
  beads: [] as Bead[],
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

/** 画布是否有未保存的修改（用于取消时判断是否需要确认） */
const hasUnsavedChanges = ref(false)

/** 初始 beads 快照（JSON字符串，用于精确判断是否有修改） */
let initialBeadsSnapshot = ''

/** 保存弹窗状态 */
const showSaveModal = ref(false)
const saveName = ref('')
const saveNamePlaceholder = ref('我的拼豆作品')

/** requestAnimationFrame 节流标记 */
let rafId: number | null = null

/** 上次触摸处理时间（用于节流） */
let lastTouchTime = 0
const TOUCH_THROTTLE_MS = 16 /** 约60fps */

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
    console.log('开始加载项目:', options.projectId)
    loadProject(options.projectId)
    console.log('loadProject 执行完成，beads数量:', canvasData.beads.length)
  } else if (options.mode === 'create' && options.data) {
    /** 新建项目：从 URL 参数解析画布数据 */
    try {
      const data = JSON.parse(decodeURIComponent(options.data)) as CanvasData
      /** 使用 Object.assign 强制更新整个 canvasData */
      Object.assign(canvasData, {
        ...data,
        beads: data.beads || [],
        updatedAt: Date.now()
      })
    } catch (e) {
      console.error('解析画布数据失败:', e)
    }
  } else if (options.mode === 'blueprint') {
    /** 从图片导入生成图纸 */
    /** 通过共享模块读取数据（模块级变量，最可靠） */
    try {
      const data = consumeBlueprintData()
      if (data) {
        canvasData.width = data.width || 30
        canvasData.height = data.height || 30
        canvasData.backgroundColor = data.backgroundColor || '#FFFFFF'
        canvasData.showGrid = data.showGrid !== undefined ? data.showGrid : true
        canvasData.gridColor = data.gridColor || '#CCCCCC'
        canvasData.createdAt = data.createdAt || Date.now()
        canvasData.updatedAt = Date.now()
        canvasData.beads = data.beads || []
        /** 记录初始状态快照 */
        initialBeadsSnapshot = JSON.stringify(canvasData.beads)
        hasUnsavedChanges.value = false
        console.log('[蓝图] 数据加载成功(共享模块), beads数量:', canvasData.beads.length, '尺寸:', canvasData.width, 'x', canvasData.height)
      } else {
        console.warn('[蓝图] 共享模块无数据，尝试 localStorage')
        /** 降级：尝试 localStorage */
        if (options.key) {
          const rawData = uni.getStorageSync(options.key)
          if (rawData) {
            uni.removeStorageSync(options.key)
            const data2 = JSON.parse(rawData)
            canvasData.width = data2.width || 30
            canvasData.height = data2.height || 30
            canvasData.backgroundColor = data2.backgroundColor || '#FFFFFF'
            canvasData.showGrid = data2.showGrid !== undefined ? data2.showGrid : true
            canvasData.gridColor = data2.gridColor || '#CCCCCC'
            canvasData.beads = data2.beads || []
            canvasData.createdAt = data2.createdAt || Date.now()
            canvasData.updatedAt = Date.now()
            console.log('[蓝图] 数据加载成功(localStorage), beads数量:', canvasData.beads.length)
          }
        }
      }
    } catch (e) {
      console.error('[蓝图] 数据加载失败:', e)
    }
  }

  /** 加载收藏颜色 */
  const savedFavorites = uni.getStorageSync('pin_favorite_colors')
  if (savedFavorites) {
    favoriteColors.value = savedFavorites
  }

  /** 保存初始状态到历史（确保 beads 已初始化） */
  nextTick(() => {
    /** 编辑模式：历史记录应从加载的数据开始，而不是空状态 */
    if (options.mode === 'edit' && options.projectId) {
      /** 清空历史，以加载的项目状态作为初始历史 */
      history.value = []
      historyIndex.value = -1
    }
    saveHistory()
    console.log('初始化完成，beads数量:', canvasData.beads.length)
  })
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

    /** 深拷贝存储的项目数据 */
    const clonedData = JSON.parse(JSON.stringify(project.canvasData)) as CanvasData
    
    /** 逐个属性赋值，确保响应式更新 */
    canvasData.width = clonedData.width || 30
    canvasData.height = clonedData.height || 30
    canvasData.backgroundColor = clonedData.backgroundColor || '#FFFFFF'
    canvasData.showGrid = clonedData.showGrid !== undefined ? clonedData.showGrid : true
    canvasData.gridColor = clonedData.gridColor || '#CCCCCC'
    canvasData.createdAt = clonedData.createdAt || Date.now()
    canvasData.updatedAt = Date.now()
    
    /** 清空并重新填充 beads 数组 */
    canvasData.beads.splice(0, canvasData.beads.length)
    if (clonedData.beads && clonedData.beads.length > 0) {
      canvasData.beads.push(...clonedData.beads)
    }
    
    /** 记录初始状态快照，用于精确判断是否有修改 */
    initialBeadsSnapshot = JSON.stringify(canvasData.beads)
    hasUnsavedChanges.value = false
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

  /** 时间节流：限制处理频率 */
  const now = Date.now()
  if (now - lastTouchTime < TOUCH_THROTTLE_MS) return
  lastTouchTime = now

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

  /** 计算格子坐标（考虑缩放和偏移避免点击位置偏移） */
  const gridX = Math.floor(((touch.clientX - rect.left) / scale.value - offsetX.value) / cellSize)
  const gridY = Math.floor(((touch.clientY - rect.top) / scale.value - offsetY.value) / cellSize)

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
    const beads = JSON.parse(JSON.stringify(history.value[historyIndex.value])) as Bead[]
    /** 使用 splice 替换 beads 数组，确保响应式 */
    canvasData.beads.splice(0, canvasData.beads.length, ...beads)
  }
}

/**
 * 重做操作：恢复到下一个历史状态
 */
const redo = () => {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    const beads = JSON.parse(JSON.stringify(history.value[historyIndex.value])) as Bead[]
    /** 使用 splice 替换 beads 数组，确保响应式 */
    canvasData.beads.splice(0, canvasData.beads.length, ...beads)
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
        /** 使用 splice 清空 beads 数组，确保响应式 */
        canvasData.beads.splice(0, canvasData.beads.length)
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
 * - 如果画布有未保存的修改，提示用户确认
 * - 无修改则直接返回
 */
const goBack = () => {
  /** 精确判断是否有修改：比较当前 beads 与初始快照 */
  const currentSnapshot = JSON.stringify(canvasData.beads)
  const hasChanges = hasUnsavedChanges.value || currentSnapshot !== initialBeadsSnapshot
  
  if (hasChanges) {
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
 * - 编辑模式和新建模式都显示保存弹窗，让用户选择"仅保存"或"保存并导出"
 */
const saveCanvas = () => {
  console.log('[保存] saveCanvas 被调用, isEditMode:', isEditMode.value)
  if (isEditMode.value) {
    /** 编辑模式：预填充当前项目名称 */
    saveName.value = editingProjectName.value
    saveNamePlaceholder.value = editingProjectName.value
  } else {
    /** 新建模式：清空名称 */
    saveName.value = ''
    saveNamePlaceholder.value = '我的拼豆作品'
  }
  showSaveModal.value = true
  console.log('[保存] showSaveModal 已设为 true')
}

const onSaveNameInput = () => {
  // 输入后隐藏placeholder（通过CSS :not(:placeholder-shown)处理）
}

const confirmSave = () => {
  console.log('[保存] confirmSave 被调用, saveName:', saveName.value)
  const name = saveName.value.trim() || '未命名作品'
  showSaveModal.value = false
  doSave(name)
}

/**
 * 保存并导出图纸
 * - 先执行保存逻辑
 * - 然后生成带水印的拼豆图纸图片并下载
 */
const confirmSaveAndExport = () => {
  console.log('[保存] confirmSaveAndExport 被调用, saveName:', saveName.value)
  const name = saveName.value.trim() || '未命名作品'
  showSaveModal.value = false
  doSave(name, true)
}

/**
 * 导出拼豆图纸为图片（带用料清单和水印）
 * - 上方：像素级拼豆图（圆形拼豆 + 中心孔 + 网格线）
 * - 下方：用料清单（颜色色块 + 数量）+ 总数 + 域名水印
 * @param projectName - 项目名称
 */
const exportBlueprintImage = (projectName: string) => {
  console.log('[导出] 开始生成图纸, 尺寸:', canvasData.width, 'x', canvasData.height)
  const w = canvasData.width
  const h = canvasData.height
  
  /** 根据图纸尺寸动态计算每格像素 */
  const cellPx = w <= 30 ? 28 : w <= 60 ? 20 : 16
  const padding = 30
  const headerH = 60
  const fontSize = Math.max(7, Math.floor(cellPx * 0.45))

  /** 统计每种颜色的使用数量，并获取真实 MARD 色号 */
  const colorCount: Record<string, number> = {}
  const colorCodeMap: Record<string, string> = {}
  const beads = canvasData.beads
  beads.forEach((b: Bead) => {
    if (b.color) {
      colorCount[b.color] = (colorCount[b.color] || 0) + 1
      if (!(b.color in colorCodeMap)) {
        const mardCode = getMardCodeByHex(b.color)
        colorCodeMap[b.color] = mardCode || b.color.slice(1, 4).toUpperCase()
      }
    }
  })
  const colorList = Object.entries(colorCount).sort((a, b) => b[1] - a[1])
  const totalBeads = beads.length
  const uniqueColors = colorList.length

  /** 用料清单布局 */
  const swatchSize = 36
  const swatchGap = 12
  const textWidth = 60
  const itemWidth = swatchSize + swatchGap + textWidth
  const swatchCols = Math.max(4, Math.min(Math.floor((w * cellPx + padding * 2 - 40) / itemWidth), 8))
  const materialRows = Math.ceil(colorList.length / swatchCols)
  const materialHeaderH = 40
  const materialH = materialHeaderH + materialRows * (swatchSize + 8) + 20
  const footerH = 50

  const canvasW = w * cellPx + padding * 2
  const canvasH = headerH + h * cellPx + padding * 2 + materialH + footerH

  // #ifdef H5
  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    uni.showToast({ title: '导出失败', icon: 'none' })
    return
  }

  /** 白色背景 */
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvasW, canvasH)

  /** ========== 1. 标题区域 ========== */
  ctx.fillStyle = '#FAFAFA'
  ctx.fillRect(0, 0, canvasW, headerH)
  /** 分隔线 */
  ctx.strokeStyle = '#E8E8E8'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, headerH - 0.5)
  ctx.lineTo(canvasW, headerH - 0.5)
  ctx.stroke()
  
  /** 项目名称 */
  ctx.fillStyle = '#1A1A1A'
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(projectName, padding, headerH / 2 - 8)
  
  /** 尺寸和统计信息 */
  ctx.fillStyle = '#888888'
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillText(`${w} × ${h}  ·  ${totalBeads.toLocaleString()}颗  ·  ${uniqueColors}色`, padding, headerH / 2 + 12)

  /** ========== 2. 拼豆图纸 ========== */
  const gridOffsetY = headerH + padding
  const beadMap: Record<string, string> = {}
  beads.forEach((b: Bead) => {
    beadMap[`${b.x},${b.y}`] = b.color
  })

  /** 先绘制背景网格线 */
  ctx.strokeStyle = '#E0E0E0'
  ctx.lineWidth = 0.5
  for (let x = 0; x <= w; x++) {
    ctx.beginPath()
    ctx.moveTo(padding + x * cellPx, gridOffsetY)
    ctx.lineTo(padding + x * cellPx, gridOffsetY + h * cellPx)
    ctx.stroke()
  }
  for (let y = 0; y <= h; y++) {
    ctx.beginPath()
    ctx.moveTo(padding, gridOffsetY + y * cellPx)
    ctx.lineTo(padding + w * cellPx, gridOffsetY + y * cellPx)
    ctx.stroke()
  }

  /** 绘制每个拼豆（圆形 + 中心孔） */
  const beadRadius = cellPx * 0.42
  const holeRadius = cellPx * 0.12
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const color = beadMap[`${x},${y}`]
      if (!color) continue
      
      const cx = padding + x * cellPx + cellPx / 2
      const cy = gridOffsetY + y * cellPx + cellPx / 2
      const mardCode = colorCodeMap[color]

      /** 拼豆主体（圆形） */
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(cx, cy, beadRadius, 0, Math.PI * 2)
      ctx.fill()
      
      /** 拼豆边缘阴影效果 */
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 1
      ctx.stroke()
      
      /** 中心孔 */
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.1)'
      ctx.lineWidth = 0.5
      ctx.stroke()

      /** 色号编号 */
      if (mardCode && cellPx >= 14) {
        const r = parseInt(color.slice(1, 3), 16)
        const g = parseInt(color.slice(3, 5), 16)
        const b = parseInt(color.slice(5, 7), 16)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        ctx.fillStyle = luminance > 0.5 ? '#333333' : '#FFFFFF'
        ctx.font = `bold ${fontSize}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(mardCode, cx, cy)
      }
    }
  }

  /** ========== 3. 用料清单 ========== */
  const materialY = gridOffsetY + h * cellPx + padding

  /** 标题行背景 */
  ctx.fillStyle = '#FAFAFA'
  ctx.fillRect(0, materialY, canvasW, materialHeaderH)
  ctx.strokeStyle = '#E8E8E8'
  ctx.beginPath()
  ctx.moveTo(0, materialY + materialHeaderH - 0.5)
  ctx.lineTo(canvasW, materialY + materialHeaderH - 0.5)
  ctx.stroke()
  
  /** 标题文字 */
  ctx.fillStyle = '#1A1A1A'
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('用料清单', padding, materialY + materialHeaderH / 2)
  
  ctx.fillStyle = '#888888'
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`共 ${totalBeads.toLocaleString()} 颗`, canvasW - padding, materialY + materialHeaderH / 2)

  /** 色块列表 */
  const listStartY = materialY + materialHeaderH + 12
  const listPadding = (canvasW - padding * 2 - swatchCols * itemWidth + swatchGap) / 2
  
  colorList.forEach(([color, count], index) => {
    const col = index % swatchCols
    const row = Math.floor(index / swatchCols)
    const sx = padding + listPadding + col * itemWidth
    const sy = listStartY + row * (swatchSize + 8)
    const mardCode = colorCodeMap[color] || ''

    /** 色块（圆形拼豆样式） */
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(sx + swatchSize / 2, sy + swatchSize / 2, swatchSize / 2 - 2, 0, Math.PI * 2)
    ctx.fill()
    
    /** 中心孔 */
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(sx + swatchSize / 2, sy + swatchSize / 2, swatchSize * 0.15, 0, Math.PI * 2)
    ctx.fill()

    /** 色号 + 数量 */
    ctx.fillStyle = '#333333'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(mardCode, sx + swatchSize + swatchGap, sy + swatchSize / 2 - 6)
    
    ctx.fillStyle = '#888888'
    ctx.font = '11px sans-serif'
    ctx.fillText(`×${count}`, sx + swatchSize + swatchGap, sy + swatchSize / 2 + 8)
  })

  /** ========== 4. 底部水印 ========== */
  ctx.fillStyle = '#FAFAFA'
  ctx.fillRect(0, canvasH - footerH, canvasW, footerH)
  ctx.strokeStyle = '#E8E8E8'
  ctx.beginPath()
  ctx.moveTo(0, canvasH - footerH + 0.5)
  ctx.lineTo(canvasW, canvasH - footerH + 0.5)
  ctx.stroke()
  
  ctx.fillStyle = '#BBBBBB'
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('pindou.picsync.cn', canvasW / 2, canvasH - footerH / 2)

  /** 下载图片 */
  try {
    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `${projectName}_拼豆图纸.png`
    link.href = dataUrl
    link.click()
    console.log('[导出] 图片下载成功')
    uni.showToast({ title: '导出成功', icon: 'success' })
  } catch (e) {
    console.error('[导出] 下载失败:', e)
    uni.showToast({ title: '导出失败', icon: 'none' })
  }
  // #endif

  // #ifndef H5
  uni.showToast({ title: '导出功能仅支持H5端', icon: 'none' })
  // #endif
}

/**
 * 执行保存操作
 * - 深拷贝画布数据避免引用污染
 * - 编辑模式更新已有项目，新建模式插入到列表头部
 * @param projectName - 项目名称
 */
const doSave = (projectName: string, exportAfterSave = false) => {
  console.log('[保存] doSave 开始, projectName:', projectName, 'beads数量:', canvasData.beads.length, '导出:', exportAfterSave)

  try {
    /** 步骤1：生成缩略图 */
    let thumbnail = ''
    try {
      const beads = canvasData.beads
      if (beads.length > 0) {
        const w = canvasData.width
        const h = canvasData.height
        const bg = canvasData.backgroundColor || '#FFFFFF'
        const colorMap: Record<string, {x: number, y: number}[]> = {}
        beads.forEach((b: Bead) => {
          if (!colorMap[b.color]) colorMap[b.color] = []
          colorMap[b.color].push({ x: b.x, y: b.y })
        })
        let rects = ''
        Object.entries(colorMap).forEach(([color, positions]) => {
          positions.forEach(p => {
            rects += `<rect x="${p.x}" y="${p.y}" width="1" height="1" fill="${color}"/>`
          })
        })
        const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${rects}</svg>`
        thumbnail = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`
        console.log('[保存] 缩略图生成成功, SVG长度:', svgStr.length)
      }
    } catch (e) {
      console.warn('[保存] 缩略图生成失败(不影响保存):', e)
    }

    /** 步骤2：深拷贝画布数据 */
    console.log('[保存] 开始深拷贝画布数据...')
    const clonedCanvasData = JSON.parse(JSON.stringify(toRaw(canvasData))) as CanvasData
    clonedCanvasData.updatedAt = Date.now()
    console.log('[保存] 深拷贝完成, beads数量:', clonedCanvasData.beads.length)

    /** 步骤3：读取已有项目列表 */
    const projects: ProjectData[] = uni.getStorageSync('pin_projects') || []
    console.log('[保存] 已有项目数量:', projects.length)

    /** 步骤4：更新或创建项目 */
    if (isEditMode.value && editingProjectId.value) {
      const index = projects.findIndex((p) => p.id === editingProjectId.value)
      if (index >= 0) {
        projects[index].name = projectName
        projects[index].canvasData = clonedCanvasData
        projects[index].updatedAt = Date.now()
        projects[index].thumbnail = thumbnail
      }
    } else {
      const projectData: ProjectData = {
        id: 'project_' + Date.now(),
        name: projectName,
        canvasData: clonedCanvasData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        thumbnail: thumbnail,
      }
      projects.unshift(projectData)
    }

    /** 步骤5：写入 localStorage */
    console.log('[保存] 准备写入 localStorage...')
    uni.setStorageSync('pin_projects', projects)
    console.log('[保存] localStorage 写入成功')
    /** 重置修改标记和快照 */
    hasUnsavedChanges.value = false
    initialBeadsSnapshot = JSON.stringify(canvasData.beads)
    uni.showToast({ title: '保存成功', icon: 'success' })

    /** 步骤6：跳转（导出在 try-catch 外部处理，避免导出异常影响保存） */
    const navigateToProject = () => {
      setTimeout(() => {
        uni.switchTab({
          url: '/pages/project/index',
          success: () => { uni.$emit('projectSaved') },
          fail: () => {
            uni.reLaunch({
              url: '/pages/project/index',
              success: () => { uni.$emit('projectSaved') },
            })
          }
        })
      }, 800)
    }

    if (exportAfterSave) {
      /** 保存并导出：先导出图片，再跳转 */
      setTimeout(() => {
        try {
          exportBlueprintImage(projectName)
        } catch (e) {
          console.error('[导出] 导出失败:', e)
          uni.showToast({ title: '导出失败，但已保存', icon: 'none' })
        }
        navigateToProject()
      }, 300)
    } else {
      navigateToProject()
    }
  } catch (e) {
    console.error('[保存] doSave 发生异常:', e)
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
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
  height: calc(88rpx + var(--status-bar-height, 44px));
  padding: 0 24rpx;
  padding-top: calc(var(--status-bar-height, 44px) + 8px);
  padding-bottom: 8px;
  background-color: #FFFFFF;
  border-bottom: 2rpx solid #E8E8E8;
  position: relative;
  z-index: 100;
  flex-shrink: 0;
}

.nav-left, .nav-right {
  width: 120rpx;
  min-height: 44px;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.nav-left { justify-content: flex-start; }
.nav-right { justify-content: flex-end; }

.nav-btn-text {
  font-size: 30rpx;
  color: #666666;
  padding: 20rpx 24rpx;
  line-height: 1;
}

.nav-btn-text.primary {
  color: #007AFF;
  font-weight: 600;
  background: #F0F7FF;
  border-radius: 16rpx;
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
  flex-shrink: 0;
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

/* 画布区域 */
.canvas-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.canvas-transform-wrapper {
  transform-origin: center center;
}

/* 列标注（顶部数字） */
.col-labels {
  display: flex;
  box-sizing: border-box;
}

.col-label {
  font-size: 10px;
  color: #999;
  text-align: center;
  flex-shrink: 0;
  line-height: 20px;
}

/* 行标注和画布容器 */
.canvas-with-row-labels {
  display: flex;
}

/* 行标注（左侧数字） */
.row-labels {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.row-label {
  font-size: 10px;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 4px;
  flex-shrink: 0;
}

/* 画布容器 */
.canvas-container {
  position: relative;
  overflow: visible;
}

/* 网格层（优化版：使用 CSS 渐变，无 DOM 元素） */
.grid-layer-optimized {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  will-change: transform;
  transform: translateZ(0);
}

/* 旧网格层（已废弃，保留样式以防回退） */
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
  will-change: transform;
  transform: translateZ(0);
}

.bead {
  position: absolute;
  border-radius: 4rpx;
  box-shadow: inset 0 -4rpx 0 rgba(0, 0, 0, 0.2),
              inset 0 4rpx 0 rgba(255, 255, 255, 0.3);
  will-change: transform;
  transform: translateZ(0);
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

/* 保存弹窗 */
.save-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.save-modal {
  width: 300px;
  background-color: #FFFFFF;
  border-radius: 16px;
  overflow: hidden;
}

.save-modal-header {
  padding: 20px 20px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.save-modal-title {
  font-size: 17px;
  font-weight: 600;
  color: #2D2D2D;
}

.save-modal-close {
  font-size: 20px;
  color: #999999;
  padding: 4px;
}

.save-modal-body {
  padding: 0 20px 20px;
}

.save-name-input {
  width: 100%;
  height: 44px;
  background-color: #F5F5F5;
  border-radius: 10px;
  padding: 0 14px;
  font-size: 15px;
  color: #2D2D2D;
  box-sizing: border-box;
}

.save-placeholder {
  color: #CCCCCC;
}

.save-modal-footer {
  display: flex;
  border-top: 1px solid #F0F0F0;
}

.save-cancel-btn {
  flex: 1;
  text-align: center;
  padding: 14px;
  font-size: 16px;
  color: #666666;
  border-right: 1px solid #F0F0F0;
}

.save-only-btn {
  flex: 1;
  text-align: center;
  padding: 14px;
  font-size: 16px;
  color: #007AFF;
  font-weight: 600;
  border-right: 1px solid #F0F0F0;
}

.save-export-btn {
  flex: 1.2;
  text-align: center;
  padding: 14px;
  font-size: 16px;
  color: #FFFFFF;
  font-weight: 600;
  background: linear-gradient(135deg, #007AFF, #0056CC);
  border-radius: 0 0 12px 0;
}
</style>
