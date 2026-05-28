<!--
  冲突解决组件
  用于展示和解决多端编辑时的数据冲突
-->
<template>
  <view v-if="showModal" class="conflict-modal">
    <view class="modal-overlay" @click="handleClose"></view>
    <view class="modal-content">
      <!-- 头部 -->
      <view class="modal-header">
        <text class="modal-title">数据冲突</text>
        <text class="modal-close" @click="handleClose">×</text>
      </view>

      <!-- 冲突信息 -->
      <view class="conflict-info">
        <text class="conflict-desc">{{ conflictInfo }}</text>
        <text class="conflict-detail">冲突字段: {{ conflictFieldsText }}</text>
      </view>

      <!-- 对比展示 -->
      <scroll-view class="compare-area" scroll-y>
        <view class="compare-section">
          <view class="compare-header">
            <text class="compare-title">本地版本</text>
            <text class="version-tag">v{{ currentConflict?.localVersion }}</text>
          </view>
          <view class="compare-content">
            <view
              v-for="field in displayFields"
              :key="field.key"
              class="field-item"
              :class="{ 'is-conflict': field.isConflict }"
            >
              <text class="field-label">{{ field.label }}</text>
              <text class="field-value">{{ formatValue(field.localValue) }}</text>
            </view>
          </view>
        </view>

        <view class="compare-divider">
          <text class="vs-text">VS</text>
        </view>

        <view class="compare-section">
          <view class="compare-header">
            <text class="compare-title">远程版本</text>
            <text class="version-tag">v{{ currentConflict?.remoteVersion }}</text>
          </view>
          <view class="compare-content">
            <view
              v-for="field in displayFields"
              :key="field.key"
              class="field-item"
              :class="{ 'is-conflict': field.isConflict }"
            >
              <text class="field-label">{{ field.label }}</text>
              <text class="field-value">{{ formatValue(field.remoteValue) }}</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 操作按钮 -->
      <view class="modal-actions">
        <view class="action-row">
          <view class="action-btn local" @click="resolveWithLocal">
            <text class="btn-text">使用本地</text>
          </view>
          <view class="action-btn remote" @click="resolveWithRemote">
            <text class="btn-text">使用远程</text>
          </view>
        </view>
        <view class="action-row">
          <view class="action-btn merge" @click="resolveWithMerge">
            <text class="btn-text">自动合并</text>
          </view>
          <view class="action-btn manual" @click="enterManualMode">
            <text class="btn-text">手动编辑</text>
          </view>
        </view>
        <view class="action-row single">
          <view class="action-btn ignore" @click="ignoreConflict">
            <text class="btn-text">稍后处理</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 手动编辑模式 -->
    <view v-if="showManualEditor" class="manual-editor">
      <view class="editor-header">
        <text class="editor-title">手动合并</text>
        <text class="editor-close" @click="cancelManualMode">×</text>
      </view>
      <scroll-view class="editor-content" scroll-y>
        <view
          v-for="field in editableFields"
          :key="field.key"
          class="edit-field"
        >
          <text class="edit-label">{{ field.label }}</text>
          <view class="edit-options">
            <view
              class="option"
              :class="{ 'is-selected': manualSelections[field.key] === 'local' }"
              @click="selectValue(field.key, 'local')"
            >
              <text class="option-tag">本地</text>
              <text class="option-value">{{ formatValue(field.localValue) }}</text>
            </view>
            <view
              class="option"
              :class="{ 'is-selected': manualSelections[field.key] === 'remote' }"
              @click="selectValue(field.key, 'remote')"
            >
              <text class="option-tag">远程</text>
              <text class="option-value">{{ formatValue(field.remoteValue) }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
      <view class="editor-actions">
        <view class="action-btn cancel" @click="cancelManualMode">
          <text class="btn-text">取消</text>
        </view>
        <view class="action-btn confirm" @click="confirmManualResolve">
          <text class="btn-text">确认合并</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ConflictRecord, ConflictStrategy } from '../services/sync/conflict-resolver.ts'
import { resolveConflict } from '../services/sync/conflict-resolver.ts'

/** 组件属性 */
const props = defineProps<{
  /** 是否显示弹窗 */
  visible: boolean
  /** 冲突记录 */
  conflict: ConflictRecord | null
}>()

/** 组件事件 */
const emit = defineEmits<{
  /** 关闭弹窗 */
  (e: 'close'): void
  /** 冲突已解决 */
  (e: 'resolved', strategy: ConflictStrategy, data?: any): void
  /** 忽略冲突 */
  (e: 'ignored'): void
}>()

/** 是否显示弹窗 */
const showModal = computed(() => props.visible && props.conflict !== null)

/** 当前冲突 */
const currentConflict = computed(() => props.conflict)

/** 是否显示手动编辑器 */
const showManualEditor = ref(false)

/** 手动选择 */
const manualSelections = ref<Record<string, 'local' | 'remote'>>({})

/** 字段标签映射 */
const FIELD_LABELS: Record<string, string> = {
  name: '名称',
  description: '描述',
  tags: '标签',
  canvasData: '画布数据',
  thumbnail: '缩略图',
  folderId: '文件夹',
  isPublic: '公开状态',
  points: '积分',
  bio: '简介',
  avatar: '头像',
}

/** 冲突信息文本 */
const conflictInfo = computed(() => {
  if (!currentConflict.value) return ''
  const { targetName, type } = currentConflict.value
  const typeMap: Record<string, string> = {
    project: '项目',
    folder: '文件夹',
    artwork: '作品',
    settings: '设置',
  }
  return `${typeMap[type] || '数据'} "${targetName}" 在多个设备上被修改`
})

/** 冲突字段文本 */
const conflictFieldsText = computed(() => {
  if (!currentConflict.value) return ''
  return currentConflict.value.conflictFields
    .map((field) => FIELD_LABELS[field] || field)
    .join('、')
})

/** 展示的字段 */
const displayFields = computed(() => {
  if (!currentConflict.value) return []

  const { localData, remoteData, conflictFields } = currentConflict.value
  const fields = new Set([
    ...Object.keys(localData || {}),
    ...Object.keys(remoteData || {}),
  ])

  return Array.from(fields)
    .filter((key) => !key.startsWith('_') && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
    .map((key) => ({
      key,
      label: FIELD_LABELS[key] || key,
      localValue: localData?.[key],
      remoteValue: remoteData?.[key],
      isConflict: conflictFields.includes(key),
    }))
})

/** 可编辑字段（仅冲突字段） */
const editableFields = computed(() => {
  return displayFields.value.filter((f) => f.isConflict)
})

/** 监听冲突变化，重置手动选择 */
watch(
  () => props.conflict,
  () => {
    manualSelections.value = {}
    showManualEditor.value = false
  },
  { immediate: true }
)

/**
 * 格式化值显示
 */
const formatValue = (value: any): string => {
  if (value === undefined || value === null) return '-'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 50)
  return String(value).slice(0, 50)
}

/**
 * 使用本地版本
 */
const resolveWithLocal = () => {
  if (!currentConflict.value) return
  const success = resolveConflict(currentConflict.value.id, 'local')
  if (success) {
    emit('resolved', 'local')
    emit('close')
  }
}

/**
 * 使用远程版本
 */
const resolveWithRemote = () => {
  if (!currentConflict.value) return
  const success = resolveConflict(currentConflict.value.id, 'remote')
  if (success) {
    emit('resolved', 'remote')
    emit('close')
  }
}

/**
 * 自动合并
 */
const resolveWithMerge = () => {
  if (!currentConflict.value) return
  const success = resolveConflict(currentConflict.value.id, 'merge')
  if (success) {
    emit('resolved', 'merge')
    emit('close')
  }
}

/**
 * 进入手动编辑模式
 */
const enterManualMode = () => {
  // 默认选择本地值
  const selections: Record<string, 'local' | 'remote'> = {}
  editableFields.value.forEach((field) => {
    selections[field.key] = 'local'
  })
  manualSelections.value = selections
  showManualEditor.value = true
}

/**
 * 取消手动编辑
 */
const cancelManualMode = () => {
  showManualEditor.value = false
}

/**
 * 选择值
 */
const selectValue = (fieldKey: string, source: 'local' | 'remote') => {
  manualSelections.value[fieldKey] = source
}

/**
 * 确认手动解决
 */
const confirmManualResolve = () => {
  if (!currentConflict.value) return

  // 构建合并后的数据
  const resolvedData = { ...currentConflict.value.remoteData }
  editableFields.value.forEach((field) => {
    const source = manualSelections.value[field.key]
    if (source === 'local') {
      resolvedData[field.key] = field.localValue
    }
  })

  const success = resolveConflict(currentConflict.value.id, 'manual', resolvedData)
  if (success) {
    emit('resolved', 'manual', resolvedData)
    emit('close')
  }
}

/**
 * 忽略冲突
 */
const ignoreConflict = () => {
  emit('ignored')
  emit('close')
}

/**
 * 关闭弹窗
 */
const handleClose = () => {
  emit('close')
}
</script>

<style scoped>
.conflict-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-bg-mask);
}

.modal-content {
  position: relative;
  width: 90%;
  max-width: 600rpx;
  max-height: 80vh;
  background: var(--color-bg-panel);
  border-radius: var(--radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 1rpx solid var(--color-divider);
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.modal-close {
  font-size: 40rpx;
  color: var(--color-text-tertiary);
  line-height: 1;
}

.conflict-info {
  padding: 20rpx 24rpx;
  background: var(--color-warning-light);
}

.conflict-desc {
  font-size: 28rpx;
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 8rpx;
}

.conflict-detail {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.compare-area {
  flex: 1;
  padding: 20rpx 24rpx;
  max-height: 400rpx;
}

.compare-section {
  background: var(--color-bg-page);
  border-radius: var(--radius-lg);
  padding: 16rpx;
  margin-bottom: 16rpx;
}

.compare-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.compare-title {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.version-tag {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  background: var(--color-bg-panel);
  padding: 4rpx 12rpx;
  border-radius: var(--radius-sm);
}

.field-item {
  display: flex;
  justify-content: space-between;
  padding: 8rpx 0;
  border-bottom: 1rpx solid var(--color-divider);
}

.field-item:last-child {
  border-bottom: none;
}

.field-item.is-conflict {
  background: rgba(206, 123, 29, 0.1);
  margin: 0 -8rpx;
  padding: 8rpx;
  border-radius: var(--radius-sm);
}

.field-label {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.field-value {
  font-size: 24rpx;
  color: var(--color-text-primary);
  max-width: 50%;
  text-align: right;
}

.compare-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16rpx 0;
}

.vs-text {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  font-weight: 600;
}

.modal-actions {
  padding: 20rpx 24rpx;
  border-top: 1rpx solid var(--color-divider);
}

.action-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.action-row.single {
  margin-bottom: 0;
}

.action-row.single .action-btn {
  flex: 1;
}

.action-btn {
  flex: 1;
  height: 72rpx;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn .btn-text {
  font-size: 26rpx;
  font-weight: 600;
}

.action-btn.local {
  background: var(--color-info-light);
}

.action-btn.local .btn-text {
  color: var(--color-info);
}

.action-btn.remote {
  background: var(--color-success-light);
}

.action-btn.remote .btn-text {
  color: var(--color-success);
}

.action-btn.merge {
  background: var(--color-primary-light);
}

.action-btn.merge .btn-text {
  color: var(--color-primary-dark);
}

.action-btn.manual {
  background: var(--color-bg-page);
  border: 2rpx solid var(--color-border);
}

.action-btn.manual .btn-text {
  color: var(--color-text-primary);
}

.action-btn.ignore {
  background: transparent;
  border: 2rpx solid var(--color-border);
}

.action-btn.ignore .btn-text {
  color: var(--color-text-secondary);
}

/* 手动编辑器 */
.manual-editor {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-bg-panel);
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 1rpx solid var(--color-divider);
}

.editor-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.editor-close {
  font-size: 40rpx;
  color: var(--color-text-tertiary);
  line-height: 1;
}

.editor-content {
  flex: 1;
  padding: 20rpx 24rpx;
}

.edit-field {
  margin-bottom: 24rpx;
}

.edit-label {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 12rpx;
}

.edit-options {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.option {
  display: flex;
  align-items: center;
  padding: 16rpx;
  background: var(--color-bg-page);
  border-radius: var(--radius-lg);
  border: 2rpx solid transparent;
}

.option.is-selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.option-tag {
  font-size: 22rpx;
  color: var(--color-text-inverse);
  background: var(--color-text-tertiary);
  padding: 4rpx 12rpx;
  border-radius: var(--radius-sm);
  margin-right: 16rpx;
}

.option.is-selected .option-tag {
  background: var(--color-primary);
}

.option-value {
  flex: 1;
  font-size: 26rpx;
  color: var(--color-text-primary);
}

.editor-actions {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  border-top: 1rpx solid var(--color-divider);
}

.editor-actions .action-btn {
  flex: 1;
}

.editor-actions .action-btn.cancel {
  background: var(--color-bg-page);
  border: 2rpx solid var(--color-border);
}

.editor-actions .action-btn.cancel .btn-text {
  color: var(--color-text-secondary);
}

.editor-actions .action-btn.confirm {
  background: var(--color-primary);
}

.editor-actions .action-btn.confirm .btn-text {
  color: var(--color-text-inverse);
}
</style>
