<template>
  <view class="project-page">
    <view class="header">
      <view class="title-row">
        <view v-if="currentFolder" class="back-btn" @click="goToParentFolder">
          <text>‹</text>
        </view>
        <view class="title-copy">
          <text class="page-title">{{ currentFolder ? currentFolder.name : '我的项目' }}</text>
          <text class="page-subtitle">{{ currentFolder ? currentFolderSubtitle : '全部作品与文件夹' }}</text>
        </view>
        <view class="header-actions">
          <view class="icon-btn" @click="goToSearch">
            <image class="icon-img" src="/static/assets/v015/icons/search-muted.png" mode="aspectFit" />
          </view>
        </view>
      </view>
    </view>

    <scroll-view class="content-scroll" scroll-y>
      <view class="content-inner">
      <view v-if="currentFolder?.parentId" class="breadcrumb">{{ currentFolderPath }}</view>

      <view v-if="folderEntries.length || projectEntries.length" class="list-section">
        <view
          v-for="folder in folderEntries"
          :key="folder.id"
          class="entry-card folder-card"
          @click="openFolder(folder)"
        >
          <view class="entry-cover folder-cover">
            <image class="folder-cover-icon" src="/static/assets/v015/icons/project.png" mode="aspectFit" />
          </view>
          <view class="entry-main">
            <view class="entry-name-row">
              <text class="entry-name">{{ folder.name }}</text>
              <view class="folder-badge">文件夹</view>
              <view class="entry-menu-btn" @click.stop="openFolderActionSheet(folder)">
                <text>•••</text>
              </view>
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
              v-if="hasProjectPreview(project)"
              class="entry-cover-image"
              :src="project.thumbnail"
              mode="aspectFit"
            />
            <view v-else class="entry-cover-placeholder">
              <image class="placeholder-icon" src="/static/assets/v015/icons/blank-canvas-active.png" mode="aspectFit" />
            </view>
            <view class="status-chip" :class="resolveProjectStatusClass(project)">
              {{ resolveProjectStatusText(project) }}
            </view>
          </view>

          <view class="entry-main">
            <view class="entry-name-row">
              <text class="entry-name">{{ project.name || '未命名作品' }}</text>
              <view class="entry-menu-btn" @click.stop="openActionSheet(project)">
                <text>•••</text>
              </view>
            </view>
            <text class="entry-meta">{{ formatProjectSpecs(project) }}</text>
            <text class="entry-meta">{{ formatDateTime(project.updatedAt) }}</text>
            <text class="entry-meta" v-if="project.tags?.primary || project.tags?.secondary">{{ formatProjectTags(project.tags).join(' / ') }}</text>
          </view>
        </view>
      </view>

      <view v-else class="empty-state">
        <image class="empty-icon" src="/static/assets/v015/icons/project-muted.png" mode="aspectFit" />
        <text class="empty-title">{{ currentFolder ? '文件夹里还没有作品' : '还没有项目' }}</text>
        <text class="empty-subtitle">{{ currentFolder ? '从右下角继续新建或导入' : '先创建一个拼豆作品试试看' }}</text>
      </view>
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
        <scroll-view class="sheet-scroll" scroll-y>
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
        </scroll-view>
      </view>
    </view>

    <view v-if="showActionSheet" class="modal-mask" @click="closeActionSheet">
      <view class="bottom-sheet action-sheet" @click.stop>
        <view class="sheet-header">
          <text class="sheet-title">{{ currentActionType === 'folder' ? (currentFolderEntry?.name || '文件夹操作') : (currentProject?.name || '作品操作') }}</text>
          <view class="sheet-close" @click="closeActionSheet">
            <text>✕</text>
          </view>
        </view>
        <scroll-view class="sheet-scroll" scroll-y>
          <view v-if="currentActionType === 'folder'" class="action-grid">
          <view class="action-tile" @click="renameFolder">
            <text class="action-emoji">Aa</text>
            <text class="action-label">重命名</text>
          </view>
          <view class="action-tile" @click="copyFolder">
            <text class="action-emoji">⧉</text>
            <text class="action-label">复制</text>
          </view>
          <view class="action-tile" @click="openFolderPicker('move-folder')">
            <text class="action-emoji">⇄</text>
            <text class="action-label">移动</text>
          </view>
          <view class="action-tile" @click="showFolderDetails">
            <text class="action-emoji">ⓘ</text>
            <text class="action-label">详情</text>
          </view>
          <view class="action-tile" @click="exportFolder">
            <text class="action-emoji">⇩</text>
            <text class="action-label">导出</text>
          </view>
          <view class="action-tile" @click="confirmDeleteFolder">
            <text class="action-emoji">⌫</text>
            <text class="action-label danger">删除</text>
          </view>
          </view>
          <view v-else class="action-grid">
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
        </scroll-view>
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
        <scroll-view class="sheet-scroll" scroll-y>
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
        </scroll-view>
      </view>
    </view>

    <view v-if="showFolderPicker" class="modal-mask" @click="closeFolderPicker">
      <view class="bottom-sheet folder-sheet" @click.stop>
        <view class="sheet-header">
          <text class="sheet-title">{{ folderPickerAction === 'move' || folderPickerAction === 'move-folder' ? '移动到' : '复制到位置' }}</text>
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
} from '../../utils/community'
import { downloadBlob, exportBlueprintAsBlob } from '../../utils/blueprint-export'
import { getJsZip } from '../../utils/jszip'
import { communityService, projectService } from '../../services/pin/index'
import { checkLogin } from '../../utils/auth-guard'
import type { FolderRecord, ProjectRecord } from '../../services/pin/types'

const projects = ref<ProjectRecord[]>([])
const folders = ref<FolderRecord[]>([])
const currentFolderId = ref('')
const showCreateSheet = ref(false)
const showActionSheet = ref(false)
const showPublishModal = ref(false)
const showFolderPicker = ref(false)
const currentProject = ref<ProjectRecord | null>(null)
const currentFolderEntry = ref<FolderRecord | null>(null)
const currentActionType = ref<'project' | 'folder'>('project')
const folderPickerAction = ref<'move' | 'copy' | 'move-folder'>('move')

const publishName = ref('')
const publishPoints = ref('0')
const publishTags = ref<{ primary?: string; secondary?: string }>({})

const currentFolder = computed(() => folders.value.find((item) => item.id === currentFolderId.value) || null)

const currentFolderPath = computed(() => buildFolderPath(currentFolderId.value))
const currentFolderSubtitle = computed(() => buildFolderPath(currentFolder.value?.parentId || '') || '当前文件夹')

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
  void loadData()
})

onMounted(() => {
  uni.$on('projectSearchOpenFolder', handleOpenFolderFromSearch)
})

onUnmounted(() => {
  uni.$off('projectSearchOpenFolder', handleOpenFolderFromSearch)
})

const formatProjectTagsLocal = (tags: any) => projectTagsToList(normalizeProjectTags(tags))

const loadData = async () => {
  projects.value = await projectService.getProjects()
  folders.value = await projectService.getFolders()
}

const saveProjects = async (next: ProjectRecord[]) => {
  projects.value = next
  await projectService.saveProjects(next)
}

const saveFolders = async (next: FolderRecord[]) => {
  folders.value = next
  await projectService.saveFolders(next)
}

const formatDimensions = (project: ProjectRecord) => {
  const width = Number(project.canvasData?.width || 0)
  const height = Number(project.canvasData?.height || 0)
  return `${width}×${height}`
}

const getProjectBeadCount = (project: ProjectRecord) => {
  return Array.isArray(project.canvasData?.beads) ? project.canvasData.beads.length : 0
}

const getProjectColorTypes = (project: ProjectRecord) => {
  return new Set((project.canvasData?.beads || []).map((item: any) => item.color)).size
}

const formatProjectSpecs = (project: ProjectRecord) => {
  return `${formatDimensions(project)}格｜${getProjectBeadCount(project)}豆｜${getProjectColorTypes(project)}种色号`
}

const hasProjectPreview = (project: ProjectRecord) => {
  return Boolean(project.thumbnail)
}

const safeProjectThumbnail = (project: ProjectRecord) => {
  const hasBeads = Array.isArray(project?.canvasData?.beads) && project.canvasData.beads.length > 0
  if (!hasBeads) return ''
  return project.thumbnail || buildProjectThumbnail(project.canvasData)
}

const resolveProjectStatusText = (project: ProjectRecord) => {
  if (project.isPublished) return '已发布'
  if (project.isOffShelf) return '已下架'
  return '编辑中'
}

const resolveProjectStatusClass = (project: ProjectRecord) => {
  if (project.isPublished) return 'published'
  if (project.isOffShelf) return 'off-shelf'
  return 'saved'
}

const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const buildFolderPath = (folderId: string) => {
  if (!folderId) return ''
  const names: string[] = []
  let cursor = folders.value.find((item) => item.id === folderId)
  while (cursor) {
    names.unshift(cursor.name)
    cursor = folders.value.find((item) => item.id === cursor?.parentId)
  }
  return names.join(' / ')
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

/**
 * 创建画布 - 需要登录
 */
const createCanvas = (type: 'blank' | 'image' | 'blueprint') => {
  // 检查登录状态
  if (!checkLogin({ message: '创建项目需要登录后才能操作' })) {
    return
  }
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

/**
 * 创建文件夹 - 需要登录
 */
const createFolder = () => {
  // 检查登录状态
  if (!checkLogin({ message: '创建文件夹需要登录后才能操作' })) {
    return
  }
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
    const exists = folders.value.some((item) => (
      item.parentId === currentFolderId.value && item.name.trim() === name
    ))
    if (exists) {
      uni.showToast({ title: '当前目录下已存在同名文件夹', icon: 'none' })
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
  currentActionType.value = 'project'
  currentFolderEntry.value = null
  currentProject.value = project
  showActionSheet.value = true
}

const openFolderActionSheet = (folder: FolderRecord) => {
  currentActionType.value = 'folder'
  currentProject.value = null
  currentFolderEntry.value = folder
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

const openFolderPicker = (action: 'move' | 'copy' | 'move-folder') => {
  if ((action === 'move' || action === 'move-folder') && !folders.value.length) {
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

const isFolderDescendant = (sourceId: string, targetId: string) => {
  let currentId = targetId
  let guard = 0

  while (currentId && guard < 64) {
    if (currentId === sourceId) return true
    const folder = folders.value.find((item) => item.id === currentId)
    if (!folder) break
    currentId = folder.parentId || ''
    guard += 1
  }

  return false
}

const selectFolderTarget = (folderId: string) => {
  closeFolderPicker()
  if (folderPickerAction.value === 'move-folder') {
    const folder = currentFolderEntry.value
    if (!folder) return
    if (folder.id === folderId) {
      uni.showToast({ title: '不能移动到当前文件夹', icon: 'none' })
      return
    }
    if (folderId && isFolderDescendant(folder.id, folderId)) {
      uni.showToast({ title: '不能移动到子文件夹内', icon: 'none' })
      return
    }
    saveFolders(folders.value.map((item) => (
      item.id === folder.id
        ? { ...item, parentId: folderId, updatedAt: Date.now() }
        : item
    )))
    uni.showToast({ title: '移动成功', icon: 'success' })
    return
  }

  const project = currentProject.value
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
    isOffShelf: false,
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

const confirmPublish = async () => {
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
    isOffShelf: false,
    status: 'saved',
    thumbnail: safeProjectThumbnail(project),
    updatedAt: Date.now(),
  }
  const artwork = await communityService.publishProjectAsArtwork(updatedProject, updatedProject.publishPoints)
  updatedProject.publishedArtworkId = artwork.id
  await saveProjects(projects.value.map((item) => (item.id === project.id ? updatedProject : item)))
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
      void communityService.unpublishProjectArtwork(project.id)
      const nextProjects = projects.value.map((item) => (
        item.id === project.id
          ? { ...item, isPublished: false, isOffShelf: true, updatedAt: Date.now() }
          : item
      ))
      void saveProjects(nextProjects)
      currentProject.value = nextProjects.find((item) => item.id === project.id) || null
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
    success: async (res) => {
      if (!res.confirm) return
      if (project.isPublished) {
        await communityService.unpublishProjectArtwork(project.id)
      }
      await saveProjects(projects.value.filter((item) => item.id !== project.id))
      uni.showToast({ title: '删除成功', icon: 'success' })
    },
  })
}

const exportProject = async () => {
  const project = currentProject.value
  closeActionSheet()
  if (!project) return
  const creatorName = await projectService.getProjectOwnerName()
  // #ifdef H5
  uni.showLoading({ title: '正在导出...' })
  exportBlueprintAsBlob({
    projectId: project.id,
    name: project.name || '未命名作品',
    creatorName,
    updatedAt: project.updatedAt,
    points: project.publishPoints || 0,
    canvasData: project.canvasData,
  }).then(({ blob, fileName }) => {
    downloadBlob(blob, fileName)
    uni.showToast({ title: '导出完成', icon: 'success' })
  }).catch((error) => {
    console.error(error)
    uni.showToast({ title: '导出失败', icon: 'none' })
  }).finally(() => {
    uni.hideLoading()
  })
  // #endif

  // #ifndef H5
  uni.navigateTo({ url: `/pages/canvas-editor/index?mode=edit&projectId=${project.id}&autoExport=1` })
  // #endif
}

const shareProject = () => {
  closeActionSheet()
  uni.showToast({ title: '功能正在完善中', icon: 'none' })
}

const renameFolder = () => {
  const folder = currentFolderEntry.value
  closeActionSheet()
  if (!folder) return
  askFolderName('重命名文件夹', (name) => {
    saveFolders(folders.value.map((item) => (
      item.id === folder.id
        ? { ...item, name, updatedAt: Date.now() }
        : item
    )))
    uni.showToast({ title: '重命名成功', icon: 'success' })
  })
}

const copyFolder = () => {
  const folder = currentFolderEntry.value
  closeActionSheet()
  if (!folder) return
  const now = Date.now()
  const siblingNames = folders.value
    .filter((item) => item.parentId === folder.parentId)
    .map((item) => item.name)
  let copyName = `${folder.name}副本`
  let index = 2
  while (siblingNames.includes(copyName)) {
    copyName = `${folder.name}副本${index}`
    index += 1
  }
  saveFolders([
    {
      ...folder,
      id: `folder_${now}`,
      name: copyName,
      createdAt: now,
      updatedAt: now,
    },
    ...folders.value,
  ])
  uni.showToast({ title: '复制成功', icon: 'success' })
}

const getFolderProjects = (folderId: string) => {
  return projects.value.filter((item) => (item.folderId || '') === folderId)
}

const estimateProjectSize = (project: ProjectRecord) => {
  const beadBytes = Array.isArray(project.canvasData?.beads) ? project.canvasData.beads.length * 24 : 0
  return 1024 + beadBytes
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const showFolderDetails = () => {
  const folder = currentFolderEntry.value
  closeActionSheet()
  if (!folder) return
  const items = getFolderProjects(folder.id)
  const totalSize = items.reduce((sum, item) => sum + estimateProjectSize(item), 0)
  uni.showModal({
    title: folder.name,
    content: `创建时间：${formatDateTime(folder.createdAt)}\n修改时间：${formatDateTime(folder.updatedAt)}\n文件数量：${items.length}\n估算大小：${formatBytes(totalSize)}`,
    showCancel: false,
  })
}

const confirmDeleteFolder = () => {
  const folder = currentFolderEntry.value
  closeActionSheet()
  if (!folder) return
  uni.showModal({
    title: '确认删除该文件夹？',
    content: '文件夹内作品会移动到根目录，不会被删除。',
    success: (res) => {
      if (!res.confirm) return
      saveFolders(folders.value.filter((item) => item.id !== folder.id))
      saveProjects(projects.value.map((item) => (
        item.folderId === folder.id
          ? { ...item, folderId: '', updatedAt: Date.now() }
          : item
      )))
      if (currentFolderId.value === folder.id) {
        currentFolderId.value = ''
      }
      uni.showToast({ title: '删除成功', icon: 'success' })
    },
  })
}

const exportFolder = async () => {
  const folder = currentFolderEntry.value
  closeActionSheet()
  if (!folder) return
  // #ifdef H5
  const jszip = await getJsZip()
  if (!jszip) {
    uni.showToast({ title: 'ZIP 库加载失败', icon: 'none' })
    return
  }
  const folderProjects = getFolderProjects(folder.id)
  if (!folderProjects.length) {
    uni.showToast({ title: '文件夹内暂无作品', icon: 'none' })
    return
  }
  uni.showLoading({ title: '正在打包导出...' })
  try {
    const zip = new jszip()
    for (let index = 0; index < folderProjects.length; index += 1) {
      const project = folderProjects[index]
      uni.showLoading({ title: `正在导出 ${index + 1}/${folderProjects.length}` })
      const { blob, fileName } = await exportBlueprintAsBlob({
        projectId: project.id,
        name: project.name || '未命名作品',
        creatorName: await projectService.getProjectOwnerName(),
        updatedAt: project.updatedAt,
        points: project.publishPoints || 0,
        canvasData: project.canvasData,
      })
      zip.file(fileName, blob)
    }
    const archive = await zip.generateAsync({ type: 'blob' })
    downloadBlob(archive, `${folder.name || '文件夹'}.zip`)
    uni.showToast({ title: '导出完成', icon: 'success' })
  } catch (error) {
    console.error(error)
    uni.showToast({ title: '导出失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
  // #endif

  // #ifndef H5
  uni.showToast({ title: '当前平台暂不支持 ZIP 导出', icon: 'none' })
  // #endif
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
  padding-bottom: calc(180rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.content-inner {
  padding: 0 24rpx;
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
  background: linear-gradient(180deg, #FFF7DA 0%, #FFE5A7 100%);
  border: 2rpx solid rgba(245,166,35,.3);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 10rpx 24rpx rgba(255,255,255,.32);
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
  min-width: 72rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-chip.saved {
  background: rgba(255,255,255,.86);
  color: var(--color-text-secondary);
}

.status-chip.published {
  background: rgba(245,166,35,.92);
  color: #2b2114;
}

.status-chip.off-shelf {
  background: rgba(35,31,26,.72);
  color: #fffdfa;
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

:deep(.uni-modal__bd) {
  text-align: left !important;
  white-space: pre-line;
  line-height: 1.7;
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
  bottom: calc(132rpx + constant(safe-area-inset-bottom));
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
  max-height: calc(100vh - 160rpx);
  margin-bottom: calc(constant(safe-area-inset-bottom) + 88rpx);
  margin-bottom: calc(env(safe-area-inset-bottom) + 88rpx);
  padding-bottom: 12rpx;
  display: flex;
  flex-direction: column;
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
  padding: 0 24rpx 12rpx;
}

.sheet-scroll {
  flex: 1;
  min-height: 0;
  padding-bottom: 12rpx;
  box-sizing: border-box;
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
  padding: 0 24rpx 12rpx;
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
  padding: 0 24rpx 12rpx;
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
  padding: 0 24rpx 12rpx;
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
