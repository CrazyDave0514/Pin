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
          <text class="project-size">{{ project.canvas?.width || 0 }}×{{ project.canvas?.height || 0 }}</text>
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

// 筛选后的项目
const filteredProjects = computed(() => {
  if (!searchKeyword.value) return projects.value
  return projects.value.filter(p =>
    p.name?.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
})

// 是否全选
const isAllSelected = computed(() => {
  return selectedProjects.value.length === filteredProjects.value.length
})

// 加载项目数据
const loadProjects = () => {
  const data = uni.getStorageSync('pin_projects') || []
  projects.value = data.sort((a, b) => b.updatedAt - a.updatedAt)
}

// 加载文件夹数据
const loadFolders = () => {
  folders.value = uni.getStorageSync('pin_folders') || []
}

// 格式化时间
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

// 切换多选模式
const toggleSelectMode = () => {
  isSelectMode.value = !isSelectMode.value
  if (!isSelectMode.value) {
    selectedProjects.value = []
  }
}

// 切换选中
const toggleSelect = (id: string) => {
  const index = selectedProjects.value.indexOf(id)
  if (index > -1) {
    selectedProjects.value.splice(index, 1)
  } else {
    selectedProjects.value.push(id)
  }
}

// 全选/取消全选
const selectAll = () => {
  if (isAllSelected.value) {
    selectedProjects.value = []
  } else {
    selectedProjects.value = filteredProjects.value.map(p => p.id)
  }
}

// 显示创建弹窗
const showCreateModal = () => {
  showModal.value = true
}

// 关闭弹窗
const closeModal = () => {
  showModal.value = false
}

// 项目点击
const handleProjectClick = (project: any) => {
  if (isSelectMode.value) {
    toggleSelect(project.id)
  } else {
    // 跳转到画布编辑
    uni.navigateTo({
      url: `/pages/canvas-editor/index?projectId=${project.id}`
    })
  }
}

// 显示项目菜单
const showProjectMenu = (project: any) => {
  currentProject.value = project
  showMenu.value = true
}

// 关闭菜单
const closeMenu = () => {
  showMenu.value = false
  currentProject.value = null
}

// 创建画布
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

// 导入小红书链接
const importFromXiaohongshu = () => {
  closeModal()
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

// 创建文件夹
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

// 移动项目
const moveProject = () => {
  closeMenu()
  folderPickerTitle.value = '移动到'
  folderPickerAction.value = 'move'
  showFolderPicker.value = true
}

// 复制项目
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

// 删除项目
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

// 移动选中的项目
const moveSelected = () => {
  toggleSelectMode()
  folderPickerTitle.value = '移动到'
  folderPickerAction.value = 'move'
  showFolderPicker.value = true
}

// 删除选中的项目
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

// 显示文件夹选择器
const closeFolderPicker = () => {
  showFolderPicker.value = false
}

// 选择文件夹
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

// 在选择器中新建文件夹
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

// 处理项目保存事件
const handleProjectSaved = () => {
  // 刷新项目列表
  loadProjects()
}
</script>

<style scoped>
.project-page {
  min-height: 100vh;
  background-color: #F8F8F8;
}

/* 顶部区域 */
.header {
  padding: 16px 20px;
  background-color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: #2D2D2D;
}

.count {
  font-size: 12px;
  color: #999999;
}

/* 操作栏 */
.action-bar {
  padding: 12px 20px;
  background-color: #FFFFFF;
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  flex: 1;
  height: 36px;
  background-color: #F5F5F5;
  border-radius: 18px;
  display: flex;
  align-items: center;
  padding: 0 12px;
}

.search-icon {
  font-size: 14px;
  margin-right: 8px;
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: #2D2D2D;
}

.placeholder {
  color: #CCCCCC;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 12px;
  font-size: 14px;
  color: #007AFF;
}

.action-btn.new-btn {
  color: #FFFFFF;
  background-color: #007AFF;
  border-radius: 16px;
}

/* 项目列表 */
.project-list {
  padding: 12px 20px;
  height: calc(100vh - 180px);
}

.project-card {
  background-color: #FFFFFF;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  position: relative;
}

.project-card.selected {
  background-color: #E8F4FF;
}

.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #007AFF;
  border-radius: 4px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #007AFF;
  font-size: 14px;
}

.thumbnail {
  width: 60px;
  height: 60px;
  background-color: #F5F5F5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  overflow: hidden;
}

.thumbnail-placeholder {
  font-size: 24px;
  color: #CCCCCC;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
}

.info {
  flex: 1;
}

.project-name {
  font-size: 15px;
  color: #2D2D2D;
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
}

.project-size {
  font-size: 12px;
  color: #666666;
  display: block;
  margin-bottom: 2px;
}

.project-time {
  font-size: 12px;
  color: #999999;
  display: block;
}

.status-badge {
  position: absolute;
  top: 14px;
  right: 40px;
  padding: 2px 8px;
  font-size: 10px;
  border-radius: 4px;
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
  top: 14px;
  right: 14px;
  font-size: 18px;
  color: #CCCCCC;
  padding: 4px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 100px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #2D2D2D;
  margin-bottom: 8px;
}

.empty-subtext {
  font-size: 14px;
  color: #999999;
  margin-bottom: 24px;
}

.start-btn {
  padding: 12px 32px;
  background-color: #007AFF;
  color: #FFFFFF;
  border-radius: 24px;
  font-size: 15px;
}

/* 多选操作栏 */
.select-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #FFFFFF;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.selected-count {
  font-size: 14px;
  color: #2D2D2D;
}

.select-actions {
  display: flex;
  gap: 20px;
}

.select-action {
  font-size: 14px;
  color: #007AFF;
}

.select-action.delete {
  color: #FF3B30;
}

/* 创建弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.create-modal {
  width: 100%;
  background-color: #FFFFFF;
  border-radius: 16px 16px 0 0;
  max-height: 80vh;
}

.modal-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #F0F0F0;
}

.modal-title {
  font-size: 17px;
  font-weight: 600;
  color: #2D2D2D;
}

.modal-close {
  font-size: 20px;
  color: #999999;
}

.modal-content {
  padding: 16px 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.create-option {
  display: flex;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid #F0F0F0;
}

.create-option.primary {
  background-color: #F5F5F5;
  margin: 0 -20px;
  padding: 14px 20px;
  border-radius: 12px;
  margin-bottom: 8px;
  border-bottom: none;
}

.option-icon {
  font-size: 24px;
  margin-right: 12px;
}

.option-text {
  flex: 1;
}

.option-title {
  font-size: 15px;
  color: #2D2D2D;
  font-weight: 500;
  display: block;
  margin-bottom: 2px;
}

.new-tag {
  font-size: 10px;
  background-color: #FF3B30;
  color: #FFFFFF;
  padding: 2px 4px;
  border-radius: 2px;
}

.option-desc {
  font-size: 12px;
  color: #999999;
  display: block;
}

.divider {
  height: 8px;
  background-color: #F5F5F5;
  margin: 8px -20px;
}

.create-option.folder {
  border-bottom: none;
}

/* 操作菜单 */
.action-sheet {
  width: 100%;
  background-color: #FFFFFF;
  border-radius: 16px 16px 0 0;
}

.action-item {
  padding: 16px 20px;
  text-align: center;
  font-size: 17px;
  color: #007AFF;
  border-bottom: 1px solid #F0F0F0;
}

.action-item.danger {
  color: #FF3B30;
}

.action-cancel {
  padding: 16px 20px;
  text-align: center;
  font-size: 17px;
  color: #2D2D2D;
  background-color: #F5F5F5;
  margin-top: 8px;
}

/* 文件夹选择器 */
.folder-picker {
  width: 100%;
  background-color: #FFFFFF;
  border-radius: 16px 16px 0 0;
  max-height: 60vh;
}

.picker-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #F0F0F0;
}

.picker-title {
  font-size: 17px;
  font-weight: 600;
  color: #2D2D2D;
}

.picker-close {
  font-size: 20px;
  color: #999999;
}

.folder-list {
  padding: 12px 20px;
  max-height: 50vh;
}

.folder-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  font-size: 15px;
  color: #2D2D2D;
}

.folder-item.new {
  color: #007AFF;
}

.folder-name {
  margin-left: 8px;
}
</style>
