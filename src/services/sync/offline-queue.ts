/**
 * 离线编辑队列服务
 * 用于管理离线状态下的编辑操作，联网后自动同步
 */

import { getStorageAdapter } from '../pin/storage-adapter.ts'

/** 同步操作类型 */
export type SyncOperationType =
  | 'CREATE_PROJECT'
  | 'UPDATE_PROJECT'
  | 'DELETE_PROJECT'
  | 'CREATE_FOLDER'
  | 'UPDATE_FOLDER'
  | 'DELETE_FOLDER'
  | 'PUBLISH_ARTWORK'
  | 'UPDATE_ARTWORK'
  | 'UNPUBLISH_ARTWORK'

/** 同步操作记录 */
export interface SyncOperation {
  /** 唯一标识 */
  id: string
  /** 操作类型 */
  type: SyncOperationType
  /** 操作目标ID */
  targetId: string
  /** 操作数据 */
  data: any
  /** 创建时间 */
  createdAt: number
  /** 重试次数 */
  retryCount: number
  /** 最后重试时间 */
  lastRetryAt?: number
  /** 错误信息 */
  error?: string
}

/** 存储键 */
const OFFLINE_QUEUE_KEY = 'pin_offline_sync_queue'
const OFFLINE_PENDING_KEY = 'pin_offline_pending_changes'

/**
 * 生成唯一ID
 */
const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 获取存储适配器
 */
const getStorage = () => getStorageAdapter()

/**
 * 获取离线队列
 */
export const getOfflineQueue = (): SyncOperation[] => {
  try {
    const storage = getStorage()
    return storage.getSync<SyncOperation[]>(OFFLINE_QUEUE_KEY) || []
  } catch (e) {
    console.error('Failed to get offline queue:', e)
    return []
  }
}

/**
 * 保存离线队列
 */
const saveOfflineQueue = (queue: SyncOperation[]): void => {
  try {
    const storage = getStorage()
    storage.setSync(OFFLINE_QUEUE_KEY, queue)
  } catch (e) {
    console.error('Failed to save offline queue:', e)
  }
}

/**
 * 添加操作到离线队列
 */
export const addToOfflineQueue = (
  type: SyncOperationType,
  targetId: string,
  data: any
): SyncOperation => {
  const operation: SyncOperation = {
    id: generateId(),
    type,
    targetId,
    data,
    createdAt: Date.now(),
    retryCount: 0,
  }

  const queue = getOfflineQueue()
  // 检查是否已存在相同类型的操作，如果存在则合并
  const existingIndex = queue.findIndex(
    (op) => op.targetId === targetId && op.type === type
  )

  if (existingIndex >= 0) {
    // 更新现有操作
    queue[existingIndex] = {
      ...queue[existingIndex],
      data,
      createdAt: Date.now(),
      retryCount: 0,
      error: undefined,
    }
  } else {
    // 添加新操作
    queue.push(operation)
  }

  saveOfflineQueue(queue)
  return operation
}

/**
 * 从离线队列移除操作
 */
export const removeFromOfflineQueue = (operationId: string): void => {
  const queue = getOfflineQueue()
  const filtered = queue.filter((op) => op.id !== operationId)
  saveOfflineQueue(filtered)
}

/**
 * 更新操作状态
 */
export const updateOperationStatus = (
  operationId: string,
  updates: Partial<Pick<SyncOperation, 'retryCount' | 'lastRetryAt' | 'error'>>
): void => {
  const queue = getOfflineQueue()
  const index = queue.findIndex((op) => op.id === operationId)

  if (index >= 0) {
    queue[index] = { ...queue[index], ...updates }
    saveOfflineQueue(queue)
  }
}

/**
 * 清空离线队列
 */
export const clearOfflineQueue = (): void => {
  const storage = getStorage()
  storage.removeSync(OFFLINE_QUEUE_KEY)
}

/**
 * 获取待同步的操作数量
 */
export const getPendingCount = (): number => {
  return getOfflineQueue().length
}

/**
 * 检查是否有待同步的操作
 */
export const hasPendingOperations = (): boolean => {
  return getPendingCount() > 0
}

/**
 * 标记有未同步的变更
 */
export const markPendingChanges = (hasChanges: boolean): void => {
  try {
    const storage = getStorage()
    storage.setSync(OFFLINE_PENDING_KEY, hasChanges)
  } catch (e) {
    console.error('Failed to mark pending changes:', e)
  }
}

/**
 * 检查是否有未同步的变更
 */
export const hasPendingChanges = (): boolean => {
  try {
    const storage = getStorage()
    return storage.getSync<boolean>(OFFLINE_PENDING_KEY) || false
  } catch (e) {
    return false
  }
}

/**
 * 清除未同步变更标记
 */
export const clearPendingChanges = (): void => {
  try {
    const storage = getStorage()
    storage.removeSync(OFFLINE_PENDING_KEY)
  } catch (e) {
    console.error('Failed to clear pending changes:', e)
  }
}
