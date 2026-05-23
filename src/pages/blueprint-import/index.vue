<template>
  <view class="blueprint-import-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">导入图纸</text>
      <text class="page-subtitle">从本地或云端导入拼豆图纸</text>
    </view>

    <!-- 导入来源选择 -->
    <view class="source-section">
      <text class="section-title">选择来源</text>
      <view class="source-tabs">
        <view
          v-for="tab in sourceTabs"
          :key="tab.id"
          :class="['source-tab', activeSource === tab.id ? 'active' : '']"
          @click="activeSource = tab.id"
        >
          <text class="tab-icon">{{ tab.icon }}</text>
          <text class="tab-label">{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <!-- 本地项目 -->
    <view v-if="activeSource === 'local'" class="local-section">
      <text class="section-title">我的项目</text>

      <!-- 搜索 -->
      <view class="search-bar">
        <text class="search-icon">🔍</text>
        <input
          type="text"
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索项目名称"
          @input="filterProjects"
        />
      </view>

      <!-- 项目列表 -->
      <scroll-view class="project-list" scroll-y>
        <view
          v-for="project in filteredProjects"
          :key="project.id"
          class="project-item"
          @click="selectProject(project)"
        >
          <view class="project-info">
            <text class="project-name">{{ project.name }}</text>
            <text class="project-meta">
              {{ project.canvasData?.width || 0 }}×{{ project.canvasData?.height || 0 }} ·
              {{ formatDate(project.updatedAt) }}
            </text>
          </view>
          <view class="project-arrow">›</view>
        </view>

        <view v-if="filteredProjects.length === 0" class="empty-state">
          <text class="empty-text">{{ searchKeyword ? '未找到匹配的项目' : '暂无项目' }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 文件导入 -->
    <view v-if="activeSource === 'file'" class="file-section">
      <text class="section-title">从文件导入</text>

      <!-- 支持的格式说明 -->
      <view class="format-info">
        <text class="format-title">支持的文件格式</text>
        <view class="format-list">
          <text class="format-item">• JSON 格式 (.json)</text>
          <text class="format-item">• PNG 图片 (.png)</text>
          <text class="format-item">• PDF 文档 (.pdf)</text>
        </view>
      </view>

      <!-- 上传区域 -->
      <view class="upload-area" @click="chooseFile">
        <view class="upload-icon">
          <text class="icon-text">📁</text>
        </view>
        <text class="upload-text">点击选择文件</text>
        <text class="upload-hint">或拖拽文件到此处</text>
      </view>

      <!-- 最近导入 -->
      <view v-if="recentImports.length > 0" class="recent-section">
        <text class="section-title">最近导入</text>
        <view
          v-for="item in recentImports"
          :key="item.id"
          class="recent-item"
          @click="loadRecentImport(item)"
        >
          <text class="recent-icon">📄</text>
          <view class="recent-info">
            <text class="recent-name">{{ item.name }}</text>
            <text class="recent-date">{{ formatDate(item.importedAt) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 二维码扫描 -->
    <view v-if="activeSource === 'qrcode'" class="qrcode-section">
      <text class="section-title">扫码导入</text>
      <text class="section-hint">扫描图纸上的二维码，快速导入拼豆图纸</text>

      <view class="qrcode-scanner" @click="scanQRCode">
        <view class="scanner-frame">
          <view class="scanner-corner top-left"></view>
          <view class="scanner-corner top-right"></view>
          <view class="scanner-corner bottom-left"></view>
          <view class="scanner-corner bottom-right"></view>
        </view>
        <text class="scanner-hint">点击开始扫描</text>
      </view>
    </view>

    <!-- 选中的项目预览 -->
    <view v-if="selectedProject" class="preview-section">
      <view class="preview-header">
        <text class="preview-title">已选择项目</text>
        <text class="preview-clear" @click="selectedProject = null">清除</text>
      </view>
      <view class="preview-content">
        <view class="preview-info">
          <text class="preview-name">{{ selectedProject.name }}</text>
          <text class="preview-meta">
            尺寸：{{ selectedProject.canvasData?.width || 0 }}×{{ selectedProject.canvasData?.height || 0 }} 格
          </text>
          <text class="preview-meta">
            拼豆数：{{ selectedProject.canvasData?.beads?.length || 0 }}
          </text>
          <text class="preview-meta">
            更新于：{{ formatDate(selectedProject.updatedAt) }}
          </text>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-actions">
      <button
        class="btn-import"
        :disabled="!canImport"
        @click="importBlueprint"
      >
        {{ canImport ? '导入到画布' : '请选择要导入的图纸' }}
      </button>
    </view>

    <!-- 导入成功提示 -->
    <view v-if="showSuccess" class="success-toast">
      <text class="success-icon">✓</text>
      <text class="success-text">导入成功</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// ==================== 常量定义 ====================
// 来源选项
const sourceTabs = [
  { id: 'local', label: '我的项目', icon: '📁' },
  { id: 'file', label: '本地文件', icon: '📄' },
  { id: 'qrcode', label: '扫码导入', icon: '📷' },
]

// ==================== 状态定义 ====================
// 当前选中的来源
const activeSource = ref('local')

// 搜索关键词
const searchKeyword = ref('')

// 项目列表
const projects = ref<any[]>([])

// 过滤后的项目列表
const filteredProjects = computed(() => {
  if (!searchKeyword.value) {
    return projects.value
  }
  return projects.value.filter(p =>
    p.name.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
})

// 最近导入记录
const recentImports = ref<any[]>([])

// 选中的项目
const selectedProject = ref<any>(null)

// 选中的文件
const selectedFile = ref<string>('')

// 是否显示成功提示
const showSuccess = ref(false)

// ==================== 计算属性 ====================
// 是否可以导入
const canImport = computed(() => {
  return selectedProject.value !== null || selectedFile.value !== ''
})

// ==================== 生命周期 ====================
onMounted(() => {
  loadProjects()
  loadRecentImports()
})

// ==================== 方法定义 ====================

/**
 * 加载项目列表
 */
const loadProjects = () => {
  const savedProjects = uni.getStorageSync('pin_projects') || []
  projects.value = savedProjects
}

/**
 * 加载最近导入记录
 */
const loadRecentImports = () => {
  const saved = uni.getStorageSync('pin_recent_imports') || []
  recentImports.value = saved.slice(0, 5)
}

/**
 * 搜索项目
 */
const filterProjects = () => {
  // 搜索逻辑在 computed 中处理
}

/**
 * 选择项目
 * @param project - 选中的项目
 */
const selectProject = (project: any) => {
  selectedProject.value = project
  selectedFile.value = ''
}

/**
 * 选择文件
 */
const chooseFile = () => {
  // 根据平台选择文件
  // #ifdef H5
  // H5 环境使用 file input
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,.png,.pdf'
  input.onchange = (e: any) => {
    const file = e.target.files[0]
    if (file) {
      handleFile(file)
    }
  }
  input.click()
  // #endif

  // #ifndef H5
  // App/小程序使用 uni.chooseMessageFile
  uni.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['json', 'png', 'pdf'],
    success: (res) => {
      const file = res.tempFiles[0]
      handleFile(file)
    }
  })
  // #endif
}

/**
 * 处理选择的文件
 * @param file - 文件对象
 */
const handleFile = (file: any) => {
  const fileName = file.name || file.tempFilePath || '未命名文件'

  // 根据文件类型处理
  if (fileName.endsWith('.json')) {
    // JSON 文件直接解析
    if (typeof file === 'string') {
      // 可能是临时文件路径
      selectedFile.value = file
    } else {
      // 文件对象，需要读取内容
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          // 创建项目
          selectedProject.value = {
            id: 'imported_' + Date.now(),
            name: fileName.replace('.json', ''),
            canvasData: data,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        } catch (err) {
          uni.showToast({ title: '文件格式错误', icon: 'none' })
        }
      }
      reader.readAsText(file)
    }
  } else if (fileName.endsWith('.png') || fileName.endsWith('.jpg')) {
    // 图片文件需要处理为图纸
    selectedFile.value = file.tempFilePath || URL.createObjectURL(file)
    uni.showToast({ title: '图片转图纸功能开发中', icon: 'none' })
  } else {
    uni.showToast({ title: '不支持的文件格式', icon: 'none' })
  }
}

/**
 * 加载最近导入
 * @param item - 导入记录
 */
const loadRecentImport = (item: any) => {
  // 从本地存储加载项目数据
  const savedProjects = uni.getStorageSync('pin_projects') || []
  const project = savedProjects.find((p: any) => p.id === item.projectId)
  if (project) {
    selectProject(project)
  }
}

/**
 * 扫码导入
 */
const scanQRCode = () => {
  // 使用 uni.scanCode
  uni.scanCode({
    onlyFromCamera: true,
    success: (res) => {
      handleQRCode(res.result)
    },
    fail: () => {
      uni.showToast({ title: '扫描失败，请重试', icon: 'none' })
    }
  })
}

/**
 * 处理二维码内容
 * @param content - 二维码内容
 */
const handleQRCode = (content: string) => {
  try {
    // 尝试解析为 JSON
    const data = JSON.parse(content)
    if (data.canvasData) {
      selectedProject.value = {
        id: 'qr_' + Date.now(),
        name: data.name || '扫码导入作品',
        canvasData: data.canvasData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    }
  } catch {
    // 不是 JSON，可能是 URL
    if (content.startsWith('http')) {
      uni.showToast({ title: '链接导入功能开发中', icon: 'none' })
    } else {
      uni.showToast({ title: '无效的二维码内容', icon: 'none' })
    }
  }
}

/**
 * 格式化日期
 * @param timestamp - 时间戳
 */
const formatDate = (timestamp: number): string => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

/**
 * 导入图纸
 */
const importBlueprint = () => {
  if (!selectedProject.value) return

  // 保存到最近导入
  const recent = {
    id: selectedProject.value.id,
    projectId: selectedProject.value.id,
    name: selectedProject.value.name,
    importedAt: Date.now(),
  }
  const saved = uni.getStorageSync('pin_recent_imports') || []
  const updated = [recent, ...saved.filter((r: any) => r.projectId !== recent.projectId)].slice(0, 10)
  uni.setStorageSync('pin_recent_imports', updated)

  // 跳转到画布编辑器
  uni.navigateTo({
    url: `/pages/canvas-editor/index?mode=import&data=${encodeURIComponent(
      JSON.stringify({
        canvasData: selectedProject.value.canvasData,
        name: selectedProject.value.name,
      })
    )}`
  })
}
</script>

<style scoped>
.blueprint-import-page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
  padding-bottom: 160rpx;
}

/* 页面标题 */
.page-header {
  padding: 32rpx;
  background-color: var(--color-bg-panel);
  margin-bottom: 24rpx;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.page-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  display: block;
}

.page-subtitle {
  font-size: 26rpx;
  color: var(--color-text-tertiary);
  margin-top: 8rpx;
}

/* 来源选择 */
.source-section {
  padding: 32rpx;
  background-color: var(--color-bg-panel);
  margin-bottom: 24rpx;
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

.source-tabs {
  display: flex;
  gap: 16rpx;
}

.source-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx;
  background-color: var(--color-bg-page);
  border-radius: var(--radius-lg);
  border: 4rpx solid transparent;
}

.source-tab.active {
  background-color: var(--color-primary-light);
  border-color: var(--color-primary);
}

.tab-icon {
  font-size: 48rpx;
  margin-bottom: 8rpx;
}

.tab-label {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.source-tab.active .tab-label {
  color: var(--color-primary);
  font-weight: 600;
}

/* 本地项目 */
.local-section {
  padding: 32rpx;
  background-color: var(--color-bg-panel);
  margin-bottom: 24rpx;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.search-bar {
  display: flex;
  align-items: center;
  background-color: var(--color-bg-page);
  border-radius: 32rpx;
  padding: 16rpx 24rpx;
  margin-bottom: 24rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--color-text-primary);
}

.project-list {
  max-height: 500rpx;
}

.project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 2rpx solid var(--color-divider);
}

.project-item:last-child {
  border-bottom: none;
}

.project-info {
  flex: 1;
}

.project-name {
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 500;
  display: block;
  margin-bottom: 8rpx;
}

.project-meta {
  font-size: 22rpx;
  color: var(--color-text-tertiary);
}

.project-arrow {
  font-size: 36rpx;
  color: var(--color-text-disabled);
}

.empty-state {
  padding: 64rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: var(--color-text-disabled);
}

/* 文件导入 */
.file-section {
  padding: 32rpx;
  background-color: var(--color-bg-panel);
  margin-bottom: 24rpx;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.format-info {
  background-color: var(--color-bg-page);
  border-radius: var(--radius-lg);
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.format-title {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  font-weight: 500;
  display: block;
  margin-bottom: 12rpx;
}

.format-list {
  display: flex;
  flex-direction: column;
}

.format-item {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  line-height: 1.6;
}

.upload-area {
  height: 300rpx;
  background-color: var(--color-bg-panel);
  border-radius: var(--radius-lg);
  border: 4rpx dashed var(--color-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  width: 100rpx;
  height: 100rpx;
  background-color: var(--color-bg-page);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.icon-text {
  font-size: 56rpx;
}

.upload-text {
  font-size: 30rpx;
  color: var(--color-text-primary);
  margin-bottom: 8rpx;
}

.upload-hint {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

.recent-section {
  margin-top: 32rpx;
}

.recent-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 2rpx solid var(--color-divider);
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}

.recent-info {
  flex: 1;
}

.recent-name {
  font-size: 26rpx;
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 4rpx;
}

.recent-date {
  font-size: 22rpx;
  color: var(--color-text-tertiary);
}

/* 二维码扫描 */
.qrcode-section {
  padding: 32rpx;
  background-color: var(--color-bg-panel);
  margin-bottom: 24rpx;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.section-hint {
  font-size: 26rpx;
  color: var(--color-text-tertiary);
  display: block;
  margin-bottom: 32rpx;
}

.qrcode-scanner {
  height: 400rpx;
  background-color: var(--color-bg-page);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.scanner-frame {
  width: 300rpx;
  height: 300rpx;
  position: relative;
}

.scanner-corner {
  position: absolute;
  width: 40rpx;
  height: 40rpx;
  border-color: var(--color-primary);
  border-style: solid;
  border-width: 0;
}

.scanner-corner.top-left {
  top: 0;
  left: 0;
  border-top-width: 6rpx;
  border-left-width: 6rpx;
  border-top-left-radius: 16rpx;
}

.scanner-corner.top-right {
  top: 0;
  right: 0;
  border-top-width: 6rpx;
  border-right-width: 6rpx;
  border-top-right-radius: 16rpx;
}

.scanner-corner.bottom-left {
  bottom: 0;
  left: 0;
  border-bottom-width: 6rpx;
  border-left-width: 6rpx;
  border-bottom-left-radius: 16rpx;
}

.scanner-corner.bottom-right {
  bottom: 0;
  right: 0;
  border-bottom-width: 6rpx;
  border-right-width: 6rpx;
  border-bottom-right-radius: 16rpx;
}

.scanner-hint {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  margin-top: 24rpx;
}

/* 预览区域 */
.preview-section {
  padding: 32rpx;
  background-color: var(--color-bg-panel);
  margin-bottom: 24rpx;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.preview-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.preview-clear {
  font-size: 26rpx;
  color: var(--color-primary);
}

.preview-content {
  background-color: var(--color-bg-page);
  border-radius: var(--radius-lg);
  padding: 24rpx;
}

.preview-name {
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 600;
  display: block;
  margin-bottom: 12rpx;
}

.preview-meta {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  display: block;
  margin-bottom: 8rpx;
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

.btn-import {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: var(--color-text-inverse);
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
}

.btn-import[disabled] {
  background: var(--color-text-disabled);
}

/* 成功提示 */
.success-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: var(--color-bg-mask);
  padding: 32rpx 64rpx;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1000;
}

.success-icon {
  font-size: 64rpx;
  color: var(--color-success);
  margin-bottom: 16rpx;
}

.success-text {
  font-size: 28rpx;
  color: var(--color-text-inverse);
}
</style>
