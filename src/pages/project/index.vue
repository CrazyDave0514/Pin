<template>
  <view class="project-page">
    <view class="header">
      <view class="title-row">
        <view v-if="currentFolder" class="back-btn" @click="goToParentFolder">
          <text>‹</text>
        </view>
        <view class="title-copy">
          <text class="page-title">{{ currentFolder ? currentFolder.name : '我的项目' }}</text>
          <text class="page-subtitle">{{ currentFolder ? currentFolderPath : '全部作品与文件夹' }}</text>
        </view>
        <view class="header-actions">
          <view class="icon-btn" @click="goToSearch">
            <image class="icon-img" src="/static/assets/v015/icons/search-muted.png" mode="aspectFit" />
          </view>
        </view>
      </view>
    </view>

    <scroll-view class="content-scroll" scroll-y>
      <view v-if="currentFolderPath" class="breadcrumb">{{ currentFolderPath }}</view>

      <view v-if="folderEntries.length || projectEntries.length" class="list-section">
        <view
          v-for="folder in folderEntries"
          :key="folder.id"
          class="entry-card folder-card"
          @click="openFolder(folder)"
        >
          <view class="entry-cover folder-cover">
            <image class="folder-cover-icon" src="/static/assets/v015/icons/project-muted.png" mode="aspectFit" />
          </view>
          <view class="entry-main">
            <view class="entry-name-row">
              <text class="entry-name">{{ folder.name }}</text>
              <view class="folder-badge">文件夹</view>
            </view>
            <text class="entry-meta">{{ formatDateTime(folder.updatedAt || folder.createdAt) }}</text>
          </view>
        </view>

        <view
          v-for="project in projectEntries"
          :key="project.id"
          class="entry-card project-card"
          @click="handleProjectClick(project)"
        >
          <view class="entry-cover project-cover">
            <image
              v-if="project.thumbnail"
              class="entry-cover-image"
              :src="project.thumbnail"
              mode="aspectFit"
            />
            <view v-else class="entry-cover-placeholder">
              <image class="placeholder-icon" src="/static/assets/v015/icons/blank-canvas-active.png" mode="aspectFit" />
            </view>
            <view class="status-chip" :class="project.isPublished ? 'published' : 'saved'">
              {{ project.isPublished ? '已发布' : '编辑中' }}
            </view>
          </view>

          <view class="entry-main">
            <view class="entry-name-row">
              <text class="entry-name">{{ project.name || '未命名作品' }}</text>
              <view class="entry-menu-btn" @click.stop="openActionSheet(project)">
                <text>•••</text>
              </view>
            </view>
            <text class="entry-meta">{{ formatDimensions(project) }} · {{ formatDateTime(project.updatedAt) }}</text>
            <text class="entry-meta" v-if="project.tags?.primary || project.tags?.secondary">{{ formatProjectTags(project.tags).join(' / ') }}</text>
          </view>
        </view>
      </view>

      <view v-else class="empty-state">
        <image class="empty-icon" src="/static/assets/v015/icons/project-muted.png" mode="aspectFit" />
        <text class="empty-title">{{ currentFolder ? '文件夹里还没有作品' : '还没有项目' }}</text>
        <text class="empty-subtitle">{{ currentFolder ? '从右下角继续新建或导入' : '先创建一个拼豆作品试试看' }}</text>
      </view>
    </scroll-view>

    <view class="fab" v-if="!showCreateSheet" @click="showCreateSheet = true">
      <text class="fab-plus">+</text>
    </view>

    <view v-if="showCreateSheet" class="modal-mask" @click="closeCreateSheet">
      <view class="bottom-sheet create-sheet" @click.stop>
        <view class="sheet-header">
          <text class="sheet-title">新建</text>
          <view class="sheet-close" @click="closeCreateSheet">
            <text>✕</text>
          </view>
        </view>
        <view class="sheet-list">
          <view class="sheet-item" @click="createCanvas('blank')">
            <image class="sheet-icon" src="/static/assets/v015/icons/blank-canvas-active.png" mode="aspectFit" />
            <view class="sheet-copy">
              <text class="sheet-item-title">新建空白画布</text>
              <text class="sheet-item-desc">从零开始创作图纸</text>
            </view>
          </view>
          <view class="sheet-item" @click="createCanvas('image')">
            <image class="sheet-icon" src="/static/assets/v015/icons/image-import-muted.png" mode="aspectFit" />
            <view class="sheet-copy">
              <text class="sheet-item-title">导入图片生成</text>
              <text class="sheet-item-desc">导入图片转换为拼豆图纸</text>
            </view>
          </view>
          <view class="sheet-item" @click="createCanvas('blueprint')">
            <image class="sheet-icon" src="/static/assets/v015/icons/blueprint-import-muted.png" mode="aspectFit" />
            <view class="sheet-copy">
              <text class="sheet-item-title">导入拼豆图纸</text>
              <text class="sheet-item-desc">识别已有图纸继续编辑</text>
            </view>
          </view>
          <view class="sheet-item" @click="createFolder">
            <image class="sheet-icon" src="/static/assets/v015/icons/project-muted.png" mode="aspectFit" />
            <view class="sheet-copy">
              <text class="sheet-item-title">新建文件夹</text>
              <text class="sheet-item-desc">整理你的项目与灵感</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showActionSheet" class="modal-mask" @click="closeActionSheet">
      <view class="bottom-sheet action-sheet" @click.stop>
        <view class="sheet-header">
          <text class="sheet-title">{{ currentProject?.name || '作品操作' }}</text>
          <view class="sheet-close" @click="closeActionSheet">
            <text>✕</text>
          </view>
        </view>
        <view class="action-grid">
          <view class="action-tile" @click="renameProject">
            <text class="action-emoji">Aa</text>
            <text class="action-label">重命名</text>
          </view>
          <view class="action-tile" @click="openFolderPicker('copy')">
            <text class="action-emoji">⧉</text>
            <text class="action-label">复制</text>
          </view>
          <view class="action-tile" @click="confirmDeleteProject">
            <text class="action-emoji">⌫</text>
            <text class="action-label danger">删除</text>
          </view>
          <view class="action-tile" :class="{ disabled: !folders.length }" @click="openFolderPicker('move')">
            <text class="action-emoji">⇄</text>
            <text class="action-label">移动</text>
          </view>
          <view class="action-tile" @click="currentProject?.isPublished ? unpublishProject() : openPublishModal()">
            <text class="action-emoji">{{ currentProject?.isPublished ? '↓' : '↑' }}</text>
            <text class="action-label">{{ currentProject?.isPublished ? '下架' : '发布' }}</text>
          </view>
          <view class="action-tile" @click="exportProject">
            <text class="action-emoji">⇩</text>
            <text class="action-label">导出</text>
          </view>
          <view class="action-tile" @click="shareProject">
            <text class="action-emoji">↗</text>
            <text class="action-label">分享</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showPublishModal" class="modal-mask" @click="closePublishModal">
      <view class="bottom-sheet publish-sheet" @click.stop>
        <view class="sheet-header">
          <text class="sheet-title">发布作品</text>
          <view class="sheet-close" @click="closePublishModal">
            <text>✕</text>
          </view>
        </view>
        <view class="publish-body">
          <text class="field-label">作品名称</text>
          <input v-model="publishName" class="field-input" placeholder="请输入作品名称" placeholder-class="placeholder" />

          <text class="field-label">积分数</text>
          <input v-model="publishPoints" class="field-input" type="number" placeholder="0-100" placeholder-class="placeholder" />

          <text class="field-label">一级标签</text>
          <scroll-view class="tag-scroll" scroll-x :show-scrollbar="false">
            <view class="tag-row">
              <view
                v-for="group in TAG_OPTIONS"
                :key="group.primary"
                :class="['tag-pill', publishTags.primary === group.primary ? 'active' : '']"
                @click="selectPrimaryTag(group.primary)"
              >
                <text>{{ group.primary }}</text>
              </view>
            </view>
          </scroll-view>

          <template v-if="secondaryOptions.length">
            <text class="field-label">二级标签</text>
            <view class="tag-wrap">
              <view
                v-for="item in secondaryOptions"
                :key="item"
                :class="['tag-pill', publishTags.secondary === item ? 'active' : '']"
                @click="publishTags.secondary = publishTags.secondary === item ? '' : item"
              >
                <text>{{ item }}</text>
              </view>
            </view>
          </template>

          <text class="publish-note">当前标签非必填，0 积分会展示为免费。</text>

          <view class="footer-actions">
            <view class="footer-btn secondary" @click="closePublishModal">取消</view>
            <view class="footer-btn primary" @click="confirmPublish">确认发布</view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showFolderPicker" class="modal-mask" @click="closeFolderPicker">
      <view class="bottom-sheet folder-sheet" @click.stop>
        <view class="sheet-header">
          <text class="sheet-title">{{ folderPickerAction === 'move' ? '移动到' : '复制到位置' }}</text>
          <view class="sheet-close" @click="closeFolderPicker">
            <text>✕</text>
          </view>
        </view>
        <scroll-view class="folder-scroll" scroll-y>
          <view class="folder-choice root" @click="selectFolderTarget('')">
            <text class="folder-choice-name">根目录</text>
          </view>
          <view
            v-for="folder in folders"
            :key="folder.id"
            class="folder-choice"
            @click="selectFolderTarget(folder.id)"
          >
            <text class="folder-choice-name">{{ folder.name }}</text>
            <text class="folder-choice-path">{{ buildFolderPath(folder.id) }}</text>
          </view>
          <view class="folder-choice new" @click="createFolderFromPicker">
            <text class="folder-choice-name">+ 新建文件夹</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
  TAG_OPTIONS,
  buildProjectThumbnail,
  normalizeProjectTags,
  projectTagsToList,
  publishProjectAsArtwork,
  syncProjectArtwork,
  unpublishProjectArtwork,
} from '../../utils/community'

type FolderRecord = {
  id: string
  name: string
  parentId?: string
  createdAt: number
  updatedAt: number
}

type ProjectRecord = {
  id: string
  name: string
  canvasData: any
  createdAt: number
  updatedAt: number
  thumbnail?: string
  folderId?: string
  tags?: { primary?: string; secondary?: string }
  isPublished?: boolean
  publishedArtworkId?: string
  publishPoints?: number
}

const projects = ref<ProjectRecord[]>([])
const folders = ref<FolderRecord[]>([])
const currentFolderId = ref('')
const showCreateSheet = ref(false)
const showActionSheet = ref(false)
const showPublishModal = ref(false)
const showFolderPicker = ref(false)
const currentProject = ref<ProjectRecord | null>(null)
const folderPickerAction = ref<'move' | 'copy'>('move')

const publishName = ref('')
const publishPoints = ref('0')
const publishTags = ref<{ primary?: string; secondary?: string }>({})

const currentFolder = computed(() => folders.value.find((item) => item.id === currentFolderId.value) || null)

const currentFolderPath = computed(() => buildFolderPath(currentFolderId.value))

const folderEntries = computed(() => {
  return folders.value
    .filter((item) => (item.parentId || '') === currentFolderId.value)
    .sort((a, b) => b.updatedAt - a.updatedAt)
})

const projectEntries = computed(() => {
  return projects.value
    .filter((item) => (item.folderId || '') === currentFolderId.value)
    .sort((a, b) => b.updatedAt - a.updatedAt)
})

const secondaryOptions = computed(() => {
  const group = TAG_OPTIONS.find((item) => item.primary === publishTags.value.primary)
  return group ? [...group.secondary] : []
})

onLoad((options) => {
  currentFolderId.value = options?.folderId || ''
})

onShow(() => {
  loadData()
})

onMounted(() => {
  uni.$on('projectSearchOpenFolder', handleOpenFolderFromSearch)
})

onUnmounted(() => {
  uni.$off('projectSearchOpenFolder', handleOpenFolderFromSearch)
})

const formatProjectTagsLocal = (tags: any) => projectTagsToList(normalizeProjectTags(tags))

const loadData = () => {
  projects.value = (uni.getStorageSync('pin_projects') || []).map((item: any) => ({
    ...item,
    folderId: item.folderId || '',
    tags: normalizeProjectTags(item.tags),
    thumbnail: item.thumbnail || buildProjectThumbnail(item.canvasData),
    updatedAt: item.updatedAt || item.createdAt || Date.now(),
  }))
  folders.value = (uni.getStorageSync('pin_folders') || []).map((item: any) => ({
    id: item.id,
    name: item.name || '未命名文件夹',
    parentId: item.parentId || '',
    createdAt: item.createdAt || Date.now(),
    updatedAt: item.updatedAt || item.createdAt || Date.now(),
  }))
}

const saveProjects = (next: ProjectRecord[]) => {
  projects.value = next
  uni.setStorageSync('pin_projects', next)
}

const saveFolders = (next: FolderRecord[]) => {
  folders.value = next
  uni.setStorageSync('pin_folders', next)
}

const formatDimensions = (project: ProjectRecord) => {
  const width = Number(project.canvasData?.width || 0)
  const height = Number(project.canvasData?.height || 0)
  return `${width}×${height}`
}

const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const buildFolderPath = (folderId: string) => {
  if (!folderId) return '根目录'
  const names: string[] = []
  let cursor = folders.value.find((item) => item.id === folderId)
  while (cursor) {
    names.unshift(cursor.name)
    cursor = folders.value.find((item) => item.id === cursor?.parentId)
  }
  return ['根目录', ...names].join(' / ')
}

const openFolder = (folder: FolderRecord) => {
  currentFolderId.value = folder.id
}

const handleOpenFolderFromSearch = (folderId: string) => {
  currentFolderId.value = folderId || ''
}

const goToParentFolder = () => {
  currentFolderId.value = currentFolder.value?.parentId || ''
}

const closeCreateSheet = () => {
  showCreateSheet.value = false
}

const goToSearch = () => {
  uni.navigateTo({ url: '/pages/search/index?mode=project' })
}

const createCanvas = (type: 'blank' | 'image' | 'blueprint') => {
  closeCreateSheet()
  if (type === 'blank') {
    uni.navigateTo({ url: '/pages/canvas-settings/index?type=blank&folderId=' + currentFolderId.value })
  } else if (type === 'image') {
    uni.navigateTo({ url: '/pages/image-import/index' })
  } else {
    uni.navigateTo({ url: '/pages/blueprint-import/index' })
  }
}

const askFolderName = (title: string, onConfirm: (name: string) => void) => {
  uni.showModal({
    title,
    editable: true,
    placeholderText: '请输入名称',
    success: (res) => {
      const name = String(res.content || '').trim()
      if (!res.confirm) return
      if (!name) {
        uni.showToast({ title: '名称不能为空', icon: 'none' })
        return
      }
      onConfirm(name)
    },
  })
}

const createFolder = () => {
  closeCreateSheet()
  askFolderName('新建文件夹', (name) => {
    const duplicated = folders.value.some((item) => item.parentId === currentFolderId.value && item.name === name)
    if (duplicated) {
      uni.showToast({ title: '文件夹名称重复', icon: 'none' })
      return
    }
    const now = Date.now()
    saveFolders([
      {
        id: `folder_${now}`,
        name,
        parentId: currentFolderId.value,
        createdAt: now,
        updatedAt: now,
      },
      ...folders.value,
    ])
    uni.showToast({ title: '创建成功', icon: 'success' })
  })
}

const createFolderFromPicker = () => {
  closeFolderPicker()
  askFolderName('新建文件夹', (name) => {
    const now = Date.now()
    saveFolders([
      {
        id: `folder_${now}`,
        name,
        parentId: currentFolderId.value,
        createdAt: now,
        updatedAt: now,
      },
      ...folders.value,
    ])
    uni.showToast({ title: '创建成功', icon: 'success' })
  })
}

const handleProjectClick = (project: ProjectRecord) => {
  if (project.isPublished) {
    uni.showToast({ title: '请先下架作品后才能进行编辑调整', icon: 'none', duration: 3000 })
    currentProject.value = project
    setTimeout(() => {
      showActionSheet.value = true
    }, 300)
    return
  }
  uni.navigateTo({ url: `/pages/canvas-editor/index?mode=edit&projectId=${project.id}` })
}

const openActionSheet = (project: ProjectRecord) => {
  currentProject.value = project
  showActionSheet.value = true
}

const closeActionSheet = () => {
  showActionSheet.value = false
}

const renameProject = () => {
  const project = currentProject.value
  closeActionSheet()
  if (!project) return
  askFolderName('重命名作品', (name) => {
    saveProjects(
      projects.value.map((item) => {
        if (item.id !== project.id) return item
        const next = {
          ...item,
          name,
          updatedAt: Date.now(),
        }
        if (next.isPublished) syncProjectArtwork(next)
        return next
      })
    )
    uni.showToast({ title: '重命名成功', icon: 'success' })
  })
}

const openFolderPicker = (action: 'move' | 'copy') => {
  if (action === 'move' && !folders.value.length) {
    uni.showToast({ title: '暂无可移动目标文件夹', icon: 'none' })
    return
  }
  folderPickerAction.value = action
  showActionSheet.value = false
  showFolderPicker.value = true
}

const closeFolderPicker = () => {
  showFolderPicker.value = false
}

const selectFolderTarget = (folderId: string) => {
  const project = currentProject.value
  closeFolderPicker()
  if (!project) return

  if (folderPickerAction.value === 'move') {
    saveProjects(projects.value.map((item) => (
      item.id === project.id
        ? { ...item, folderId, updatedAt: Date.now() }
        : item
    )))
    uni.showToast({ title: '移动成功', icon: 'success' })
    return
  }

  const now = Date.now()
  const copiedProject = {
    ...JSON.parse(JSON.stringify(project)),
    id: `project_${now}`,
    name: `${project.name || '未命名作品'}V2`,
    folderId,
    isPublished: false,
    publishedArtworkId: '',
    publishPoints: 0,
    updatedAt: now,
    createdAt: now,
  }
  saveProjects([copiedProject, ...projects.value])
  uni.showToast({ title: '复制成功', icon: 'success' })
}

const openPublishModal = () => {
  const project = currentProject.value
  showActionSheet.value = false
  if (!project) return
  publishName.value = project.name || ''
  publishPoints.value = String(project.publishPoints || 0)
  publishTags.value = { ...normalizeProjectTags(project.tags) }
  showPublishModal.value = true
}

const closePublishModal = () => {
  showPublishModal.value = false
}

const selectPrimaryTag = (primary: string) => {
  publishTags.value = {
    primary: publishTags.value.primary === primary ? '' : primary,
    secondary: '',
  }
}

const confirmPublish = () => {
  const project = currentProject.value
  if (!project) return
  const points = Number(publishPoints.value)
  const name = publishName.value.trim()
  if (!name) {
    uni.showToast({ title: '请输入作品名称', icon: 'none' })
    return
  }
  if (!Number.isFinite(points) || points < 0 || points > 100) {
    uni.showToast({ title: '请输入0-100积分', icon: 'none' })
    return
  }

  const updatedProject = {
    ...project,
    name,
    tags: normalizeProjectTags(publishTags.value),
    publishPoints: Math.floor(points),
    isPublished: true,
    status: 'saved',
    thumbnail: project.thumbnail || buildProjectThumbnail(project.canvasData),
    updatedAt: Date.now(),
  }
  const artwork = publishProjectAsArtwork(updatedProject, updatedProject.publishPoints)
  updatedProject.publishedArtworkId = artwork.id
  saveProjects(projects.value.map((item) => (item.id === project.id ? updatedProject : item)))
  currentProject.value = updatedProject
  closePublishModal()
  uni.showToast({ title: '发布成功', icon: 'success' })
}

const unpublishProject = () => {
  const project = currentProject.value
  closeActionSheet()
  if (!project) return
  uni.showModal({
    title: '确认下架',
    content: '下架后作品将不在首页社区展示，已购买用户不受影响。',
    success: (res) => {
      if (!res.confirm) return
      unpublishProjectArtwork(project.id)
      saveProjects(projects.value.map((item) => (
        item.id === project.id
          ? { ...item, isPublished: false, updatedAt: Date.now() }
          : item
      )))
      uni.showToast({ title: '已下架', icon: 'success' })
    },
  })
}

const confirmDeleteProject = () => {
  const project = currentProject.value
  closeActionSheet()
  if (!project) return
  uni.showModal({
    title: '确认删除该作品？',
    content: '删除后不可恢复',
    success: (res) => {
      if (!res.confirm) return
      if (project.isPublished) {
        unpublishProjectArtwork(project.id)
      }
      saveProjects(projects.value.filter((item) => item.id !== project.id))
      uni.showToast({ title: '删除成功', icon: 'success' })
    },
  })
}

const exportProject = () => {
  const project = currentProject.value
  closeActionSheet()
  if (!project) return
  uni.navigateTo({ url: `/pages/canvas-editor/index?mode=edit&projectId=${project.id}&autoExport=1` })
}

const shareProject = () => {
  closeActionSheet()
  uni.showToast({ title: '功能正在完善中', icon: 'none' })
}

// keep template references simple
const formatProjectTags = formatProjectTagsLocal
</script>

<style scoped>
.project-page {
  min-height: 100vh;
  background: var(--color-bg-page);
  position: relative;
}

.header {
  padding: 24rpx;
  padding-bottom: 12rpx;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.back-btn,
.icon-btn,
.sheet-close,
.entry-menu-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn,
.icon-btn {
  background: var(--color-bg-panel);
  border: 2rpx solid var(--color-border);
}

.back-btn text,
.entry-menu-btn text {
  font-size: 34rpx;
  color: var(--color-text-primary);
}

.title-copy {
  flex: 1;
  min-width: 0;
}

.page-title {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: var(--color-text-primary);
}

.page-subtitle,
.breadcrumb {
  display: block;
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

.header-actions {
  display: flex;
}

.icon-img,
.sheet-icon,
.folder-cover-icon,
.placeholder-icon {
  width: 34rpx;
  height: 34rpx;
  display: block;
}

.content-scroll {
  height: calc(100vh - 120rpx);
  padding: 0 24rpx 180rpx;
  box-sizing: border-box;
}

.breadcrumb {
  margin-bottom: 16rpx;
}

.list-section {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.entry-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  border-radius: 24rpx;
  background: var(--color-bg-panel);
  border: 2rpx solid var(--color-border);
  box-shadow: var(--shadow-md);
}

.entry-cover {
  width: 132rpx;
  height: 132rpx;
  border-radius: 24rpx;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}

.folder-cover {
  background: linear-gradient(160deg, rgba(245,166,35,.18), rgba(255,253,250,.88));
  border: 2rpx solid rgba(245,166,35,.24);
  display: flex;
  align-items: center;
  justify-content: center;
}

.project-cover {
  background:
    linear-gradient(90deg, rgba(35,31,26,.06) 1px, transparent 1px),
    linear-gradient(180deg, rgba(35,31,26,.06) 1px, transparent 1px),
    rgba(255,253,250,.92);
  background-size: 18rpx 18rpx;
  border: 2rpx solid var(--color-border);
}

.entry-cover-image {
  width: 100%;
  height: 100%;
  display: block;
}

.entry-cover-placeholder {
  width: 100%;
  height: 100%;
  background: rgba(35,31,26,.04);
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-chip {
  position: absolute;
  right: 10rpx;
  top: 10rpx;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
}

.status-chip.saved {
  background: rgba(255,255,255,.86);
  color: var(--color-text-secondary);
}

.status-chip.published {
  background: rgba(245,166,35,.92);
  color: #2b2114;
}

.entry-main {
  flex: 1;
  min-width: 0;
}

.entry-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 10rpx;
}

.entry-name {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--color-text-primary);
}

.folder-badge {
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.entry-meta {
  display: block;
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  line-height: 1.5;
}

.entry-menu-btn {
  background: rgba(35,31,26,.04);
}

.empty-state {
  padding-top: 220rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  width: 116rpx;
  height: 116rpx;
  margin-bottom: 24rpx;
  opacity: .72;
}

.empty-title {
  font-size: 32rpx;
  color: var(--color-text-primary);
  font-weight: 700;
  margin-bottom: 10rpx;
}

.empty-subtitle {
  font-size: 26rpx;
  color: var(--color-text-tertiary);
}

.fab {
  position: fixed;
  right: 24rpx;
  bottom: calc(132rpx + env(safe-area-inset-bottom));
  width: 108rpx;
  height: 108rpx;
  border-radius: 50%;
  background: #f5a623;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 18rpx 36rpx rgba(245, 166, 35, .28);
  z-index: 20;
}

.fab-plus {
  font-size: 54rpx;
  color: #2b2114;
  line-height: 1;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(17, 13, 9, .46);
  display: flex;
  align-items: flex-end;
  z-index: 40;
}

.bottom-sheet {
  width: 100%;
  background: var(--color-bg-panel);
  border-radius: 32rpx 32rpx 0 0;
  box-sizing: border-box;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--color-text-primary);
}

.sheet-close {
  background: rgba(35,31,26,.05);
}

.sheet-close text {
  font-size: 28rpx;
}

.sheet-list {
  padding: 0 24rpx 24rpx;
}

.sheet-item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 20rpx;
  border-radius: 22rpx;
  border: 2rpx solid var(--color-border);
  margin-bottom: 14rpx;
}

.sheet-copy {
  flex: 1;
}

.sheet-item-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--color-text-primary);
}

.sheet-item-desc {
  display: block;
  font-size: 22rpx;
  color: var(--color-text-tertiary);
  margin-top: 4rpx;
}

.action-grid {
  padding: 0 24rpx 24rpx;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16rpx;
}

.action-tile {
  min-height: 146rpx;
  border-radius: 22rpx;
  background: rgba(35,31,26,.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.action-tile.disabled {
  opacity: .35;
}

.action-emoji {
  font-size: 34rpx;
  color: var(--color-text-primary);
}

.action-label {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}

.action-label.danger {
  color: var(--color-error);
}

.publish-body {
  padding: 0 24rpx 24rpx;
}

.field-label {
  display: block;
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-bottom: 12rpx;
  margin-top: 18rpx;
}

.field-input {
  height: 84rpx;
  padding: 0 20rpx;
  border-radius: 18rpx;
  background: rgba(35,31,26,.04);
  border: 2rpx solid var(--color-border);
  font-size: 28rpx;
  color: var(--color-text-primary);
}

.placeholder {
  color: var(--color-text-disabled);
}

.tag-scroll {
  width: 100%;
  white-space: nowrap;
}

.tag-row,
.tag-wrap {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.tag-pill {
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(35,31,26,.05);
  color: var(--color-text-secondary);
  font-size: 24rpx;
}

.tag-pill.active {
  background: rgba(245,166,35,.18);
  color: var(--color-primary-dark);
  border: 2rpx solid rgba(245,166,35,.4);
}

.publish-note {
  display: block;
  margin-top: 18rpx;
  font-size: 22rpx;
  color: var(--color-text-tertiary);
}

.footer-actions {
  display: flex;
  gap: 14rpx;
  margin-top: 24rpx;
}

.footer-btn {
  flex: 1;
  height: 76rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
}

.footer-btn.secondary {
  background: rgba(35,31,26,.05);
  color: var(--color-text-secondary);
}

.footer-btn.primary {
  background: #f5a623;
  color: #2b2114;
}

.folder-scroll {
  max-height: 56vh;
  padding: 0 24rpx 24rpx;
  box-sizing: border-box;
}

.folder-choice {
  padding: 22rpx 0;
  border-bottom: 1rpx solid var(--color-divider);
}

.folder-choice.new {
  color: var(--color-primary-dark);
}

.folder-choice-name {
  display: block;
  font-size: 28rpx;
  color: var(--color-text-primary);
}

.folder-choice-path {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--color-text-tertiary);
}
</style>
