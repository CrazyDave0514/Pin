<template>
  <view class="project-page">
    <!-- 顶部区域 -->
    <view class="header">
      <text class="title">我的项目</text>
      <text class="count" v-if="projects.length > 0">{{ projects.length }} 个项目</text>
    </view>

    <!-- 操作栏 -->
    <view class="action-bar">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          v-model="searchKeyword"
          placeholder="搜索项目名称"
          placeholder-class="placeholder"
        />
      </view>
      <view class="action-buttons">
        <text class="action-btn select-btn" @click="toggleSelectMode">
          {{ isSelectMode ? '完成' : '选择' }}
        </text>
        <text class="action-btn new-btn" @click="showCreateModal">+ 新建</text>
      </view>
    </view>

    <!-- 项目列表 -->
    <scroll-view class="project-list" scroll-y v-if="filteredProjects.length > 0">
      <view
        class="project-card"
        v-for="project in filteredProjects"
        :key="project.id"
        :class="{ selected: selectedProjects.includes(project.id) }"
        @click="handleProjectClick(project)"
        @longpress="showProjectMenu(project)"
      >
        <!-- 多选模式复选框 -->
        <view class="checkbox" v-if="isSelectMode" @click.stop="toggleSelect(project.id)">
          <text v-if="selectedProjects.includes(project.id)">✓</text>
        </view>

        <!-- 项目缩略图 -->
        <view class="thumbnail">
          <text class="thumbnail-placeholder" v-if="!project.thumbnail">{{ project.name?.charAt(0) || 'P' }}</text>
          <image v-else :src="project.thumbnail" mode="aspectFill" class="thumbnail-img" />
        </view>

        <!-- 项目信息 -->
        <view class="info">
          <text class="project-name">{{ project.name }}</text>
          <text class="project-size">{{ project.canvasData?.width || 0 }}×{{ project.canvasData?.height || 0 }}</text>
          <text class="project-time">{{ formatTime(project.updatedAt) }}</text>
        </view>

        <!-- 状态标签 -->
        <view class="status-badge" :class="project.status">
          {{ project.status === 'saved' ? '已保存' : '草稿' }}
        </view>

        <!-- 操作菜单按钮 -->
        <view class="menu-btn" @click.stop="showProjectMenu(project)" v-if="!isSelectMode">
          <text>⋮</text>
        </view>
      </view>
    </scroll-view>

    <!-- 空状态 -->
    <view class="empty-state" v-else>
      <text class="empty-icon">📁</text>
      <text class="empty-text">还没有项目</text>
      <text class="empty-subtext">开始创作你的第一个作品吧</text>
      <button class="start-btn" @click="showCreateModal">开始创作</button>
    </view>

    <!-- 底部多选操作栏 -->
    <view class="select-action-bar" v-if="isSelectMode && selectedProjects.length > 0">
      <text class="selected-count">已选择 {{ selectedProjects.length }} 个</text>
      <view class="select-actions">
        <text class="select-action" @click="copySelected">复制</text>
        <text class="select-action" @click="moveSelected">移动</text>
        <text class="select-action delete" @click="deleteSelected">删除</text>
        <text class="select-action" @click="selectAll">{{ isAllSelected ? '取消全选' : '全选' }}</text>
      </view>
    </view>

    <!-- 开始创作弹窗 -->
    <view class="modal-overlay" v-if="showModal" @click="closeModal">
      <view class="create-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">开始创作</text>
          <text class="modal-close" @click="closeModal">✕</text>
        </view>

        <view class="modal-content">
          <!-- 无需导入（主要方式） -->
          <view class="create-option primary" @click="createCanvas('blank')">
            <view class="option-icon">➕</view>
            <view class="option-text">
              <text class="option-title">无需导入</text>
              <text class="option-desc">建立空白画布，从零开始创作</text>
            </view>
          </view>

          <!-- 小红书链接导入 -->
          <view class="create-option" @click="importFromXiaohongshu">
            <view class="option-icon">🔗</view>
            <view class="option-text">
              <text class="option-title">从小红书链接导入 <text class="new-tag">NEW</text></text>
              <text class="option-desc">粘贴小红书链接获取高清图纸</text>
            </view>
          </view>

          <!-- 导入图片生成 -->
          <view class="create-option" @click="createCanvas('image')">
            <view class="option-icon">🖼️</view>
            <view class="option-text">
              <text class="option-title">导入图片生成</text>
              <text class="option-desc">导入图片和像素图，生成拼豆图纸</text>
            </view>
          </view>

          <!-- 导入已有拼豆图纸 -->
          <view class="create-option" @click="createCanvas('blueprint')">
            <view class="option-icon">📐</view>
            <view class="option-text">
              <text class="option-title">导入已有拼豆图纸</text>
              <text class="option-desc">要求图纸清晰</text>
            </view>
          </view>

          <view class="divider"></view>

          <!-- 新建文件夹 -->
          <view class="create-option folder" @click="createFolder">
            <view class="option-icon">📁</view>
            <view class="option-text">
              <text class="option-title">新建文件夹</text>
              <text class="option-desc">请输入文件夹名称</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 项目操作菜单 -->
    <view class="modal-overlay" v-if="showMenu" @click="closeMenu">
      <view class="action-sheet" @click.stop>
        <view class="action-item" @click="renameProject">
          <text>重命名</text>
        </view>
        <view class="action-item" @click="moveProject">
          <text>移动</text>
        </view>
        <view class="action-item" @click="copyProject">
          <text>复制</text>
        </view>
        <view class="action-item danger" @click="deleteProject">
          <text>删除</text>
        </view>
        <view class="action-cancel" @click="closeMenu">取消</view>
      </view>
    </view>

    <!-- 文件夹选择弹窗 -->
    <view class="modal-overlay" v-if="showFolderPicker" @click="closeFolderPicker">
      <view class="folder-picker" @click.stop>
        <view class="picker-header">
          <text class="picker-title">{{ folderPickerTitle }}</text>
          <text class="picker-close" @click="closeFolderPicker">✕</text>
        </view>
        <scroll-view class="folder-list" scroll-y>
          <view
            class="folder-item"
            v-for="folder in folders"
            :key="folder.id"
            @click="selectFolder(folder)"
          >
            <text>📁</text>
            <text class="folder-name">{{ folder.name }}</text>
          </view>
          <view class="folder-item new" @click="createNewFolderInPicker">
            <text>➕</text>
            <text class="folder-name">新建文件夹</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 项目列表
const projects = ref<any[]>([])
// 搜索关键词
const searchKeyword = ref('')
// 多选模式
const isSelectMode = ref(false)
const selectedProjects = ref<string[]>([])

// 弹窗状态
const showModal = ref(false)
const showMenu = ref(false)
const showFolderPicker = ref(false)
const folderPickerTitle = ref('移动到')
const folderPickerAction = ref<'move' | 'copy'>('move')

// 当前操作的项目
const currentProject = ref<any>(null)
const folders = ref<any[]>([])

/**
 * 根据搜索关键词过滤项目列表
 * @returns 过滤后的项目数组
 */
const filteredProjects = computed(() => {
  if (!searchKeyword.value) return projects.value
  return projects.value.filter(p =>
    p.name?.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
})

/**
 * 判断当前是否已全选所有过滤后的项目
 * @returns 是否全选状态
 */
const isAllSelected = computed(() => {
  return selectedProjects.value.length === filteredProjects.value.length
})

/**
 * 从本地存储加载项目列表，按更新时间倒序排列
 */
const loadProjects = () => {
  const data = uni.getStorageSync('pin_projects') || []
  projects.value = data.sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * 从本地存储加载文件夹列表
 */
const loadFolders = () => {
  folders.value = uni.getStorageSync('pin_folders') || []
}

/**
 * 将时间戳格式化为友好的相对时间描述
 * @param timestamp - Unix 时间戳（毫秒）
 * @returns 格式化后的时间字符串，如"今天"、"昨天"、"3天前"、"5/12"
 */
const formatTime = (timestamp: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return `${date.getMonth() + 1}/${date.getDate()}`
}

/**
 * 切换多选模式的开启/关闭状态
 * 关闭多选模式时自动清空已选中的项目列表
 */
const toggleSelectMode = () => {
  isSelectMode.value = !isSelectMode.value
  if (!isSelectMode.value) {
    selectedProjects.value = []
  }
}

/**
 * 切换指定项目的选中状态
 * @param id - 项目 ID
 */
const toggleSelect = (id: string) => {
  const index = selectedProjects.value.indexOf(id)
  if (index > -1) {
    selectedProjects.value.splice(index, 1)
  } else {
    selectedProjects.value.push(id)
  }
}

/**
 * 全选或取消全选当前过滤后的所有项目
 */
const selectAll = () => {
  if (isAllSelected.value) {
    selectedProjects.value = []
  } else {
    selectedProjects.value = filteredProjects.value.map(p => p.id)
  }
}

/**
 * 显示"开始创作"弹窗
 */
const showCreateModal = () => {
  showModal.value = true
}

/**
 * 关闭"开始创作"弹窗
 */
const closeModal = () => {
  showModal.value = false
}

/**
 * 处理项目卡片点击事件
 * 多选模式下切换选中状态，普通模式下跳转到画布编辑页面
 * @param project - 被点击的项目对象
 */
const handleProjectClick = (project: any) => {
  if (isSelectMode.value) {
    toggleSelect(project.id)
  } else {
    // 跳转到画布编辑
    uni.navigateTo({
      url: `/pages/canvas-editor/index?mode=edit&projectId=${project.id}`
    })
  }
}

/**
 * 显示指定项目的操作菜单（重命名、移动、复制、删除）
 * @param project - 要操作的项目对象
 */
const showProjectMenu = (project: any) => {
  currentProject.value = project
  showMenu.value = true
}

/**
 * 关闭项目操作菜单并清空当前操作项目引用
 */
const closeMenu = () => {
  showMenu.value = false
  currentProject.value = null
}

/**
 * 重命名当前选中的项目
 * 弹出系统输入框，确认后更新本地存储中的项目名称
 */
const renameProject = () => {
  const project = currentProject.value
  closeMenu()
  if (!project) return
  uni.showModal({
    title: '重命名',
    editable: true,
    placeholderText: project.name,
    success: (res) => {
      if (res.confirm && res.content) {
        const data: any[] = uni.getStorageSync('pin_projects') || []
        const index = data.findIndex((p: any) => p.id === project.id)
        if (index > -1) {
          data[index].name = res.content
          uni.setStorageSync('pin_projects', data)
          loadProjects()
          uni.showToast({ title: '重命名成功', icon: 'success' })
        }
      }
    }
  })
}

/**
 * 根据创建类型跳转到对应的画布创建页面
 * @param type - 创建类型：blank（空白画布）、image（导入图片）、blueprint（导入图纸）
 */
const createCanvas = (type: 'blank' | 'image' | 'blueprint') => {
  closeModal()
  if (type === 'blank') {
    // 直接进入画布设置
    uni.navigateTo({
      url: '/pages/canvas-settings/index?type=blank'
    })
  } else if (type === 'image') {
    // 进入图片导入
    uni.navigateTo({
      url: '/pages/image-import/index'
    })
  } else if (type === 'blueprint') {
    // 进入图纸导入
    uni.navigateTo({
      url: '/pages/blueprint-import/index'
    })
  }
}

/**
 * 导入小红书链接功能（当前为开发中状态）
 */
const importFromXiaohongshu = () => {
  closeModal()
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

/**
 * 创建新文件夹
 * 弹出系统输入框，确认后将文件夹信息保存到本地存储
 */
const createFolder = () => {
  closeModal()
  uni.showModal({
    title: '新建文件夹',
    placeholderText: '请输入文件夹名称',
    editable: true,
    success: (res) => {
      if (res.confirm && res.content) {
        const folder = {
          id: 'f_' + Date.now(),
          name: res.content,
          createdAt: Date.now()
        }
        const data = uni.getStorageSync('pin_folders') || []
        data.push(folder)
        uni.setStorageSync('pin_folders', data)
        loadFolders()
        uni.showToast({ title: '创建成功', icon: 'success' })
      }
    }
  })
}

/**
 * 移动当前项目到指定文件夹
 * 关闭操作菜单后打开文件夹选择器
 */
const moveProject = () => {
  closeMenu()
  folderPickerTitle.value = '移动到'
  folderPickerAction.value = 'move'
  showFolderPicker.value = true
}

/**
 * 复制当前项目
 * 深拷贝项目数据并生成新 ID，保存到本地存储
 */
const copyProject = () => {
  closeMenu()
  if (!currentProject.value) return
  const newProject = {
    ...currentProject.value,
    id: 'p_' + Date.now(),
    name: currentProject.value.name + ' (副本)',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  const data = uni.getStorageSync('pin_projects') || []
  data.push(newProject)
  uni.setStorageSync('pin_projects', data)
  loadProjects()
  uni.showToast({ title: '复制成功', icon: 'success' })
}

/**
 * 删除当前项目
 * 弹出确认对话框，确认后从本地存储中移除该项目
 */
const deleteProject = () => {
  const projectToDelete = currentProject.value
  closeMenu()
  if (!projectToDelete) return
  uni.showModal({
    title: '确认删除',
    content: '确定要删除此项目吗？此操作不可恢复。',
    success: (res) => {
      if (res.confirm) {
        const data = uni.getStorageSync('pin_projects') || []
        const filtered = data.filter((p: any) => p.id !== projectToDelete.id)
        uni.setStorageSync('pin_projects', filtered)
        loadProjects()
        uni.showToast({ title: '删除成功', icon: 'success' })
      }
    }
  })
}

/**
 * 批量移动已选中的项目到文件夹
 * 退出多选模式后打开文件夹选择器
 */
const moveSelected = () => {
  toggleSelectMode()
  folderPickerTitle.value = '移动到'
  folderPickerAction.value = 'move'
  showFolderPicker.value = true
}

/**
 * 批量复制已选中的项目
 * 深拷贝每个选中项目并生成新 ID，保存到本地存储后退出多选模式
 */
const copySelected = () => {
  const data: any[] = uni.getStorageSync('pin_projects') || []
  selectedProjects.value.forEach(id => {
    const project = data.find((p: any) => p.id === id)
    if (project) {
      const newProject = {
        ...JSON.parse(JSON.stringify(project)),
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: project.name + ' (副本)',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      data.push(newProject)
    }
  })
  uni.setStorageSync('pin_projects', data)
  loadProjects()
  toggleSelectMode()
  uni.showToast({ title: '复制成功', icon: 'success' })
}

/**
 * 批量删除已选中的项目
 * 弹出确认对话框，确认后从本地存储中移除所有选中项目并退出多选模式
 */
const deleteSelected = () => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除选中的 ${selectedProjects.value.length} 个项目吗？此操作不可恢复。`,
    success: (res) => {
      if (res.confirm) {
        const data = uni.getStorageSync('pin_projects') || []
        const filtered = data.filter((p: any) => !selectedProjects.value.includes(p.id))
        uni.setStorageSync('pin_projects', filtered)
        loadProjects()
        toggleSelectMode()
        uni.showToast({ title: '删除成功', icon: 'success' })
      }
    }
  })
}

/**
 * 关闭文件夹选择器弹窗
 */
const closeFolderPicker = () => {
  showFolderPicker.value = false
}

/**
 * 选择目标文件夹并执行移动或复制操作
 * 支持单个项目和批量项目操作，操作完成后关闭文件夹选择器
 * @param folder - 目标文件夹对象
 */
const selectFolder = (folder: any) => {
  if (folderPickerAction.value === 'move') {
    // 移动项目到文件夹
    if (currentProject.value) {
      currentProject.value.folderId = folder.id
      const data = uni.getStorageSync('pin_projects') || []
      const index = data.findIndex((p: any) => p.id === currentProject.value.id)
      if (index > -1) {
        data[index] = currentProject.value
        uni.setStorageSync('pin_projects', data)
        loadProjects()
      }
    } else if (selectedProjects.value.length > 0) {
      const data = uni.getStorageSync('pin_projects') || []
      selectedProjects.value.forEach(id => {
        const index = data.findIndex((p: any) => p.id === id)
        if (index > -1) {
          data[index].folderId = folder.id
        }
      })
      uni.setStorageSync('pin_projects', data)
      loadProjects()
      toggleSelectMode()
    }
  } else {
    // 复制项目到文件夹
    if (currentProject.value) {
      const newProject = {
        ...currentProject.value,
        id: 'p_' + Date.now(),
        folderId: folder.id,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      const data = uni.getStorageSync('pin_projects') || []
      data.push(newProject)
      uni.setStorageSync('pin_projects', data)
      loadProjects()
    }
  }
  closeFolderPicker()
  uni.showToast({ title: folderPickerAction.value === 'move' ? '移动成功' : '复制成功', icon: 'success' })
}

/**
 * 在文件夹选择器中新建文件夹
 * 关闭选择器后调用 createFolder 方法
 */
const createNewFolderInPicker = () => {
  closeFolderPicker()
  createFolder()
}

// 页面加载
onMounted(() => {
  loadProjects()
  loadFolders()
  // 监听项目保存事件
  uni.$on('projectSaved', handleProjectSaved)
})

// 页面卸载
onUnmounted(() => {
  // 移除监听
  uni.$off('projectSaved', handleProjectSaved)
})

/**
 * 处理项目保存事件
 * 当其他页面触发 projectSaved 事件时，刷新项目列表数据
 */
const handleProjectSaved = () => {
  // 刷新项目列表
  loadProjects()
}
</script>

<style scoped>
/* ==================== 项目管理页面样式 ==================== */
/* 基于 Pin 统一设计系统，使用 CSS 变量和 rpx 单位 */

.project-page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
}

/* 顶部区域 */
.header {
  padding: 32rpx 40rpx;
  background-color: var(--color-bg-panel);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 40rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.count {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

/* 操作栏 */
.action-bar {
  padding: 24rpx 40rpx;
  background-color: var(--color-bg-panel);
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.search-box {
  flex: 1;
  height: 72rpx;
  background-color: var(--color-bg-page);
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 16rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--color-text-primary);
}

.placeholder {
  color: var(--color-text-disabled);
}

.action-buttons {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  padding: 16rpx 24rpx;
  font-size: 28rpx;
  color: var(--color-primary);
}

.action-btn.new-btn {
  color: var(--color-text-inverse);
  background-color: var(--color-primary);
  border-radius: 32rpx;
}

/* 项目列表 */
.project-list {
  padding: 24rpx 40rpx;
  height: calc(100vh - 360rpx);
}

.project-card {
  background-color: var(--color-bg-panel);
  border-radius: var(--radius-lg);
  padding: 28rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  position: relative;
  box-shadow: var(--shadow-md);
}

.project-card.selected {
  background-color: var(--color-primary-light);
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid var(--color-primary);
  border-radius: var(--radius-sm);
  margin-right: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: 28rpx;
}

.thumbnail {
  width: 120rpx;
  height: 120rpx;
  background-color: var(--color-bg-page);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  overflow: hidden;
}

.thumbnail-placeholder {
  font-size: 48rpx;
  color: var(--color-text-disabled);
}

.thumbnail-img {
  width: 100%;
  height: 100%;
}

.info {
  flex: 1;
}

.project-name {
  font-size: 30rpx;
  color: var(--color-text-primary);
  font-weight: 500;
  display: block;
  margin-bottom: 8rpx;
}

.project-size {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  display: block;
  margin-bottom: 4rpx;
}

.project-time {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  display: block;
}

.status-badge {
  position: absolute;
  top: 28rpx;
  right: 80rpx;
  padding: 4rpx 16rpx;
  font-size: 20rpx;
  border-radius: var(--radius-sm);
}

.status-badge.draft {
  background-color: #FFF7E6;
  color: #FF9500;
}

.status-badge.saved {
  background-color: #E8F5E9;
  color: #4CAF50;
}

.menu-btn {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  font-size: 36rpx;
  color: var(--color-text-disabled);
  padding: 8rpx;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.empty-icon {
  font-size: 128rpx;
  margin-bottom: 32rpx;
}

.empty-text {
  font-size: 32rpx;
  color: var(--color-text-primary);
  margin-bottom: 16rpx;
}

.empty-subtext {
  font-size: 28rpx;
  color: var(--color-text-tertiary);
  margin-bottom: 48rpx;
}

.start-btn {
  padding: 24rpx 64rpx;
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  border-radius: 48rpx;
  font-size: 30rpx;
}

/* 多选操作栏 */
.select-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--color-bg-panel);
  padding: 32rpx 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.selected-count {
  font-size: 28rpx;
  color: var(--color-text-primary);
}

.select-actions {
  display: flex;
  gap: 40rpx;
}

.select-action {
  font-size: 28rpx;
  color: var(--color-primary);
}

.select-action.delete {
  color: var(--color-error);
}

/* 创建弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-bg-mask);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.create-modal {
  width: 100%;
  background-color: var(--color-bg-panel);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  max-height: 80vh;
}

.modal-header {
  padding: 32rpx 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border-light);
}

.modal-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.modal-close {
  font-size: 40rpx;
  color: var(--color-text-tertiary);
}

.modal-content {
  padding: 32rpx 40rpx;
  max-height: 60vh;
  overflow-y: auto;
}

.create-option {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1px solid var(--color-border-light);
}

.create-option.primary {
  background-color: var(--color-bg-page);
  margin: 0 -40rpx;
  padding: 28rpx 40rpx;
  border-radius: var(--radius-lg);
  margin-bottom: 16rpx;
  border-bottom: none;
}

.option-icon {
  font-size: 48rpx;
  margin-right: 24rpx;
}

.option-text {
  flex: 1;
}

.option-title {
  font-size: 30rpx;
  color: var(--color-text-primary);
  font-weight: 500;
  display: block;
  margin-bottom: 4rpx;
}

.new-tag {
  font-size: 20rpx;
  background-color: var(--color-error);
  color: var(--color-text-inverse);
  padding: 4rpx 8rpx;
  border-radius: 4rpx;
}

.option-desc {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  display: block;
}

.divider {
  height: 16rpx;
  background-color: var(--color-bg-page);
  margin: 16rpx -40rpx;
}

.create-option.folder {
  border-bottom: none;
}

/* 操作菜单 */
.action-sheet {
  width: 100%;
  background-color: var(--color-bg-panel);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}

.action-item {
  padding: 32rpx 40rpx;
  text-align: center;
  font-size: 34rpx;
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-border-light);
}

.action-item.danger {
  color: var(--color-error);
}

.action-cancel {
  padding: 32rpx 40rpx;
  text-align: center;
  font-size: 34rpx;
  color: var(--color-text-primary);
  background-color: var(--color-bg-page);
  margin-top: 16rpx;
}

/* 文件夹选择器 */
.folder-picker {
  width: 100%;
  background-color: var(--color-bg-panel);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  max-height: 60vh;
}

.picker-header {
  padding: 32rpx 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border-light);
}

.picker-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.picker-close {
  font-size: 40rpx;
  color: var(--color-text-tertiary);
}

.folder-list {
  padding: 24rpx 40rpx;
  max-height: 50vh;
}

.folder-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  font-size: 30rpx;
  color: var(--color-text-primary);
}

.folder-item.new {
  color: var(--color-primary);
}

.folder-name {
  margin-left: 16rpx;
}
</style>
