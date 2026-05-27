<template>
  <view class="canvas-editor-page">
    <!-- ==================== 顶部导航 ==================== -->
    <view class="editor-nav">
      <view class="nav-left" @tap="goBack">
        <image class="nav-back-icon" src="/static/assets/v015/icons/back.png" mode="aspectFit" />
      </view>
      <text class="nav-title">{{ isEditMode ? '编辑画布' : '画布编辑' }}</text>
      <view class="nav-right">
        <view class="nav-btn" @tap="saveCanvas">
          <text class="nav-btn-text">保存</text>
        </view>
        <view class="nav-btn nav-btn-export" @tap="handleExport">
          <text class="nav-btn-text">导出</text>
        </view>
      </view>
    </view>

    <!-- ==================== 主体区域（侧边栏 + 画布） ==================== -->
    <view class="editor-body">
      <!-- 侧边工具栏 -->
      <view class="sidebar-tools">
        <view
          v-for="tool in sideTools"
          :key="tool.id"
          :class="['sidebar-tool-item', (activeTool === tool.id || (tool.id === 'color' && showColorPanel)) ? 'active' : '']"
          @click="onToolClick(tool.id)"
        >
          <image
            class="sidebar-tool-icon"
            :src="(activeTool === tool.id || (tool.id === 'color' && showColorPanel)) ? tool.activeIcon : tool.icon"
            mode="aspectFit"
          />
          <text class="sidebar-tool-label">{{ tool.label }}</text>
          <!-- 颜色工具下方显示当前颜色小圆点 -->
          <view
            v-if="tool.id === 'color'"
            class="sidebar-color-dot"
            :style="{ backgroundColor: selectedColor }"
          ></view>
        </view>
      </view>

      <!-- 画布区域 -->
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
              :key="'cl-' + col"
              :class="['col-label', { emphasis: col % 5 === 0 }]"
              :style="{ width: cellSize + 'px' }"
            >{{ col }}</text>
          </view>

          <view class="canvas-with-row-labels">
            <!-- 行标注（左侧数字） -->
            <view class="row-labels" :style="{ width: rowLabelWidth + 'px' }">
              <text
                v-for="row in canvasData.height"
                :key="'rl-' + row"
                :class="['row-label', { emphasis: row % 5 === 0 }]"
                :style="{ height: cellSize + 'px' }"
              >{{ row }}</text>
            </view>

            <!-- 画布容器 -->
            <view
              class="canvas-container"
              :style="{
                width: canvasWidth + 'px',
                height: canvasHeight + 'px',
                backgroundColor: canvasData.backgroundColor,
              }"
              @touchstart="onTouchStart"
              @touchmove.prevent="onTouchMove"
              @touchend="onTouchEnd"
              @touchcancel="onTouchEnd"
              @mousedown="onMouseDown"
              @mousemove="onMouseMove"
              @mouseup="onMouseUp"
              @mouseleave="onMouseUp"
            >
              <!-- 网格背景（基础线 + 5格分组线） -->
              <view
                v-if="canvasData.showGrid"
                class="grid-layer-optimized"
                :style="gridLayerStyle"
              ></view>
              <view
                v-for="line in majorHorizontalLines"
                v-if="canvasData.showGrid"
                :key="'h-' + line.index"
                class="major-grid-line horizontal"
                :class="{ 'dashed': line.isDashed }"
                :style="{ top: line.index * cellSize + 'px' }"
              ></view>
              <view
                v-for="line in majorVerticalLines"
                v-if="canvasData.showGrid"
                :key="'v-' + line.index"
                class="major-grid-line vertical"
                :class="{ 'dashed': line.isDashed }"
                :style="{ left: line.index * cellSize + 'px' }"
              ></view>

              <!-- 拼豆层 -->
              <view class="beads-layer">
                <view
                  v-for="bead in canvasData.beads"
                  :key="`${bead.x}-${bead.y}`"
                  :class="['bead', beadStyle === 'round' ? 'bead-round' : 'bead-square']"
                  :style="{
                    left: (bead.x * cellSize) + 'px',
                    top: (bead.y * cellSize) + 'px',
                    width: cellSize + 'px',
                    height: cellSize + 'px',
                    backgroundColor: bead.color,
                    opacity: !highlightedColor || highlightedColor === bead.color ? 1 : 0.12,
                    filter: highlightedColor && highlightedColor !== bead.color ? 'grayscale(0.65) saturate(0.55)' : 'none',
                    boxShadow: highlightedColor === bead.color
                      ? '0 0 0 2px rgba(245,166,35,0.98), 0 0 18px rgba(245,166,35,0.45)'
                      : '',
                  }"
                >
                  <!-- 圆豆中心白色圆孔 -->
                  <view v-if="beadStyle === 'round'" class="bead-hole"></view>
                  <!-- 色号文字 -->
                  <text
                    v-if="showColorCode && scale >= 0.6"
                    class="bead-color-code"
                    :style="{ color: getTextColor(bead.color) }"
                  >{{ getMardCodeByHex(bead.color) || '' }}</text>
                </view>
              </view>

              <!-- 选中高亮框 -->
              <view
                v-if="selectedCell"
                class="selected-cell-highlight"
                :style="{
                  left: (selectedCell.x * cellSize) + 'px',
                  top: (selectedCell.y * cellSize) + 'px',
                  width: cellSize + 'px',
                  height: cellSize + 'px',
                }"
              ></view>

              <!-- 触摸预览 -->
              <view
                v-if="previewBead.visible && activeTool !== 'pan'"
                class="bead preview"
                :class="beadStyle === 'round' ? 'bead-round' : 'bead-square'"
                :style="{
                  left: (previewBead.x * cellSize) + 'px',
                  top: (previewBead.y * cellSize) + 'px',
                  width: cellSize + 'px',
                  height: cellSize + 'px',
                  backgroundColor: selectedColor,
                }"
              >
                <view v-if="beadStyle === 'round'" class="bead-hole"></view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ==================== 底部快捷操作区 ==================== -->
    <view class="bottom-shortcuts">
      <view class="shortcuts-left">
        <view
          :class="['shortcut-btn', 'icon-only', historyIndex > 0 ? 'active' : 'disabled']"
          @click="undo"
        >
          <image class="shortcut-icon" src="/static/assets/v015/icons/undo-muted.png" mode="aspectFit" />
        </view>
        <view
          :class="['shortcut-btn', 'icon-only', historyIndex < history.length - 1 ? 'active' : 'disabled']"
          @click="redo"
        >
          <image class="shortcut-icon" src="/static/assets/v015/icons/redo-muted.png" mode="aspectFit" />
        </view>
        <view
          :class="['shortcut-btn', 'icon-only', canvasData.beads.length > 0 ? 'active' : 'disabled']"
          @click="clearCanvas"
        >
          <image class="shortcut-icon" src="/static/assets/v015/icons/trash-muted.png" mode="aspectFit" />
        </view>
      </view>
      <view class="shortcuts-right">
        <view
          :class="['shortcut-btn', canvasData.showGrid ? 'active' : '']"
          @click="toggleGrid"
        >
          <image class="shortcut-icon" :src="canvasData.showGrid ? '/static/assets/v015/icons/grid-active.png' : '/static/assets/v015/icons/grid-muted.png'" mode="aspectFit" />
          <text class="shortcut-label">网格</text>
        </view>
        <view
          :class="['shortcut-btn', showColorCode ? 'active' : '']"
          @click="showColorCode = !showColorCode"
        >
          <image class="shortcut-icon" :src="showColorCode ? '/static/assets/v015/icons/tag-active.png' : '/static/assets/v015/icons/tag-muted.png'" mode="aspectFit" />
          <text class="shortcut-label">色号</text>
        </view>
      </view>
    </view>

    <!-- ==================== 豆子统计区（独立信息行） ==================== -->
    <view class="bead-stats-bar">
      <view class="stats-total">
        <text class="stats-main">{{ beadStats.totalTypes }} 种</text>
        <text class="stats-sub">豆子 {{ beadStats.totalCount.toLocaleString() }}</text>
      </view>
      <view class="stats-divider"></view>
      <scroll-view class="stats-scroll" scroll-x :show-scrollbar="false">
        <view class="stats-list">
          <view
            v-for="item in beadStats.colorList"
            :key="item.color"
            class="stats-item"
            @click="openColorDetail(item)"
          >
            <view class="stats-chip" :style="{ backgroundColor: item.color }">
              <text class="stats-chip-code" :style="{ color: getTextColor(item.color) }">{{ item.code }}</text>
              <text class="stats-chip-count" :style="{ color: getTextColor(item.color) }">{{ item.count }}</text>
            </view>
          </view>
          <text v-if="beadStats.colorList.length === 0" class="stats-empty">暂无颜色用量</text>
        </view>
      </scroll-view>
    </view>

    <!-- ==================== Tab栏 ==================== -->
    <view class="tab-bar">
      <view
        :class="['tab-item', activeTab === 'size' ? 'active' : '']"
        @click="activeTab = 'size'"
      >
        <text class="tab-text">尺寸</text>
      </view>
      <view
        :class="['tab-item', activeTab === 'edit' ? 'active' : '']"
        @click="activeTab = 'edit'"
      >
        <text class="tab-text">编辑</text>
      </view>
      <view
        :class="['tab-item', activeTab === 'style' ? 'active' : '']"
        @click="activeTab = 'style'"
      >
        <text class="tab-text">样式</text>
      </view>
    </view>

    <!-- ==================== Tab内容面板 ==================== -->
    <view class="tab-panel">
      <!-- 尺寸Tab -->
      <view v-if="activeTab === 'size'" class="tab-panel-content">
        <view class="size-options">
          <view
            v-for="opt in sizeOptions"
            :key="opt.label"
            :class="['size-option', isSizeOptionActive(opt) ? 'active' : '']"
            @click="onSizeOptionClick(opt)"
          >
            <text class="size-option-text">{{ opt.label }}</text>
          </view>
        </view>
      </view>

      <!-- 编辑Tab -->
      <view v-if="activeTab === 'edit'" class="tab-panel-content">
        <view class="edit-options">
          <view class="edit-option" @click="flipHorizontal">
            <image class="edit-option-icon" src="/static/assets/v015/icons/flip-horizontal.png" mode="aspectFit" />
            <text class="edit-option-text">水平翻转</text>
          </view>
          <view class="edit-option" @click="flipVertical">
            <image class="edit-option-icon" src="/static/assets/v015/icons/flip-vertical.png" mode="aspectFit" />
            <text class="edit-option-text">垂直翻转</text>
          </view>
          <view class="edit-option" @click="rotate90">
            <image class="edit-option-icon" src="/static/assets/v015/icons/rotate.png" mode="aspectFit" />
            <text class="edit-option-text">旋转90°</text>
          </view>
        </view>
      </view>

      <!-- 样式Tab -->
      <view v-if="activeTab === 'style'" class="tab-panel-content">
        <view class="style-options">
          <view
            :class="['style-option', beadStyle === 'square' ? 'active' : '']"
            @click="beadStyle = 'square'"
          >
            <view class="style-preview bead-square-preview"></view>
            <text class="style-option-text">方豆</text>
          </view>
          <view
            :class="['style-option', beadStyle === 'round' ? 'active' : '']"
            @click="beadStyle = 'round'"
          >
            <view class="style-preview bead-round-preview">
              <view class="style-preview-hole"></view>
            </view>
            <text class="style-option-text">圆豆</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ==================== 颜色选择面板（底部弹窗） ==================== -->
    <view v-if="showColorPanel" class="color-panel-overlay" @click="showColorPanel = false">
      <view class="color-panel-content" @click.stop>
        <!-- 标题栏 -->
        <view class="color-panel-header">
          <text class="color-panel-title">选择画笔颜色</text>
          <text class="color-panel-close" @click="showColorPanel = false">✕</text>
        </view>
        <!-- 系列筛选栏 -->
        <scroll-view class="color-series-scroll" scroll-x :show-scrollbar="false">
          <view class="color-series-list">
            <view
              v-for="s in colorSeries"
              :key="s.key"
              :class="['color-series-item', selectedSeries === s.key ? 'active' : '']"
              @click="selectedSeries = s.key"
            >
              <text class="color-series-text">{{ s.label }}</text>
            </view>
          </view>
        </scroll-view>
        <!-- 色卡网格 -->
        <scroll-view class="color-card-scroll" scroll-y :show-scrollbar="false">
          <view class="color-card-grid">
            <view
              v-for="c in filteredMardColors"
              :key="c.code"
              :class="['color-card-item', selectedColor === c.hex ? 'active' : '']"
              @click="onMardColorSelect(c)"
            >
              <view class="color-card-swatch" :style="{ backgroundColor: c.hex }"></view>
              <text class="color-card-code">{{ c.code }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ==================== 保存弹窗 ==================== -->
    <view v-if="showSaveModal" class="save-modal-overlay" @tap="showSaveModal = false">
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
          />
          <text class="save-section-label">一级标签</text>
          <scroll-view class="save-tag-scroll" scroll-x :show-scrollbar="false">
            <view class="save-tag-row">
              <view
                v-for="group in TAG_OPTIONS"
                :key="group.primary"
                :class="['save-tag-pill', saveTags.primary === group.primary ? 'active' : '']"
                @tap="toggleSavePrimaryTag(group.primary)"
              >
                <text>{{ group.primary }}</text>
              </view>
            </view>
          </scroll-view>
          <view v-if="saveSecondaryOptions.length" class="save-tag-wrap">
            <view
              v-for="item in saveSecondaryOptions"
              :key="item"
              :class="['save-tag-pill', saveTags.secondary === item ? 'active' : '']"
              @tap="saveTags.secondary = saveTags.secondary === item ? '' : item"
            >
              <text>{{ item }}</text>
            </view>
          </view>
          <text class="save-section-tip">标签非必填，保存后发布会直接复用。</text>
        </view>
        <view class="save-modal-footer">
          <view class="save-cancel-btn" @tap="showSaveModal = false">
            <text>取消</text>
          </view>
          <view class="save-only-btn" @tap="confirmSave">
            <text>保存</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ==================== 自定义尺寸弹窗 ==================== -->
    <view v-if="showCustomSizeModal" class="save-modal-overlay" @tap="showCustomSizeModal = false">
      <view class="save-modal" @tap.stop>
        <view class="save-modal-header">
          <text class="save-modal-title">自定义尺寸</text>
          <text class="save-modal-close" @tap="showCustomSizeModal = false">✕</text>
        </view>
        <view class="save-modal-body custom-size-body">
          <view class="custom-size-row">
            <text class="custom-size-label">宽度</text>
            <input
              class="custom-size-input"
              type="number"
              v-model="customWidth"
              placeholder="29-200"
            />
          </view>
          <view class="custom-size-row">
            <text class="custom-size-label">高度</text>
            <input
              class="custom-size-input"
              type="number"
              v-model="customHeight"
              placeholder="29-200"
            />
          </view>
        </view>
        <view class="save-modal-footer">
          <view class="save-cancel-btn" @tap="showCustomSizeModal = false">
            <text>取消</text>
          </view>
          <view class="save-only-btn" @tap="confirmCustomSize">
            <text>确定</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showColorEditModal && activeColorDetail" class="save-modal-overlay" @tap="closeColorDetail">
      <view class="save-modal color-edit-modal" @tap.stop>
        <view class="sheet-drag-handle"></view>
        <view class="save-modal-body">
          <view class="color-sheet-top">
            <view class="color-detail-card">
              <view class="color-detail-swatch" :style="{ backgroundColor: activeColorDetail.color }"></view>
              <view class="color-detail-meta">
                <text class="color-detail-code">色号 {{ activeColorDetail.code }}</text>
                <text class="color-detail-count">{{ activeColorDetail.count }} 颗</text>
              </view>
            </view>
            <view class="quick-action-row">
              <view class="quick-action-card" @tap="toggleHighlightColor">
                <view class="quick-action-icon">{{ highlightedColor === activeColorDetail.color ? '✦' : '◌' }}</view>
                <text class="quick-action-text">{{ highlightedColor === activeColorDetail.color ? '取消高亮' : '高亮显示' }}</text>
              </view>
              <view class="quick-action-card" @tap="toggleReplacePanel">
                <view class="quick-action-icon">↺</view>
                <text class="quick-action-text">颜色替换</text>
              </view>
            </view>
          </view>

          <view class="color-actions color-actions-dual">
            <view class="color-action-btn primary" @tap="mergeToNearestColor">
              <text>合并到相似色</text>
            </view>
            <view class="color-action-btn danger" @tap="deleteActiveColor">
              <text>删除当前色号</text>
            </view>
          </view>

          <view v-if="showReplacePanel" class="replace-panel">
            <text class="replace-title">替换为</text>
            <view class="replace-list">
              <view
                v-for="item in nearestColorOptions"
                :key="item.hex"
                class="replace-chip"
                @tap="replaceColor(activeColorDetail.color, item.hex)"
              >
                <view class="replace-swatch" :style="{ backgroundColor: item.hex }"></view>
                <text class="replace-code">{{ item.code }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, getCurrentInstance, toRaw, onUnmounted, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { consumeBlueprintData } from '@/utils/blueprint-transfer'
import { getHexByMardCode, getMardCodeByHex, mardColorPalette } from '@/utils/mard-colors'
import { TAG_OPTIONS, buildProjectThumbnail, normalizeProjectTags } from '@/utils/community'
import { downloadBlob, exportBlueprintAsBlob } from '@/utils/blueprint-export'
import { communityService, projectService } from '../../services/pin/index'

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
  folderId?: string
  tags?: { primary?: string; secondary?: string }
  isPublished?: boolean
  isOffShelf?: boolean
  publishedArtworkId?: string
  publishPoints?: number
}

/** 工具定义结构 */
interface ToolItem {
  id: string
  label: string
  icon: string
  activeIcon: string
}

/** 尺寸选项结构 */
interface SizeOption {
  label: string
  w: number
  h: number
  custom?: boolean
}

/** 豆子统计项 */
interface BeadStatItem {
  color: string
  code: string
  count: number
}

/** 豆子统计结果 */
interface BeadStats {
  totalTypes: number
  totalCount: number
  colorList: BeadStatItem[]
}

// ==================== 常量定义 ====================

/** 每个格子的像素大小 */
const cellSize = 20

/** 行标注宽度 */
const rowLabelWidth = 28

/** 缩放范围限制 */
const SCALE_MIN = 0.25
const SCALE_MAX = 5
const SCALE_STEP = 0.25

/** 侧边工具列表 */
const sideTools: ToolItem[] = [
  { id: 'pan', label: '拖动', icon: '/static/assets/v015/icons/move-muted.png', activeIcon: '/static/assets/v015/icons/move-active.png' },
  { id: 'draw', label: '画笔', icon: '/static/assets/v015/icons/brush-muted.png', activeIcon: '/static/assets/v015/icons/brush-active.png' },
  { id: 'picker', label: '吸色', icon: '/static/assets/v015/icons/eyedropper-muted.png', activeIcon: '/static/assets/v015/icons/eyedropper-active.png' },
  { id: 'fill', label: '填充', icon: '/static/assets/v015/icons/fill-muted.png', activeIcon: '/static/assets/v015/icons/fill-active.png' },
  { id: 'erase', label: '擦除', icon: '/static/assets/v015/icons/eraser-muted.png', activeIcon: '/static/assets/v015/icons/eraser-active.png' },
  { id: 'color', label: '色卡', icon: '/static/assets/v015/icons/palette-muted.png', activeIcon: '/static/assets/v015/icons/palette-active.png' },
]

/** 预设尺寸选项 */
const sizeOptions: SizeOption[] = [
  { label: '自定义', w: 0, h: 0, custom: true },
  { label: '32 x 32', w: 32, h: 32 },
  { label: '52 x 52', w: 52, h: 52 },
  { label: '64 x 64', w: 64, h: 64 },
  { label: '84 x 84', w: 84, h: 84 },
  { label: '104 x 104', w: 104, h: 104 },
  { label: '156 x 156', w: 156, h: 156 },
  { label: '200 x 200', w: 200, h: 200 },
]

/** MARD 色卡系列列表 */
const colorSeries = [
  { key: 'all', label: '全部' },
  { key: 'A', label: 'A系列' },
  { key: 'B', label: 'B系列' },
  { key: 'C', label: 'C系列' },
  { key: 'D', label: 'D系列' },
  { key: 'E', label: 'E系列' },
  { key: 'F', label: 'F系列' },
  { key: 'G', label: 'G系列' },
  { key: 'H', label: 'H系列' },
  { key: 'M', label: 'M系列' },
]

// ==================== 状态定义 ====================

/** 画布数据 */
const canvasData = reactive<CanvasData>({
  width: 29,
  height: 29,
  backgroundColor: '#FFFFFF',
  showGrid: true,
  gridColor: '#CCCCCC',
  beads: [] as Bead[],
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

/** 当前选中的颜色 */
const selectedColor = ref(getHexByMardCode('A01') || '#FAF4C8')

/** 当前激活的工具 */
const activeTool = ref('pan')

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

/** 编辑模式标志 */
const isEditMode = ref(false)
const editingProjectId = ref('')
const editingProjectName = ref('')
const editingFolderId = ref('')
const editingProjectTags = ref<{ primary?: string; secondary?: string }>({})
const editingPublishPoints = ref(0)
const editingPublishedArtworkId = ref('')
const editingPublished = ref(false)

/** 画布是否有未保存的修改 */
const hasUnsavedChanges = ref(false)
let changeRevision = 0
let savedRevision = 0

/** 保存弹窗状态 */
const showSaveModal = ref(false)
const saveName = ref('')
const saveNamePlaceholder = ref('我的拼豆作品')
const saveTags = ref<{ primary?: string; secondary?: string }>({})

/** 自定义尺寸弹窗状态 */
const showCustomSizeModal = ref(false)
const customWidth = ref('29')
const customHeight = ref('29')

/** 页面路由参数初始化标记 */
let hasInitializedFromRoute = false
const initialFolderId = ref('')
const autoExportAfterLoad = ref(false)

/** 豆子样式：方豆/圆豆 */
const beadStyle = ref<'square' | 'round'>('square')

/** 是否显示色号 */
const showColorCode = ref(false)

/** 选中的格子坐标（拖动工具下） */
const selectedCell = ref<{ x: number; y: number } | null>(null)

/** 颜色选择面板 */
const showColorPanel = ref(false)
const selectedSeries = ref('all')

/** 当前激活的底部Tab */
const activeTab = ref('size')
const highlightedColor = ref('')
const showColorEditModal = ref(false)
const activeColorDetail = ref<BeadStatItem | null>(null)
const showReplacePanel = ref(false)

/** PC端空格键按下标记 */
const spacePressed = ref(false)
/** 空格键按下前的工具 */
let toolBeforeSpace = 'pan'

/** requestAnimationFrame 节流标记 */
let rafId: number | null = null

/** 上次触摸处理时间（用于节流） */
let lastTouchTime = 0
const TOUCH_THROTTLE_MS = 16

/** 画布容器的位置缓存 */
let containerRectCache: { left: number; top: number } | null = null

/** 组件实例 */
const instance = getCurrentInstance()

// ==================== 计算属性 ====================

/** 画布总宽度（像素） */
const canvasWidth = computed(() => canvasData.width * cellSize)

/** 画布总高度（像素） */
const canvasHeight = computed(() => canvasData.height * cellSize)

/** 根据系列筛选后的 MARD 色卡列表 */
const filteredMardColors = computed(() => {
  if (selectedSeries.value === 'all') {
    return mardColorPalette
  }
  return mardColorPalette.filter(c => c.code.startsWith(selectedSeries.value))
})

/** 豆子统计信息 */
const beadStats = computed<BeadStats>(() => {
  const colorCount: Record<string, number> = {}
  const colorCodeMap: Record<string, string> = {}

  canvasData.beads.forEach((b: Bead) => {
    if (b.color) {
      colorCount[b.color] = (colorCount[b.color] || 0) + 1
      if (!(b.color in colorCodeMap)) {
        const mardCode = getMardCodeByHex(b.color)
        colorCodeMap[b.color] = mardCode || b.color.slice(1, 4).toUpperCase()
      }
    }
  })

  const colorList: BeadStatItem[] = Object.entries(colorCount)
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({
      color,
      code: colorCodeMap[color],
      count,
    }))

  return {
    totalTypes: colorList.length,
    totalCount: canvasData.beads.length,
    colorList,
  }
})

const nearestColorOptions = computed(() => {
  if (!activeColorDetail.value) return []
  const source = activeColorDetail.value.color
  const sr = parseInt(source.slice(1, 3), 16)
  const sg = parseInt(source.slice(3, 5), 16)
  const sb = parseInt(source.slice(5, 7), 16)

  return mardColorPalette
    .filter((item) => item.hex !== source)
    .map((item) => {
      const tr = parseInt(item.hex.slice(1, 3), 16)
      const tg = parseInt(item.hex.slice(3, 5), 16)
      const tb = parseInt(item.hex.slice(5, 7), 16)
      return {
        ...item,
        distance: Math.sqrt((sr - tr) ** 2 + (sg - tg) ** 2 + (sb - tb) ** 2),
      }
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 12)
})

const saveSecondaryOptions = computed(() => {
  const group = TAG_OPTIONS.find((item) => item.primary === saveTags.value.primary)
  return group ? [...group.secondary] : []
})

const gridLayerStyle = computed(() => ({
  width: `${canvasWidth.value}px`,
  height: `${canvasHeight.value}px`,
  backgroundImage: `
    linear-gradient(to right, rgba(35, 31, 26, 0.12) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(35, 31, 26, 0.12) 1px, transparent 1px)
  `,
  backgroundSize: `${cellSize}px ${cellSize}px`,
}))

interface GridLine {
  index: number
  isDashed: boolean
}

const majorHorizontalLines = computed<GridLine[]>(() => {
  const lines: GridLine[] = []
  for (let row = 5; row < canvasData.height; row += 5) {
    // 10的倍数用虚线，其他5的倍数用实线
    const isDashed = row % 10 === 0
    lines.push({ index: row, isDashed })
  }
  return lines
})

const majorVerticalLines = computed<GridLine[]>(() => {
  const lines: GridLine[] = []
  for (let col = 5; col < canvasData.width; col += 5) {
    // 10的倍数用虚线，其他5的倍数用实线
    const isDashed = col % 10 === 0
    lines.push({ index: col, isDashed })
  }
  return lines
})

watch([beadStyle, showColorCode], ([nextStyle, nextCode], [prevStyle, prevCode]) => {
  if (prevStyle === undefined && prevCode === undefined) return
  if (nextStyle !== prevStyle || nextCode !== prevCode) {
    changeRevision += 1
    hasUnsavedChanges.value = changeRevision !== savedRevision
  }
})

// ==================== 生命周期 ====================

onLoad((options) => {
  initializeFromRouteOptions(options || {})
})

/**
 * 根据路由参数初始化编辑器数据。
 * H5 下 getCurrentPages() 的 options 在 onMounted 时可能尚未稳定，因此优先使用 uni-app onLoad 参数。
 */
const initializeFromRouteOptions = (options: Record<string, any>) => {
  if (hasInitializedFromRoute) return
  hasInitializedFromRoute = true
  initialFolderId.value = String(options.folderId || '')
  autoExportAfterLoad.value = options.autoExport === '1'

  if (options.mode === 'edit' && options.projectId) {
    /** 编辑已有项目：从本地存储加载 */
    console.log('开始加载项目:', options.projectId)
    void loadProject(options.projectId)
    console.log('loadProject 执行完成，beads数量:', canvasData.beads.length)
  } else if (options.mode === 'create' && options.data) {
    /** 新建项目：从 URL 参数解析画布数据 */
    try {
      const data = JSON.parse(decodeURIComponent(options.data)) as CanvasData
      Object.assign(canvasData, {
        ...data,
        beads: data.beads || [],
        updatedAt: Date.now(),
      })
    } catch (e) {
      console.error('解析画布数据失败:', e)
    }
  } else if (options.mode === 'blueprint') {
    /** 从图片导入生成图纸 */
    try {
      const data = consumeBlueprintData()
      if (data) {
        canvasData.width = data.width || 29
        canvasData.height = data.height || 29
        canvasData.backgroundColor = data.backgroundColor || '#FFFFFF'
        canvasData.showGrid = data.showGrid !== undefined ? data.showGrid : true
        canvasData.gridColor = data.gridColor || '#CCCCCC'
        canvasData.createdAt = data.createdAt || Date.now()
        canvasData.updatedAt = Date.now()
        canvasData.beads = data.beads || []
        changeRevision = 0
        savedRevision = 0
        markSavedRevision()
      } else {
        console.warn('[蓝图] 共享模块无数据，尝试 localStorage')
        if (options.key) {
          const rawData = uni.getStorageSync(options.key)
          if (rawData) {
            uni.removeStorageSync(options.key)
            const data2 = JSON.parse(rawData)
            canvasData.width = data2.width || 29
            canvasData.height = data2.height || 29
            canvasData.backgroundColor = data2.backgroundColor || '#FFFFFF'
            canvasData.showGrid = data2.showGrid !== undefined ? data2.showGrid : true
            canvasData.gridColor = data2.gridColor || '#CCCCCC'
            canvasData.beads = data2.beads || []
            canvasData.createdAt = data2.createdAt || Date.now()
            canvasData.updatedAt = Date.now()
          }
        }
      }
    } catch (e) {
      console.error('[蓝图] 数据加载失败:', e)
    }
  }

  syncCustomSizeFields()
}

onMounted(() => {
  if (!hasInitializedFromRoute) {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1] as any
    initializeFromRouteOptions(currentPage?.options || {})
  }

  /** 保存初始状态到历史 */
  nextTick(() => {
    if (isEditMode.value) {
      history.value = []
      historyIndex.value = -1
    }
    saveHistory()
    if (autoExportAfterLoad.value) {
      setTimeout(() => {
        handleExport()
      }, 150)
    }
    console.log('初始化完成，beads数量:', canvasData.beads.length)
  })

  /** PC端键盘事件监听 */
  // #ifdef H5
  setupPcKeyboardEvents()
  // #endif
})

onUnmounted(() => {
  /** 清理PC端键盘事件 */
  // #ifdef H5
  cleanupPcKeyboardEvents()
  // #endif
})

// ==================== PC端键盘事件 ====================

/**
 * 设置PC端键盘事件监听
 * - 空格按住临时进入拖动模式
 * - 鼠标滚轮缩放
 */
const setupPcKeyboardEvents = () => {
  // #ifdef H5
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  // 获取画布区域DOM元素，监听滚轮
  nextTick(() => {
    const canvasArea = document.querySelector('.canvas-area')
    if (canvasArea) {
      canvasArea.addEventListener('wheel', onWheel, { passive: false })
    }
  })
  // #endif
}

/**
 * 清理PC端键盘事件监听
 */
const cleanupPcKeyboardEvents = () => {
  // #ifdef H5
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  const canvasArea = document.querySelector('.canvas-area')
  if (canvasArea) {
    canvasArea.removeEventListener('wheel', onWheel)
  }
  // #endif
}

/**
 * 键盘按下事件处理
 * @param e - 键盘事件
 */
const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space' && !spacePressed.value) {
    e.preventDefault()
    spacePressed.value = true
    toolBeforeSpace = activeTool.value
    activeTool.value = 'pan'
  }
}

/**
 * 键盘松开事件处理
 */
const onKeyUp = (e: KeyboardEvent) => {
  if (e.code === 'Space' && spacePressed.value) {
    spacePressed.value = false
    activeTool.value = toolBeforeSpace
  }
}

/**
 * 鼠标滚轮缩放事件处理
 * @param e - 滚轮事件
 */
const onWheel = (e: WheelEvent) => {
  e.preventDefault()
  if (e.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

// ==================== 项目加载 ====================

/**
 * 从本地存储加载已有项目
 * @param projectId - 项目 ID
 */
const loadProject = async (projectId: string) => {
  const project = await projectService.getProjectById(projectId)

  if (project) {
    isEditMode.value = true
    editingProjectId.value = project.id
    editingProjectName.value = project.name
    editingFolderId.value = project.folderId || ''
    editingProjectTags.value = normalizeProjectTags(project.tags)
    editingPublishPoints.value = Number(project.publishPoints || 0)
    editingPublishedArtworkId.value = project.publishedArtworkId || ''
    editingPublished.value = !!project.isPublished
    saveTags.value = { ...editingProjectTags.value }

    /** 深拷贝存储的项目数据 */
    const clonedData = JSON.parse(JSON.stringify(project.canvasData)) as CanvasData

    /** 逐个属性赋值，确保响应式更新 */
    canvasData.width = clonedData.width || 29
    canvasData.height = clonedData.height || 29
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

    /** 兼容旧数据：加载 beadStyle 和 showColorCode */
    if ((clonedData as any).beadStyle) {
      beadStyle.value = (clonedData as any).beadStyle
    }
    if ((clonedData as any).showColorCode !== undefined) {
      showColorCode.value = (clonedData as any).showColorCode
    }

    changeRevision = 0
    savedRevision = 0
    markSavedRevision()
  } else {
    uni.showToast({ title: '项目不存在', icon: 'none' })
  }
}

const toggleSavePrimaryTag = (primary: string) => {
  saveTags.value = {
    primary: saveTags.value.primary === primary ? '' : primary,
    secondary: '',
  }
}

const getGridPosition = (localX: number, localY: number) => {
  const scaledCellSize = cellSize * scale.value
  const gridX = Math.floor(localX / scaledCellSize)
  const gridY = Math.floor(localY / scaledCellSize)
  return { gridX, gridY }
}

// ==================== 工具栏操作 ====================

/**
 * 侧边工具点击处理
 * - 颜色工具：弹出颜色选择面板
 * - 其他工具：切换工具模式
 * @param toolId - 工具 ID
 */
const onToolClick = (toolId: string) => {
  if (toolId === 'color') {
    showColorPanel.value = true
    return
  }
  activeTool.value = toolId
  selectedCell.value = null
}

/**
 * MARD色卡颜色选择
 * @param color - MARD颜色对象
 */
const onMardColorSelect = (color: { hex: string; code: string }) => {
  selectedColor.value = color.hex
  showColorPanel.value = false
  /** 自动切回画笔工具 */
  activeTool.value = 'draw'
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
 * 触摸移动事件处理
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

  /** 时间节流 */
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

// ==================== PC端鼠标事件 ====================

/** 鼠标是否按下 */
const isMouseDown = ref(false)

/** 鼠标按下起始位置（用于拖动） */
const mouseStartX = ref(0)
const mouseStartY = ref(0)
const mouseStartOffsetX = ref(0)
const mouseStartOffsetY = ref(0)

/**
 * 鼠标按下事件处理（PC端）
 * @param e - 鼠标事件
 */
const onMouseDown = (e: MouseEvent) => {
  isMouseDown.value = true

  /** 拖动工具：记录起始位置 */
  if (activeTool.value === 'pan') {
    isPanning.value = true
    mouseStartX.value = e.clientX
    mouseStartY.value = e.clientY
    mouseStartOffsetX.value = offsetX.value
    mouseStartOffsetY.value = offsetY.value
    return
  }

  /** 填充工具：仅触发一次 */
  if (activeTool.value === 'fill') {
    handleMouseClick(e)
    saveHistory()
    return
  }

  /** 绘制/橡皮/取色工具 */
  handleMouseClick(e)
}

/**
 * 鼠标移动事件处理（PC端）
 * @param e - 鼠标事件
 */
const onMouseMove = (e: MouseEvent) => {
  if (!isMouseDown.value) return

  /** 拖动工具：平移画布 */
  if (isPanning.value && activeTool.value === 'pan') {
    const dx = (e.clientX - mouseStartX.value) / scale.value
    const dy = (e.clientY - mouseStartY.value) / scale.value
    offsetX.value = mouseStartOffsetX.value + dx
    offsetY.value = mouseStartOffsetY.value + dy
    return
  }

  /** 填充工具在 move 时不重复触发 */
  if (activeTool.value === 'fill') return

  /** 时间节流 */
  const now = Date.now()
  if (now - lastTouchTime < TOUCH_THROTTLE_MS) return
  lastTouchTime = now

  /** 绘制/橡皮/取色工具 */
  handleMouseClick(e)
}

/**
 * 鼠标释放事件处理（PC端）
 * @param _e - 鼠标事件
 */
const onMouseUp = (_e: MouseEvent) => {
  if (isMouseDown.value && activeTool.value !== 'pan') {
    saveHistory()
  }
  isMouseDown.value = false
  isPanning.value = false
  previewBead.visible = false
  containerRectCache = null
}

/**
 * 处理鼠标点击逻辑（PC端）
 * @param e - 鼠标事件
 */
const handleMouseClick = async (e: MouseEvent) => {
  const rect = await getContainerRect()
  if (!rect) return

  /** 计算格子坐标 */
  const localX = e.clientX - rect.left
  const localY = e.clientY - rect.top
  const { gridX, gridY } = getGridPosition(localX, localY)

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
    case 'pan':
      selectedCell.value = { x: gridX, y: gridY }
      break
    default:
      break
  }
}

/**
 * 获取画布容器的位置信息
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
 * @param e - 触摸事件
 */
const handleTouch = async (e: TouchEvent) => {
  const touch = e.touches[0]
  if (!touch) return

  const rect = await getContainerRect()
  if (!rect) return

  /**
   * 计算格子坐标
   * 注意：rect 是 canvas-container 在屏幕上的位置（已受 transform 影响）
   * touch.clientX/clientY 也是屏幕坐标
   * 所以直接相减即可得到相对于画布左上角的像素坐标
   */
  const localX = touch.clientX - rect.left
  const localY = touch.clientY - rect.top
  const { gridX, gridY } = getGridPosition(localX, localY)

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
    case 'pan':
      /** 拖动工具下点击选中格子 */
      selectedCell.value = { x: gridX, y: gridY }
      break
    default:
      break
  }
}

// ==================== 画布操作 ====================

/**
 * 放置拼豆到指定位置
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
 * 填充区域（BFS 洪水填充算法）
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

// ==================== 历史记录 ====================

/**
 * 保存当前拼豆状态到历史记录
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

  changeRevision += 1
  hasUnsavedChanges.value = changeRevision !== savedRevision
  canvasData.updatedAt = Date.now()
}

/**
 * 撤销操作：恢复到上一个历史状态
 */
const undo = () => {
  if (historyIndex.value > 0) {
    historyIndex.value--
    const beads = JSON.parse(JSON.stringify(history.value[historyIndex.value])) as Bead[]
    canvasData.beads.splice(0, canvasData.beads.length, ...beads)
    changeRevision += 1
    hasUnsavedChanges.value = changeRevision !== savedRevision
  }
}

/**
 * 重做操作：恢复到下一个历史状态
 */
const redo = () => {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    const beads = JSON.parse(JSON.stringify(history.value[historyIndex.value])) as Bead[]
    canvasData.beads.splice(0, canvasData.beads.length, ...beads)
    changeRevision += 1
    hasUnsavedChanges.value = changeRevision !== savedRevision
  }
}

const markSavedRevision = () => {
  savedRevision = changeRevision
  hasUnsavedChanges.value = false
}

// ==================== 画布控制 ====================

/**
 * 清空画布（需用户确认）
 */
const clearCanvas = () => {
  if (canvasData.beads.length === 0) return
  uni.showModal({
    title: '确认全删除',
    content: '确定要删除全部拼豆内容吗？此操作不可撤销。',
    confirmColor: '#FF3B30',
    success: (res) => {
      if (res.confirm) {
        canvasData.beads.splice(0, canvasData.beads.length)
        history.value = []
        historyIndex.value = -1
        selectedCell.value = null
        changeRevision += 1
        hasUnsavedChanges.value = changeRevision !== savedRevision
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
  changeRevision += 1
  hasUnsavedChanges.value = changeRevision !== savedRevision
}

// ==================== 编辑操作（翻转/旋转/尺寸） ====================

/**
 * 水平翻转画布内容
 * 将每个拼豆的 x 坐标映射为 (width - 1 - x)
 */
const flipHorizontal = () => {
  if (canvasData.beads.length === 0) {
    uni.showToast({ title: '画布为空', icon: 'none' })
    return
  }
  canvasData.beads.forEach((bead) => {
    bead.x = canvasData.width - 1 - bead.x
  })
  saveHistory()
  uni.showToast({ title: '已水平翻转', icon: 'success' })
}

/**
 * 垂直翻转画布内容
 * 将每个拼豆的 y 坐标映射为 (height - 1 - y)
 */
const flipVertical = () => {
  if (canvasData.beads.length === 0) {
    uni.showToast({ title: '画布为空', icon: 'none' })
    return
  }
  canvasData.beads.forEach((bead) => {
    bead.y = canvasData.height - 1 - bead.y
  })
  saveHistory()
  uni.showToast({ title: '已垂直翻转', icon: 'success' })
}

/**
 * 旋转90度（顺时针）
 * 注意：非正方形画布时宽高互换
 * 新坐标：newX = height - 1 - oldY, newY = oldX
 */
const rotate90 = () => {
  if (canvasData.beads.length === 0) {
    uni.showToast({ title: '画布为空', icon: 'none' })
    return
  }
  const oldWidth = canvasData.width
  const oldHeight = canvasData.height

  canvasData.beads.forEach((bead) => {
    const newX = oldHeight - 1 - bead.y
    const newY = bead.x
    bead.x = newX
    bead.y = newY
  })

  /** 互换宽高 */
  canvasData.width = oldHeight
  canvasData.height = oldWidth

  saveHistory()
  uni.showToast({ title: '已旋转90°', icon: 'success' })
}

/**
 * 尺寸选项点击处理
 * - 自定义：弹出输入弹窗
 * - 预设尺寸：有内容时弹窗确认
 * @param opt - 尺寸选项
 */
const onSizeOptionClick = (opt: SizeOption) => {
  if (opt.custom) {
    /** 自定义尺寸：弹出输入弹窗 */
    customWidth.value = String(canvasData.width)
    customHeight.value = String(canvasData.height)
    showCustomSizeModal.value = true
    return
  }

  /** 如果已经是当前尺寸，无需操作 */
  if (canvasData.width === opt.w && canvasData.height === opt.h) return

  /** 有内容时弹窗确认 */
  if (canvasData.beads.length > 0) {
    uni.showModal({
      title: '确认切换尺寸',
      content: '切换尺寸将清空当前画布内容，确定继续吗？',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          resizeCanvas(opt.w, opt.h, true)
        }
      },
    })
  } else {
    resizeCanvas(opt.w, opt.h)
  }
}

/**
 * 判断尺寸按钮是否为当前选中状态。
 * 非预设尺寸归为“自定义”，避免从 30x30 等入口进入时错误高亮 29x29。
 */
const isSizeOptionActive = (opt: SizeOption) => {
  if (opt.custom) {
    return !sizeOptions.some((item) => !item.custom && item.w === canvasData.width && item.h === canvasData.height)
  }

  return canvasData.width === opt.w && canvasData.height === opt.h
}

/**
 * 同步自定义尺寸输入框。
 */
const syncCustomSizeFields = () => {
  customWidth.value = String(canvasData.width)
  customHeight.value = String(canvasData.height)
}

/**
 * 确认自定义尺寸
 */
const confirmCustomSize = () => {
  const w = parseInt(customWidth.value)
  const h = parseInt(customHeight.value)

  if (isNaN(w) || isNaN(h) || w < 1 || h < 1 || w > 200 || h > 200) {
    uni.showToast({ title: '请输入1-200之间的数字', icon: 'none' })
    return
  }

  showCustomSizeModal.value = false

  /** 有内容时弹窗确认 */
  if (canvasData.beads.length > 0 && (w !== canvasData.width || h !== canvasData.height)) {
    uni.showModal({
      title: '确认切换尺寸',
      content: '切换尺寸将清空当前画布内容，确定继续吗？',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          resizeCanvas(w, h, true)
        }
      },
    })
  } else {
    resizeCanvas(w, h)
  }
}

/**
 * 调整画布尺寸
 * - 按 V0.1.4 需求，已有内容时确认后清空画布再切换尺寸
 * @param w - 新宽度
 * @param h - 新高度
 */
const resizeCanvas = (w: number, h: number, clearContent = false) => {
  canvasData.width = w
  canvasData.height = h
  syncCustomSizeFields()

  if (clearContent) {
    canvasData.beads.splice(0, canvasData.beads.length)
    selectedCell.value = null
  } else {
    /** 无内容或兼容路径：保留范围内拼豆 */
    canvasData.beads = canvasData.beads.filter(
      (bead) => bead.x >= 0 && bead.x < w && bead.y >= 0 && bead.y < h
    )
  }

  saveHistory()
  resetView()
  uni.showToast({ title: `尺寸已调整为 ${w} x ${h}`, icon: 'success' })
}

// ==================== 颜色文字适配 ====================

/**
 * 根据背景颜色亮度返回适配的文字颜色
 * @param hex - HEX 颜色值
 * @returns 深色或浅色文字颜色
 */
const getTextColor = (hex: string): string => {
  const color = hex.replace('#', '')
  const r = parseInt(color.substr(0, 2), 16)
  const g = parseInt(color.substr(2, 2), 16)
  const b = parseInt(color.substr(4, 2), 16)
  const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255
  return luminance > 0.5 ? '#333333' : '#FFFFFF'
}

const openColorDetail = (item: BeadStatItem) => {
  activeColorDetail.value = item
  showReplacePanel.value = false
  showColorEditModal.value = true
}

const closeColorDetail = () => {
  showColorEditModal.value = false
  showReplacePanel.value = false
  activeColorDetail.value = null
}

const toggleReplacePanel = () => {
  showReplacePanel.value = !showReplacePanel.value
}

const toggleHighlightColor = () => {
  if (!activeColorDetail.value) return
  highlightedColor.value = highlightedColor.value === activeColorDetail.value.color ? '' : activeColorDetail.value.color
}

const replaceColor = (sourceColor: string, targetColor: string) => {
  if (!sourceColor || !targetColor || sourceColor === targetColor) return
  canvasData.beads.forEach((bead) => {
    if (bead.color === sourceColor) bead.color = targetColor
  })
  saveHistory()
  if (activeColorDetail.value) {
    activeColorDetail.value = {
      color: targetColor,
      code: getMardCodeByHex(targetColor) || activeColorDetail.value.code,
      count: activeColorDetail.value.count,
    }
  }
  highlightedColor.value = targetColor
  showReplacePanel.value = false
  uni.showToast({ title: '颜色已替换', icon: 'success' })
}

const mergeToNearestColor = () => {
  if (!activeColorDetail.value || nearestColorOptions.value.length === 0) return
  replaceColor(activeColorDetail.value.color, nearestColorOptions.value[0].hex)
}

const deleteActiveColor = () => {
  if (!activeColorDetail.value) return
  const sourceColor = activeColorDetail.value.color
  canvasData.beads = canvasData.beads.filter((bead) => bead.color !== sourceColor)
  saveHistory()
  if (highlightedColor.value === sourceColor) {
    highlightedColor.value = ''
  }
  closeColorDetail()
  uni.showToast({ title: '当前色号已删除', icon: 'success' })
}

// ==================== 导航与保存 ====================

/**
 * 返回上一页
 * - 如果画布有未保存的修改，提示用户确认
 */
const goBack = () => {
  const hasChanges = hasUnsavedChanges.value || changeRevision !== savedRevision

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
 * 打开保存弹窗
 */
const saveCanvas = () => {
  const fallbackName = editingProjectName.value || saveName.value.trim()
  if (isEditMode.value && fallbackName) {
    doSave(fallbackName)
    return
  }

  saveName.value = fallbackName
  saveNamePlaceholder.value = fallbackName || '我的拼豆作品'
  saveTags.value = { ...normalizeProjectTags(editingProjectTags.value) }
  showSaveModal.value = true
}

/**
 * 确认保存
 */
const confirmSave = () => {
  const name = saveName.value.trim() || '未命名作品'
  editingProjectTags.value = normalizeProjectTags(saveTags.value)
  showSaveModal.value = false
  doSave(name)
}

/**
 * 导出按钮点击处理
 * - 先保存，再导出图纸图片
 */
const handleExport = () => {
  const name = editingProjectName.value || saveName.value.trim()
  if (!name) {
    saveName.value = ''
    saveNamePlaceholder.value = '我的拼豆作品'
    saveTags.value = { ...normalizeProjectTags(editingProjectTags.value) }
    showSaveModal.value = true
    return
  }
  doSave(name, true)
}

/**
 * 执行保存操作
 * @param projectName - 项目名称
 * @param exportAfterSave - 保存后是否导出图纸
 */
const doSave = async (projectName: string, exportAfterSave = false) => {

  try {
    /** 步骤1：生成缩略图 */
    const normalizedTags = normalizeProjectTags(editingProjectTags.value)

    /** 步骤2：深拷贝画布数据 */
    const clonedCanvasData = JSON.parse(JSON.stringify(toRaw(canvasData))) as CanvasData
    /** 附加新字段到克隆数据 */
    ;(clonedCanvasData as any).beadStyle = beadStyle.value
    ;(clonedCanvasData as any).showColorCode = showColorCode.value
    clonedCanvasData.updatedAt = Date.now()

    /** 步骤3：读取已有项目列表 */
    const projects: ProjectData[] = await projectService.getProjects()

    /** 步骤4：更新或创建项目 */
    if (isEditMode.value && editingProjectId.value) {
      const index = projects.findIndex((p) => p.id === editingProjectId.value)
      if (index >= 0) {
        projects[index].name = projectName
        projects[index].canvasData = clonedCanvasData
        projects[index].updatedAt = Date.now()
        projects[index].thumbnail = buildProjectThumbnail(clonedCanvasData)
        projects[index].folderId = editingFolderId.value
        projects[index].tags = normalizedTags
        projects[index].isPublished = editingPublished.value
        projects[index].isOffShelf = false
        projects[index].publishedArtworkId = editingPublishedArtworkId.value
        projects[index].publishPoints = editingPublishPoints.value
      }
    } else {
      const projectData: ProjectData = {
        id: 'project_' + Date.now(),
        name: projectName,
        canvasData: clonedCanvasData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        thumbnail: buildProjectThumbnail(clonedCanvasData),
        folderId: initialFolderId.value,
        tags: normalizedTags,
        isPublished: false,
        isOffShelf: false,
        publishedArtworkId: '',
        publishPoints: 0,
      }
      projects.unshift(projectData)
      isEditMode.value = true
      editingProjectId.value = projectData.id
      editingFolderId.value = projectData.folderId || ''
      editingPublished.value = false
      editingPublishedArtworkId.value = ''
      editingPublishPoints.value = 0
    }

    editingProjectName.value = projectName
    editingProjectTags.value = normalizedTags
    saveName.value = projectName

    /** 步骤5：写入 localStorage */
    await projectService.saveProjects(projects)
    const savedProject = projects.find((item) => item.id === editingProjectId.value)
    if (savedProject?.isPublished) {
      await communityService.syncProjectArtwork(savedProject as any)
    }
    markSavedRevision()
    uni.showToast({ title: '保存成功', icon: 'success' })

    /** 步骤6：跳转（导出在 try-catch 外部处理） */
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
          },
        })
      }, 800)
    }

    if (exportAfterSave) {
      setTimeout(() => {
        try {
          exportBlueprintImage(projectName)
        } catch (e) {
          console.error('[导出] 导出失败:', e)
          uni.showToast({ title: '导出失败，但已保存', icon: 'none' })
        }
      }, 300)
    } else {
      navigateToProject()
    }
  } catch (e) {
    console.error('[保存] doSave 发生异常:', e)
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}

// ==================== 导出图纸 ====================

/**
 * 导出拼豆图纸为图片（带用料清单和水印）
 * 根据 beadStyle 调整拼豆绘制样式
 * @param projectName - 项目名称
 */
const exportBlueprintImage = async (projectName: string) => {
  // #ifdef H5
  const creatorName = await projectService.getProjectOwnerName()
  exportBlueprintAsBlob({
    projectId: editingProjectId.value || `draft_${Date.now()}`,
    name: projectName,
    creatorName,
    updatedAt: Date.now(),
    canvasData: {
      ...JSON.parse(JSON.stringify(toRaw(canvasData))),
      beadStyle: beadStyle.value,
      showColorCode: true,
    },
  }).then(({ blob, fileName }) => {
    downloadBlob(blob, fileName)
    uni.showToast({ title: '导出成功', icon: 'success' })
  }).catch((error) => {
    console.error('[导出] 下载失败:', error)
    uni.showToast({ title: '导出失败', icon: 'none' })
  })
  // #endif

  // #ifndef H5
  uni.showToast({ title: '导出功能仅支持H5端', icon: 'none' })
  // #endif
}
</script>

<style scoped>
/* ==================== 页面整体布局 ====================
 * 使用 CSS 变量实现深色主题支持
 * 背景色：var(--color-bg-page) - 页面主背景
 */
.canvas-editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #FBFAF7;
  overflow: hidden;
}

/* ==================== 顶部导航 ====================
 * 背景色：var(--color-bg-panel) - 面板背景
 * 边框色：var(--color-border) - 分隔线
 * 主文字：var(--color-text-primary) - 标题等重要文字
 * 次文字：var(--color-text-tertiary) - 辅助文字
 */
.editor-nav {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: calc(88rpx + var(--status-bar-height, 44px));
  padding: 0 18rpx;
  padding-top: calc(var(--status-bar-height, 44px) + 8px);
  padding-bottom: 8px;
  background-color: var(--color-bg-panel, #FFFFFF);
  border-bottom: 1px solid var(--color-border-light, #E8E8E8);
  position: relative;
  z-index: 100;
  flex-shrink: 0;
}

.nav-left {
  width: 60rpx;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.nav-back-icon {
  width: 40rpx;
  height: 40rpx;
  padding: 8rpx;
  display: block;
}

.nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary, #333333);
  max-width: 220rpx;
  text-align: center;
  white-space: nowrap;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-left: auto;
  position: relative;
  z-index: 1;
}

.nav-btn {
  padding: 6rpx 14rpx;
  border-radius: 14rpx;
  background-color: var(--color-bg-panel, #F5F5F5);
  border: 2rpx solid var(--color-text-primary);
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn-export {
  background-color: var(--color-primary);
  border-color: var(--color-text-primary);
}

.nav-btn-text {
  font-size: 23rpx;
  color: var(--color-text-primary, #333333);
  font-weight: 500;
}

.nav-btn-export .nav-btn-text {
  color: var(--color-text-primary);
}

/* ==================== 主体区域（侧边栏 + 画布） ==================== */
.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* ==================== 侧边工具栏 ====================
 * 背景色：var(--color-bg-panel) - 面板背景
 * 边框色：var(--color-border) - 分隔线
 * 悬停色：var(--color-bg-hover) - 悬停状态
 * 激活色：var(--color-primary-light) - 选中状态背景
 */
.sidebar-tools {
  width: 56px;
  background-color: var(--color-bg-panel, #FFFFFF);
  border: 2px solid var(--color-text-primary);
  border-radius: 999px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 4px;
  flex-shrink: 0;
  z-index: 10;
  margin: 14px 0 14px 8px;
  box-shadow: var(--shadow-lg);
}

.sidebar-tool-item {
  width: 46px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.15s;
}

.sidebar-tool-item:hover {
  background-color: var(--color-bg-hover, #F5F5F5);
}

.sidebar-tool-item.active {
  background-color: var(--color-primary, #FFF5E0);
  box-shadow: 0 10px 22px rgba(247, 183, 51, .24);
}

.sidebar-tool-item.active .sidebar-tool-label {
  color: var(--color-text-primary, #231F1A);
  font-weight: 600;
}

.sidebar-tool-icon {
  width: 18px;
  height: 18px;
  display: block;
}

.sidebar-tool-label {
  font-size: 9px;
  line-height: 1;
  color: var(--color-text-tertiary, #999999);
}

.sidebar-color-dot {
  position: absolute;
  right: 5px;
  top: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid var(--color-bg-panel, #FFFFFF);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
}

/* ==================== 画布区域 ==================== */
.canvas-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background:
    radial-gradient(circle, rgba(35,31,26,.08) 1px, transparent 1px),
    #FBFAF7;
  background-size: 48rpx 48rpx;
}

.canvas-transform-wrapper {
  transform-origin: center center;
}

/* 列标注（顶部数字）
 * 文字色：var(--color-text-tertiary) - 辅助文字
 */
.col-labels {
  display: flex;
  box-sizing: border-box;
}

.col-label {
  font-size: 10px;
  color: #9A6A31;
  text-align: center;
  flex-shrink: 0;
  line-height: 20px;
  background: rgba(250, 244, 200, 0.92);
  border-radius: 6px 6px 0 0;
  font-weight: 600;
}

.col-label.emphasis {
  color: #8D5113;
  background: rgba(245, 209, 130, 0.95);
}

/* 行标注和画布容器 */
.canvas-with-row-labels {
  display: flex;
}

/* 行标注（左侧数字）
 * 文字色：var(--color-text-tertiary) - 辅助文字
 */
.row-labels {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.row-label {
  font-size: 10px;
  color: #9A6A31;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 4px;
  flex-shrink: 0;
  background: rgba(250, 244, 200, 0.92);
  border-radius: 6px 0 0 6px;
  font-weight: 600;
}

.row-label.emphasis {
  color: #8D5113;
  background: rgba(245, 209, 130, 0.95);
}

/* 画布容器 - 背景色使用用户数据，不受主题影响 */
.canvas-container {
  position: relative;
  overflow: visible;
  border: 2px solid rgba(224, 106, 62, 0.45);
  box-shadow: 0 10px 24px rgba(35, 31, 26, 0.08);
}

/* 网格层 */
.grid-layer-optimized {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  will-change: transform;
  transform: translateZ(0);
}

.major-grid-line {
  position: absolute;
  pointer-events: none;
  z-index: 1;
}

.major-grid-line.horizontal {
  left: 0;
  right: 0;
  height: 2px;
  border-top: 2px solid rgba(248, 90, 60, 0.92);
}

.major-grid-line.horizontal.dashed {
  border-top: 2px dashed rgba(248, 90, 60, 0.92);
}

.major-grid-line.vertical {
  top: 0;
  bottom: 0;
  width: 2px;
  border-left: 2px solid rgba(248, 90, 60, 0.96);
}

.major-grid-line.vertical.dashed {
  border-left: 2px dashed rgba(248, 90, 60, 0.96);
}

/* 拼豆层 */
.beads-layer {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
  transform: translateZ(0);
}

/* 方豆样式 */
.bead-square {
  position: absolute;
  border-radius: 4rpx;
  box-shadow: inset 0 -4rpx 0 rgba(0, 0, 0, 0.2),
              inset 0 4rpx 0 rgba(255, 255, 255, 0.3);
  will-change: transform;
  transform: translateZ(0);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* 圆豆样式 */
.bead-round {
  position: absolute;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  will-change: transform;
  transform: translateZ(0);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* 圆豆中心白色圆孔 - 固定白色，不受主题影响 */
.bead-hole {
  width: 30%;
  height: 30%;
  border-radius: 50%;
  background-color: #FFFFFF;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

/* 色号文字 */
.bead-color-code {
  font-size: 8px;
  font-weight: 600;
  line-height: 1;
  pointer-events: none;
  position: absolute;
  z-index: 1;
}

/* 选中高亮框 - 使用主题主色 */
.selected-cell-highlight {
  position: absolute;
  border: 2px solid var(--color-primary, #F5A623);
  box-sizing: border-box;
  pointer-events: none;
  z-index: 5;
}

/* 预览拼豆 */
.bead.preview {
  opacity: 0.6;
  pointer-events: none;
}

/* ==================== 底部快捷操作区 ====================
 * 背景色：var(--color-bg-panel) - 面板背景
 * 边框色：var(--color-border) - 分隔线
 * 激活色：var(--color-primary-light) - 选中状态
 */
.bottom-shortcuts {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background-color: rgba(255, 253, 250, .96);
  border-top: 1px solid var(--color-border-light, #E8E8E8);
  flex-shrink: 0;
}

.shortcuts-left,
.shortcuts-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.shortcut-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 58px;
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 14px;
  background-color: var(--color-bg-panel, #F5F5F5);
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.15s;
}

.shortcut-btn.icon-only {
  width: 46px;
  min-width: 46px;
  padding: 8px;
}

.shortcut-btn.active {
  background-color: var(--color-primary-light, #FFF5E0);
}

.shortcut-btn.disabled {
  opacity: 0.4;
}

.shortcut-icon {
  width: 18px;
  height: 18px;
  display: block;
}

.shortcut-label {
  font-size: 12px;
  color: var(--color-text-secondary, #666666);
}

.shortcut-btn.active .shortcut-label {
  color: var(--color-primary, #CE7B1D);
  font-weight: 600;
}

/* ==================== 豆子统计区 ====================
 * 背景色：var(--color-bg-panel) - 面板背景
 * 边框色：var(--color-border) - 分隔线
 */
.bead-stats-bar {
  display: flex;
  align-items: center;
  min-height: 58px;
  padding: 10px 14px 12px 10px;
  background-color: rgba(255,253,250,.96);
  border-top: 1px solid var(--color-border, #E8E8E8);
  flex-shrink: 0;
  gap: 6px;
}

.stats-total {
  min-width: 58px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stats-main {
  font-size: 19px;
  line-height: 1;
  font-weight: 700;
  color: var(--color-text-primary, #333333);
}

.stats-sub {
  font-size: 12px;
  line-height: 1;
  font-weight: 600;
  color: var(--color-text-tertiary, #999999);
}

.stats-divider {
  width: 1px;
  height: 32px;
  background-color: var(--color-border-light, #F0F0F0);
  flex-shrink: 0;
  margin: 0 8px 0 6px;
}

.stats-scroll {
  flex: 1;
  white-space: nowrap;
  min-width: 0;
}

.stats-list {
  display: inline-flex;
  gap: 10px;
  padding: 2px 0;
}

.stats-item {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.stats-chip {
  min-width: 46px;
  height: 46px;
  padding: 5px 8px;
  border-radius: 12px;
  border: 3px solid var(--color-primary, #F5A623);
  box-shadow: 0 6px 14px rgba(245, 166, 35, 0.18);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.stats-chip.highlighted {
  transform: translateY(-1px) scale(1.04);
  box-shadow: 0 0 0 4px rgba(245,166,35,.28), 0 12px 24px rgba(245, 166, 35, 0.34);
}

.stats-chip-code {
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
}

.stats-chip-count {
  margin-top: 4px;
  font-size: 18px;
  line-height: 1;
  font-weight: 800;
}

.stats-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stats-code {
  font-size: 11px;
  color: var(--color-text-primary, #333333);
  font-weight: 500;
}

.stats-count {
  font-size: 11px;
  color: var(--color-text-tertiary, #999999);
}

.stats-empty {
  font-size: 12px;
  color: var(--color-text-tertiary, #999999);
  line-height: 32px;
}

/* ==================== Tab栏 ====================
 * 背景色：var(--color-bg-panel) - 面板背景
 * 边框色：var(--color-border) - 分隔线
 * 激活背景：var(--color-primary-light) - 选中状态
 * 主色：var(--color-primary) - 主色调
 */
.tab-bar {
  display: flex;
  margin: 0 16px 10px;
  padding: 6px;
  background-color: var(--color-bg-panel, #FFFFFF);
  border: 3px solid var(--color-text-primary);
  border-radius: 999px;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border-radius: 999px;
  cursor: pointer;
  position: relative;
  transition: all 0.15s;
}

.tab-item.active {
  background-color: var(--color-primary, #FFF5E0);
}

.tab-item.active .tab-text {
  color: var(--color-text-primary, #333333);
  font-weight: 600;
}

.tab-text {
  font-size: 14px;
  color: var(--color-text-secondary, #666666);
}

/* ==================== Tab内容面板 ====================
 * 背景色：var(--color-bg-panel) - 面板背景
 * 边框色：var(--color-border) - 分隔线
 */
.tab-panel {
  background-color: transparent;
  flex-shrink: 0;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  min-height: 88px;
}

.tab-panel-content {
  min-height: 88px;
  padding: 8px 14px 14px;
  box-sizing: border-box;
  display: flex;
  align-items: stretch;
}

.color-edit-modal {
  max-height: 82vh;
  border-radius: 36rpx 36rpx 28rpx 28rpx;
  width: 92vw;
  max-width: 720rpx;
}

.sheet-drag-handle {
  width: 96rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: rgba(35,31,26,.12);
  margin: 16rpx auto 4rpx;
}

.color-sheet-top {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.color-detail-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background-color: var(--color-bg-page);
  flex: 1;
  min-width: 0;
}

.color-detail-swatch {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  border: 2px solid rgba(0, 0, 0, 0.08);
}

.color-detail-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.color-detail-code {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.color-detail-count {
  font-size: 14px;
  color: #97A0B1;
}

.quick-action-row {
  display: flex;
  gap: 10rpx;
  flex-shrink: 0;
}

.quick-action-card {
  width: 114rpx;
  min-height: 132rpx;
  border-radius: 20rpx;
  background: #FFFFFF;
  box-shadow: 0 10rpx 26rpx rgba(35,31,26,.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 12rpx;
  box-sizing: border-box;
}

.quick-action-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background: #FFF9ED;
  border: 2rpx solid rgba(245,166,35,.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  color: #231F1A;
}

.quick-action-text {
  font-size: 22rpx;
  color: #231F1A;
  font-weight: 600;
  text-align: center;
  line-height: 1.25;
}

.color-actions {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.color-actions-dual {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.color-actions.single {
  grid-template-columns: minmax(0, 1fr);
}

.color-action-btn {
  min-height: 56px;
  border-radius: 20px;
  border: 2px solid #1F2430;
  background-color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: #1F2430;
}

.color-action-btn.primary {
  background-color: #FFF9ED;
  border-color: #1F2430;
  color: #1F2430;
}

.color-action-btn.danger {
  background-color: #FFFFFF;
}

.replace-panel {
  margin-top: 16px;
  padding: 18px;
  border-radius: 22px;
  background: var(--color-bg-page);
}

.replace-title {
  display: block;
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.replace-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.replace-chip {
  min-height: 92px;
  padding: 12px 8px;
  border-radius: 16px;
  border: 2px solid var(--color-border);
  background-color: var(--color-bg-page);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.replace-swatch {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.replace-code {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 600;
}

/* 尺寸选项 */
.size-options {
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 2px;
  width: 100%;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  align-items: center;
  min-height: 66px;
}

.size-options::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.size-option {
  flex: 0 0 auto;
  min-width: 98px;
  height: 46px;
  padding: 0 14px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.96);
  border: 2px solid var(--color-text-primary, #231F1A);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.size-option.active {
  background-color: #1D2741;
  border-color: #1D2741;
}

.size-option-text {
  font-size: 13px;
  color: var(--color-text-primary, #333333);
  font-weight: 600;
}

.size-option.active .size-option-text {
  color: #FFFFFF;
}

/* 编辑选项 */
.edit-options {
  display: flex;
  gap: 10px;
  width: 100%;
  align-items: stretch;
  min-height: 66px;
}

.edit-option {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  min-height: 66px;
  padding: 0 14px;
  border-radius: 22px;
  background-color: rgba(255, 255, 255, 0.96);
  border: 2px solid var(--color-text-primary, #231F1A);
  cursor: pointer;
  transition: all 0.15s;
  justify-content: center;
}

.edit-option:active {
  background-color: #FFF4D7;
}

.edit-option-icon {
  width: 24px;
  height: 24px;
  display: block;
  flex-shrink: 0;
}

.edit-option-text {
  font-size: 13px;
  color: var(--color-text-primary, #333333);
  font-weight: 600;
  white-space: nowrap;
}

/* 样式选项 */
.style-options {
  display: flex;
  gap: 10px;
  justify-content: flex-start;
  width: 100%;
  align-items: stretch;
  min-height: 66px;
}

.style-option {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  min-width: 110px;
  min-height: 66px;
  padding: 0 14px;
  border-radius: 22px;
  border: 2px solid var(--color-text-primary, #231F1A);
  background: rgba(255, 255, 255, 0.96);
  cursor: pointer;
  transition: all 0.15s;
  justify-content: center;
  flex: 0 0 auto;
}

.style-option.active {
  border-color: #D5A63B;
  background-color: #FFF3D8;
}

.style-preview {
  width: 28px;
  height: 28px;
  background-color: var(--color-primary, #F5A623);
  flex-shrink: 0;
}

.style-preview.bead-square-preview {
  border-radius: 6px;
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.2),
              inset 0 4px 0 rgba(255, 255, 255, 0.3);
}

.style-preview.bead-round-preview {
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.style-preview-hole {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background-color: #FFFFFF;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.15);
}

.style-option-text {
  font-size: 13px;
  color: var(--color-text-primary, #333333);
  font-weight: 600;
  white-space: nowrap;
}

/* ==================== 颜色选择面板（底部弹窗） ====================
 * 遮罩色：var(--color-bg-mask) - 半透明遮罩
 * 背景色：var(--color-bg-panel) - 面板背景
 * 边框色：var(--color-border) - 分隔线
 */
.color-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-bg-mask, rgba(0, 0, 0, 0.5));
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.color-panel-content {
  background-color: var(--color-bg-panel, #FFFFFF);
  border-radius: 20rpx 20rpx 0 0;
  width: 100%;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.color-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx;
  border-bottom: 1px solid var(--color-border, #F0F0F0);
  flex-shrink: 0;
}

.color-panel-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary, #333333);
}

.color-panel-close {
  font-size: 36rpx;
  color: var(--color-text-tertiary, #999999);
  padding: 8rpx;
  cursor: pointer;
}

/* 系列筛选栏 */
.color-series-scroll {
  flex-shrink: 0;
  white-space: nowrap;
  border-bottom: 1px solid var(--color-border, #F0F0F0);
}

.color-series-list {
  display: inline-flex;
  padding: 12rpx 24rpx;
  gap: 16rpx;
}

.color-series-item {
  padding: 8rpx 24rpx;
  border-radius: 20rpx;
  background-color: var(--color-bg-page, #F5F5F5);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.color-series-item.active {
  background-color: var(--color-primary, #F5A623);
}

.color-series-item.active .color-series-text {
  color: #FFFFFF;
}

.color-series-text {
  font-size: 24rpx;
  color: var(--color-text-secondary, #666666);
  white-space: nowrap;
}

/* 色卡网格 */
.color-card-scroll {
  flex: 1;
  min-height: 0;
  max-height: 50vh;
  min-height: 280px;
}

.color-card-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 16rpx 24rpx;
  gap: 16rpx;
}

.color-card-item {
  width: calc(20% - 16rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx;
  border-radius: 10rpx;
  border: 3rpx solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.color-card-item.active {
  border-color: var(--color-primary, #F5A623);
  background-color: var(--color-primary-light, #FFF5E0);
}

.color-card-swatch {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8rpx;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.color-card-code {
  font-size: 20rpx;
  color: var(--color-text-secondary, #666666);
  font-weight: 500;
}

/* ==================== 保存弹窗 ====================
 * 遮罩色：var(--color-bg-mask) - 半透明遮罩
 * 背景色：var(--color-bg-panel) - 面板背景
 * 边框色：var(--color-border) - 分隔线
 */
.save-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-bg-mask, rgba(0, 0, 0, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.save-modal {
  width: 300px;
  background-color: var(--color-bg-panel, #FFFFFF);
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
  color: var(--color-text-primary, #333333);
}

.save-modal-close {
  font-size: 20px;
  color: var(--color-text-tertiary, #999999);
  padding: 4px;
  cursor: pointer;
}

.save-modal-body {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.save-name-input {
  width: 100%;
  height: 44px;
  background-color: var(--color-bg-page, #F5F5F5);
  border-radius: 10px;
  padding: 0 14px;
  font-size: 15px;
  color: var(--color-text-primary, #333333);
  box-sizing: border-box;
}

.save-placeholder {
  color: var(--color-text-tertiary, #CCCCCC);
}

.save-section-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary, #666666);
}

.save-tag-scroll {
  width: 100%;
  white-space: nowrap;
}

.save-tag-row {
  display: inline-flex;
  gap: 10px;
  padding-bottom: 4px;
}

.save-tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.save-tag-pill {
  min-width: 76px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(35, 31, 26, 0.16);
  background: #FFFDF8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary, #666666);
  font-size: 13px;
}

.save-tag-pill.active {
  border-color: #F5A623;
  background: #FFF3D9;
  color: #8D5113;
  font-weight: 600;
}

.save-section-tip {
  font-size: 12px;
  color: var(--color-text-tertiary, #999999);
}

.save-modal-footer {
  display: flex;
  border-top: 1px solid var(--color-border, #F0F0F0);
}

.save-cancel-btn {
  flex: 1;
  text-align: center;
  padding: 14px;
  font-size: 16px;
  color: var(--color-text-secondary, #666666);
  border-right: 1px solid var(--color-border, #F0F0F0);
  cursor: pointer;
}

.save-only-btn {
  flex: 1;
  text-align: center;
  padding: 14px;
  font-size: 16px;
  color: var(--color-primary, #F5A623);
  font-weight: 600;
  cursor: pointer;
}

/* ==================== 自定义尺寸弹窗 ==================== */
.custom-size-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.custom-size-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.custom-size-label {
  font-size: 15px;
  color: var(--color-text-primary, #333333);
  width: 48px;
  flex-shrink: 0;
}

.custom-size-input {
  flex: 1;
  height: 44px;
  background-color: var(--color-bg-page, #F5F5F5);
  border-radius: 10px;
  padding: 0 14px;
  font-size: 15px;
  color: var(--color-text-primary, #333333);
  box-sizing: border-box;
}
</style>
