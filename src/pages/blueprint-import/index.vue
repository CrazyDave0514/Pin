<template>
  <view class="blueprint-import-page">
    <view class="page-nav">
      <view class="nav-top-safe"></view>
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">‹</view>
        <text class="nav-title">导入图纸</text>
        <view class="nav-ghost"></view>
      </view>
    </view>

    <view class="page-header">
      <text class="page-title">把现有图纸带回编辑器</text>
      <text class="page-subtitle">支持图片识别导入，也支持从我的项目继续编辑</text>
    </view>

    <view class="source-section">
      <text class="section-title">选择来源</text>
      <view class="source-tabs">
        <view
          v-for="tab in sourceTabs"
          :key="tab.id"
          :class="['source-tab', activeSource === tab.id ? 'active' : '']"
          @click="switchSource(tab.id)"
        >
          <image class="tab-icon" :src="tab.icon" mode="aspectFit" />
          <text class="tab-label">{{ tab.label }}</text>
        </view>
      </view>
      <text class="section-hint">扫码导入延后到下一期，本版先把图片识别和项目导入闭环补完整。</text>
    </view>

    <view v-if="activeSource === 'local'" class="content-card">
      <text class="section-title">我的项目</text>
      <view class="search-bar">
        <image class="search-icon" src="/static/assets/v015/icons/search-muted.png" mode="aspectFit" />
        <input
          v-model="searchKeyword"
          class="search-input"
          type="text"
          placeholder="搜索项目名称"
        />
      </view>
      <scroll-view class="project-list" scroll-y>
        <view
          v-for="project in filteredProjects"
          :key="project.id"
          :class="['project-item', selectedProject?.id === project.id ? 'active' : '']"
          @click="selectProject(project)"
        >
          <view class="project-main">
            <text class="project-name">{{ project.name || '未命名作品' }}</text>
            <text class="project-meta">{{ getProjectSpec(project) }}</text>
            <text class="project-time">{{ formatDateTime(project.updatedAt || project.createdAt) }}</text>
          </view>
          <text class="project-arrow">›</text>
        </view>
        <view v-if="filteredProjects.length === 0" class="empty-state">
          <text class="empty-text">{{ searchKeyword ? '没有找到相关项目' : '还没有可导入的项目' }}</text>
        </view>
      </scroll-view>
    </view>

    <view v-else class="content-card">
      <text class="section-title">识别图纸图片</text>
      <view class="upload-area" @click="chooseFile">
        <view class="upload-icon">
          <image class="icon-image" src="/static/assets/v015/icons/blueprint-import-active.png" mode="aspectFit" />
        </view>
        <text class="upload-text">{{ selectedImage ? '重新选择图片' : '点击选择图纸图片' }}</text>
        <text class="upload-hint">优先支持本应用导出的图纸图片，也支持规则格子图</text>
      </view>

      <view v-if="selectedImage" class="recognize-panel">
        <view class="recognize-actions">
          <view class="action-chip" @click="runAutoRecognition(false)">
            <text>{{ isRecognizing ? '识别中...' : '自动识别' }}</text>
          </view>
          <view class="action-chip secondary" @click="openManualSizeModal">
            <text>手动设置尺寸</text>
          </view>
        </view>

        <view class="compare-row">
          <view class="compare-col">
            <text class="compare-label">原图</text>
            <view class="compare-box">
              <image :src="selectedImage" class="compare-image" mode="aspectFit" />
            </view>
          </view>
          <view class="compare-col">
            <text class="compare-label">识别结果</text>
            <view class="compare-box result">
              <image v-if="recognitionResult?.previewUrl" :src="recognitionResult.previewUrl" class="compare-image" mode="aspectFit" />
              <text v-else class="empty-result">先点击自动识别</text>
            </view>
          </view>
        </view>

        <view v-if="recognitionResult" class="result-summary">
          <text class="summary-line">尺寸：{{ recognitionResult.width }} × {{ recognitionResult.height }} 格</text>
          <text class="summary-line">原图：{{ recognitionResult.sourceWidth }} × {{ recognitionResult.sourceHeight }} px</text>
          <text class="summary-line">估算单格：{{ recognitionResult.estimatedCellSize }} px</text>
        </view>
      </view>

      <view v-if="recentImports.length > 0" class="recent-section">
        <text class="section-title">最近导入</text>
        <view v-for="item in recentImports" :key="item.id" class="recent-item" @click="loadRecentImport(item)">
          <image class="recent-icon" src="/static/assets/v015/icons/blueprint-import-muted.png" mode="aspectFit" />
          <view class="recent-info">
            <text class="recent-name">{{ item.name }}</text>
            <text class="recent-date">{{ formatDateTime(item.importedAt) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="importPreview" class="content-card">
      <view class="preview-header">
        <text class="section-title">导入预览</text>
        <text class="preview-clear" @click="clearSelection">清除</text>
      </view>
      <view class="preview-content">
        <text class="preview-name">{{ importPreview.name }}</text>
        <text class="preview-meta">{{ importPreview.spec }}</text>
        <text class="preview-meta">{{ importPreview.desc }}</text>
      </view>
    </view>

    <view v-if="showManualModal" class="modal-mask" @click="closeManualSizeModal">
      <view class="manual-modal" @click.stop>
        <text class="modal-title">手动设置图纸尺寸</text>
        <text class="modal-desc">自动识别不稳定时，先输入格子数再重新识别。</text>
        <view class="manual-row">
          <view class="manual-input">
            <text class="manual-label">宽</text>
            <input v-model="manualWidth" type="number" class="manual-field" />
            <text class="manual-unit">格</text>
          </view>
          <text class="manual-separator">×</text>
          <view class="manual-input">
            <text class="manual-label">高</text>
            <input v-model="manualHeight" type="number" class="manual-field" />
            <text class="manual-unit">格</text>
          </view>
        </view>
        <view class="modal-actions">
          <view class="modal-btn secondary" @click="closeManualSizeModal">取消</view>
          <view class="modal-btn primary" @click="runManualRecognition">重新识别</view>
        </view>
      </view>
    </view>

    <view class="bottom-actions">
      <view class="btn-import" :class="{ disabled: !canImport }" @click="canImport ? importBlueprint() : null">
        <text>{{ importButtonText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { buildBlueprintTransferFromRecognition, recognizeBlueprintFromImage } from '@/utils/blueprint-recognizer'
import { createBlueprintTransferData } from '@/utils/blueprint-utils'
import { setBlueprintData } from '@/utils/blueprint-transfer'
import { projectService } from '../../services/pin/index'

const sourceTabs = [
  { id: 'file', label: '图片识别', icon: '/static/assets/v015/icons/blueprint-import-muted.png' },
  { id: 'local', label: '我的项目', icon: '/static/assets/v015/icons/project-muted.png' },
]

const activeSource = ref<'file' | 'local'>('file')
const searchKeyword = ref('')
const projects = ref<any[]>([])
const recentImports = ref<any[]>([])
const selectedProject = ref<any | null>(null)
const selectedImage = ref('')
const selectedFileName = ref('')
const recognitionResult = ref<Awaited<ReturnType<typeof recognizeBlueprintFromImage>> | null>(null)
const isRecognizing = ref(false)
const showManualModal = ref(false)
const manualWidth = ref(30)
const manualHeight = ref(30)

const filteredProjects = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return projects.value
  return projects.value.filter((project) => String(project.name || '').toLowerCase().includes(keyword))
})

const importPreview = computed(() => {
  if (selectedProject.value) {
    return {
      name: selectedProject.value.name || '未命名作品',
      spec: getProjectSpec(selectedProject.value),
      desc: '将以项目当前画布内容直接导入编辑器',
    }
  }

  if (recognitionResult.value) {
    return {
      name: selectedFileName.value || '图片识别结果',
      spec: `${recognitionResult.value.width} × ${recognitionResult.value.height} 格`,
      desc: '将以识别后的图纸内容导入编辑器，可继续修改颜色和网格',
    }
  }

  return null
})

const canImport = computed(() => {
  return Boolean(selectedProject.value || recognitionResult.value)
})

const importButtonText = computed(() => {
  if (selectedProject.value) return '导入项目到画布'
  if (recognitionResult.value) return '导入识别结果'
  return activeSource.value === 'file' ? '请先选择并识别图片' : '请选择要导入的项目'
})

onMounted(() => {
  void loadProjects()
  void loadRecentImports()
})

const goBack = () => {
  uni.navigateBack()
}

const switchSource = (source: 'file' | 'local') => {
  activeSource.value = source
}

const loadProjects = async () => {
  projects.value = await projectService.getProjects()
}

const loadRecentImports = async () => {
  recentImports.value = await projectService.getRecentImports()
}

const formatDateTime = (timestamp: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

const getProjectSpec = (project: any) => {
  const width = Number(project?.canvasData?.width || 0)
  const height = Number(project?.canvasData?.height || 0)
  const beads = Array.isArray(project?.canvasData?.beads) ? project.canvasData.beads.length : 0
  return `${width} × ${height} 格 · ${beads} 豆`
}

const clearSelection = () => {
  selectedProject.value = null
  recognitionResult.value = null
  selectedImage.value = ''
  selectedFileName.value = ''
}

const selectProject = (project: any) => {
  selectedProject.value = project
  recognitionResult.value = null
  selectedImage.value = ''
  selectedFileName.value = ''
}

const chooseFile = () => {
  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,.png,.jpg,.jpeg,.webp'
  input.onchange = async (event: any) => {
    const file = event.target?.files?.[0]
    if (!file) return
    await handleFile(file)
  }
  input.click()
  // #endif

  // #ifndef H5
  uni.chooseMessageFile({
    count: 1,
    type: 'image',
    success: async (res) => {
      const file = res.tempFiles?.[0]
      if (file) {
        await handleFile(file)
      }
    },
  })
  // #endif
}

const handleJsonImport = async (fileName: string, content: string) => {
  try {
    const raw = JSON.parse(content)
    const canvasData = raw.canvasData || raw
    selectedProject.value = {
      id: `imported_${Date.now()}`,
      name: fileName.replace(/\.json$/i, ''),
      canvasData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    activeSource.value = 'local'
  } catch (error) {
    uni.showToast({ title: 'JSON 格式无法识别', icon: 'none' })
  }
}

const handleFile = async (file: any) => {
  const fileName = file.name || file.tempFilePath || '未命名文件'
  selectedFileName.value = fileName

  if (/\.json$/i.test(fileName)) {
    if (typeof FileReader !== 'undefined' && file instanceof File) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        await handleJsonImport(fileName, String(event.target?.result || ''))
      }
      reader.readAsText(file)
      return
    }
    uni.showToast({ title: '当前环境暂不支持读取 JSON', icon: 'none' })
    return
  }

  selectedProject.value = null
  selectedImage.value = file.tempFilePath || URL.createObjectURL(file)
  await runAutoRecognition(true)
}

const runAutoRecognition = async (showLoading = true) => {
  if (!selectedImage.value || isRecognizing.value) return
  isRecognizing.value = true
  if (showLoading) uni.showLoading({ title: '识别图纸中...' })
  try {
    recognitionResult.value = await recognizeBlueprintFromImage(selectedImage.value)
    manualWidth.value = recognitionResult.value.width
    manualHeight.value = recognitionResult.value.height
    uni.showToast({ title: `识别到 ${recognitionResult.value.width}×${recognitionResult.value.height} 格`, icon: 'success' })
  } catch (error: any) {
    console.error(error)
    recognitionResult.value = null
    uni.showToast({ title: error?.message || '自动识别失败，请手动设置尺寸', icon: 'none' })
  } finally {
    if (showLoading) uni.hideLoading()
    isRecognizing.value = false
  }
}

const openManualSizeModal = () => {
  if (!selectedImage.value) {
    uni.showToast({ title: '请先选择图纸图片', icon: 'none' })
    return
  }
  if (recognitionResult.value) {
    manualWidth.value = recognitionResult.value.width
    manualHeight.value = recognitionResult.value.height
  }
  showManualModal.value = true
}

const closeManualSizeModal = () => {
  showManualModal.value = false
}

const runManualRecognition = async () => {
  if (!selectedImage.value) return
  const width = Math.min(200, Math.max(4, Number(manualWidth.value) || 30))
  const height = Math.min(200, Math.max(4, Number(manualHeight.value) || 30))
  uni.showLoading({ title: '按手动尺寸识别...' })
  try {
    recognitionResult.value = await recognizeBlueprintFromImage(selectedImage.value, { width, height })
    manualWidth.value = recognitionResult.value.width
    manualHeight.value = recognitionResult.value.height
    showManualModal.value = false
    uni.showToast({ title: '手动识别完成', icon: 'success' })
  } catch (error: any) {
    console.error(error)
    uni.showToast({ title: error?.message || '手动识别失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const loadRecentImport = async (item: any) => {
  const project = await projectService.getProjectById(item.projectId)
  if (project) {
    activeSource.value = 'local'
    selectProject(project)
  }
}

const saveRecentImport = async (payload: { projectId: string; name: string }) => {
  await projectService.saveRecentImport(payload)
}

const importBlueprint = () => {
  if (selectedProject.value) {
    const canvasData = selectedProject.value.canvasData || {}
    const transferData = createBlueprintTransferData({
      width: canvasData.width || 30,
      height: canvasData.height || 30,
      backgroundColor: canvasData.backgroundColor || '#FFFFFF',
      showGrid: canvasData.showGrid !== false,
      gridColor: canvasData.gridColor || '#CCCCCC',
      beads: Array.isArray(canvasData.beads) ? canvasData.beads : [],
      beadStyle: canvasData.beadStyle === 'round' ? 'round' : 'square',
      showColorCode: canvasData.showColorCode === true,
      sourceMeta: {
        sourceType: 'project-import',
        sourceName: selectedProject.value.name || '我的项目',
        recognitionMode: 'manual',
      },
    })
    setBlueprintData(transferData)
    saveRecentImport({ projectId: selectedProject.value.id, name: selectedProject.value.name || '未命名作品' })
    uni.navigateTo({ url: '/pages/canvas-editor/index?mode=blueprint' })
    return
  }

  if (recognitionResult.value) {
    const transferData = buildBlueprintTransferFromRecognition(
      recognitionResult.value,
      selectedFileName.value || '图片识别',
      showManualModal.value ? 'manual' : 'auto'
    )
    setBlueprintData(transferData)
    saveRecentImport({ projectId: `recognition_${Date.now()}`, name: selectedFileName.value || '图片识别' })
    uni.navigateTo({ url: '/pages/canvas-editor/index?mode=blueprint' })
  }
}
</script>

<style scoped>
.blueprint-import-page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
  padding-bottom: 170rpx;
}

.page-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255,253,250,.94);
  backdrop-filter: blur(16rpx);
}

.nav-top-safe {
  height: 0;
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 24rpx 16rpx;
}

.nav-back,
.nav-ghost {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-back {
  border: 2rpx solid var(--color-border);
  border-radius: 999rpx;
  font-size: 48rpx;
  color: var(--color-text-primary);
}

.nav-title {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--color-text-primary);
}

.page-header,
.source-section,
.content-card {
  margin: 24rpx;
  padding: 28rpx;
  background-color: var(--color-bg-panel);
  border: 2rpx solid var(--color-border);
  border-radius: 28rpx;
  box-shadow: var(--shadow-md);
}

.page-title {
  display: block;
  font-size: 42rpx;
  font-weight: 800;
  color: var(--color-text-primary);
}

.page-subtitle,
.section-hint,
.preview-meta,
.project-time,
.upload-hint,
.empty-text,
.manual-unit,
.modal-desc {
  color: var(--color-text-tertiary);
}

.page-subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
}

.section-title {
  display: block;
  margin-bottom: 20rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--color-text-primary);
}

.section-hint {
  display: block;
  margin-top: 16rpx;
  font-size: 22rpx;
}

.source-tabs {
  display: flex;
  gap: 16rpx;
}

.source-tab {
  flex: 1;
  padding: 24rpx 18rpx;
  border: 2rpx solid var(--color-border);
  border-radius: 22rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.source-tab.active {
  background-color: var(--color-primary-light);
  border-color: var(--color-primary);
}

.tab-icon,
.recent-icon,
.search-icon,
.icon-image {
  display: block;
}

.tab-icon {
  width: 48rpx;
  height: 48rpx;
}

.tab-label {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.source-tab.active .tab-label {
  color: var(--color-primary);
  font-weight: 700;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  border: 2rpx solid var(--color-border);
  border-radius: 18rpx;
  background-color: var(--color-bg-page);
  margin-bottom: 20rpx;
}

.search-icon {
  width: 28rpx;
  height: 28rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--color-text-primary);
}

.project-list {
  max-height: 620rpx;
}

.project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 24rpx 0;
  border-bottom: 2rpx solid var(--color-divider);
}

.project-item.active {
  background: rgba(255,190,92,.08);
}

.project-item:last-child,
.recent-item:last-child {
  border-bottom: none;
}

.project-main {
  flex: 1;
}

.project-name,
.preview-name,
.recent-name {
  display: block;
  color: var(--color-text-primary);
}

.project-name,
.preview-name {
  font-size: 28rpx;
  font-weight: 700;
}

.project-meta,
.preview-meta,
.recent-date,
.summary-line {
  display: block;
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-top: 8rpx;
}

.project-time {
  display: block;
  font-size: 22rpx;
  margin-top: 8rpx;
}

.project-arrow {
  font-size: 36rpx;
  color: var(--color-text-disabled);
}

.empty-state {
  padding: 84rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
}

.upload-area {
  height: 300rpx;
  border: 4rpx dashed var(--color-border);
  border-radius: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-page);
}

.upload-icon {
  width: 100rpx;
  height: 100rpx;
  margin-bottom: 18rpx;
  border-radius: 26rpx;
  border: 2rpx solid var(--color-primary);
  background-color: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-image {
  width: 56rpx;
  height: 56rpx;
}

.upload-text {
  font-size: 30rpx;
  color: var(--color-text-primary);
  margin-bottom: 6rpx;
}

.upload-hint,
.empty-result {
  font-size: 24rpx;
}

.recognize-panel,
.recent-section {
  margin-top: 24rpx;
}

.recognize-actions {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.action-chip {
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  background-color: var(--color-primary);
  color: var(--color-text-primary);
  font-size: 24rpx;
  font-weight: 700;
}

.action-chip.secondary {
  background-color: var(--color-bg-page);
  border: 2rpx solid var(--color-border);
  color: var(--color-text-secondary);
}

.compare-row {
  display: flex;
  gap: 16rpx;
}

.compare-col {
  flex: 1;
}

.compare-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.compare-box {
  height: 280rpx;
  border: 2rpx solid var(--color-border);
  border-radius: 22rpx;
  background-color: var(--color-bg-page);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.compare-box.result {
  border-color: var(--color-primary);
}

.compare-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.empty-result {
  color: var(--color-text-disabled);
}

.result-summary {
  margin-top: 18rpx;
  padding: 20rpx;
  border-radius: 18rpx;
  background-color: var(--color-bg-page);
}

.summary-line + .summary-line {
  margin-top: 8rpx;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 18rpx 0;
  border-bottom: 2rpx solid var(--color-divider);
}

.recent-icon {
  width: 40rpx;
  height: 40rpx;
}

.recent-info {
  flex: 1;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-clear {
  font-size: 24rpx;
  color: var(--color-primary);
}

.preview-content {
  margin-top: 16rpx;
  padding: 22rpx;
  border-radius: 20rpx;
  background-color: var(--color-bg-page);
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  background-color: var(--color-bg-mask);
  display: flex;
  align-items: flex-end;
}

.manual-modal {
  width: 100%;
  padding: 32rpx 32rpx calc(32rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  background-color: var(--color-bg-panel);
  border-radius: 32rpx 32rpx 0 0;
}

.modal-title {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
  color: var(--color-text-primary);
}

.modal-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
}

.manual-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 28rpx 0;
}

.manual-input {
  display: flex;
  align-items: center;
  padding: 16rpx 18rpx;
  border: 2rpx solid var(--color-border);
  border-radius: 18rpx;
  background-color: var(--color-bg-page);
}

.manual-label {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  margin-right: 10rpx;
}

.manual-field {
  width: 88rpx;
  text-align: center;
  font-size: 30rpx;
  color: var(--color-text-primary);
}

.manual-unit {
  font-size: 22rpx;
  margin-left: 8rpx;
}

.manual-separator {
  margin: 0 18rpx;
  font-size: 34rpx;
  color: var(--color-text-tertiary);
}

.modal-actions {
  display: flex;
  gap: 16rpx;
}

.modal-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
}

.modal-btn.secondary {
  background-color: var(--color-bg-page);
  border: 2rpx solid var(--color-border);
  color: var(--color-text-secondary);
}

.modal-btn.primary {
  background-color: var(--color-primary);
  color: var(--color-text-primary);
}

.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: rgba(255,253,250,.96);
  box-shadow: 0 -8rpx 28rpx rgba(56,42,26,.08);
}

.btn-import {
  width: 100%;
  height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: var(--color-text-primary);
  font-size: 32rpx;
  font-weight: 700;
}

.btn-import.disabled {
  background: var(--color-text-disabled);
  color: var(--color-text-inverse);
}
</style>
