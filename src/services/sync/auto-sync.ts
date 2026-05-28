/**
 * 自动同步服务
 * 用于管理数据同步，包括登录全量同步、增量同步和离线队列同步
 */

import { isOnline, onNetworkStatusChange } from './network-status.ts'
import {
  addToOfflineQueue,
  clearOfflineQueue,
  clearPendingChanges,
  getOfflineQueue,
  hasPendingChanges,
  hasPendingOperations,
  markPendingChanges,
  removeFromOfflineQueue,
  type SyncOperation,
  type SyncOperationType,
  updateOperationStatus,
} from './offline-queue.ts'
import { pinServices } from '../pin/index.ts'

/** 同步状态 */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline'

/** 同步结果 */
export interface SyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  errors: string[]
}

/** 同步状态监听器 */
type SyncStatusListener = (status: SyncStatus) => void

/** 监听器集合 */
const statusListeners = new Set<SyncStatusListener>()

/** 当前同步状态 */
let currentStatus: SyncStatus = 'idle'

/** 是否已初始化 */
let isInitialized = false

/** 网络状态取消监听函数 */
let unsubscribeNetwork: (() => void) | null = null

/**
 * 获取当前同步状态
 */
export const getSyncStatus = (): SyncStatus => currentStatus

/**
 * 更新同步状态并通知监听器
 */
const setSyncStatus = (status: SyncStatus): void => {
  currentStatus = status
  statusListeners.forEach((listener) => {
    try {
      listener(status)
    } catch (e) {
      console.error('Sync status listener error:', e)
    }
  })
}

/**
 * 添加同步状态监听器
 * @param listener 监听器函数
 * @returns 取消监听的函数
 */
export const onSyncStatusChange = (listener: SyncStatusListener): (() => void) => {
  statusListeners.add(listener)
  listener(currentStatus)

  return () => {
    statusListeners.delete(listener)
  }
}

/**
 * 移除同步状态监听器
 */
export const offSyncStatusChange = (listener: SyncStatusListener): void => {
  statusListeners.delete(listener)
}

/**
 * 执行单个同步操作
 * @param operation 同步操作
 * @returns 是否成功
 */
const executeSyncOperation = async (operation: SyncOperation): Promise<boolean> => {
  try {
    const { provider } = pinServices

    switch (operation.type) {
      case 'CREATE_PROJECT':
      case 'UPDATE_PROJECT':
        const projects = await provider.getProjects()
        const existingIndex = projects.findIndex((p) => p.id === operation.targetId)

        if (existingIndex >= 0) {
          projects[existingIndex] = { ...projects[existingIndex], ...operation.data }
        } else {
          projects.push(operation.data)
        }
        await provider.setProjects(projects)
        break

      case 'DELETE_PROJECT':
        const currentProjects = await provider.getProjects()
        await provider.setProjects(currentProjects.filter((p) => p.id !== operation.targetId))
        break

      case 'CREATE_FOLDER':
      case 'UPDATE_FOLDER':
        const folders = await provider.getFolders()
        const folderIndex = folders.findIndex((f) => f.id === operation.targetId)

        if (folderIndex >= 0) {
          folders[folderIndex] = { ...folders[folderIndex], ...operation.data }
        } else {
          folders.push(operation.data)
        }
        await provider.setFolders(folders)
        break

      case 'DELETE_FOLDER':
        const currentFolders = await provider.getFolders()
        await provider.setFolders(currentFolders.filter((f) => f.id !== operation.targetId))
        break

      case 'PUBLISH_ARTWORK':
      case 'UPDATE_ARTWORK':
        const artworks = await provider.getArtworks()
        const artworkIndex = artworks.findIndex((a) => a.id === operation.targetId)

        if (artworkIndex >= 0) {
          artworks[artworkIndex] = { ...artworks[artworkIndex], ...operation.data }
        } else {
          artworks.push(operation.data)
        }
        await provider.setArtworks(artworks)
        break

      case 'UNPUBLISH_ARTWORK':
        const currentArtworks = await provider.getArtworks()
        await provider.setArtworks(currentArtworks.filter((a) => a.id !== operation.targetId))
        break

      default:
        console.warn('Unknown sync operation type:', operation.type)
        return false
    }

    return true
  } catch (error) {
    console.error('Sync operation failed:', operation, error)
    return false
  }
}

/**
 * 同步离线队列中的所有操作
 * @returns 同步结果
 */
export const syncOfflineQueue = async (): Promise<SyncResult> => {
  if (!isOnline()) {
    setSyncStatus('offline')
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: ['当前处于离线状态'],
    }
  }

  const queue = getOfflineQueue()

  if (queue.length === 0) {
    return {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    }
  }

  setSyncStatus('syncing')

  let syncedCount = 0
  let failedCount = 0
  const errors: string[] = []

  // 按创建时间排序，先执行先创建的操作
  const sortedQueue = [...queue].sort((a, b) => a.createdAt - b.createdAt)

  for (const operation of sortedQueue) {
    // 检查重试次数
    if (operation.retryCount >= 3) {
      failedCount++
      errors.push(`${operation.type} 操作重试次数超限`)
      continue
    }

    // 更新重试状态
    updateOperationStatus(operation.id, {
      retryCount: operation.retryCount + 1,
      lastRetryAt: Date.now(),
    })

    // 执行同步
    const success = await executeSyncOperation(operation)

    if (success) {
      // 同步成功，从队列移除
      removeFromOfflineQueue(operation.id)
      syncedCount++
    } else {
      // 同步失败，更新错误信息
      updateOperationStatus(operation.id, {
        error: '同步失败',
      })
      failedCount++
      errors.push(`${operation.type} 同步失败`)
    }
  }

  // 更新同步状态
  if (failedCount === 0) {
    setSyncStatus('success')
    clearPendingChanges()
  } else if (syncedCount === 0) {
    setSyncStatus('error')
  } else {
    setSyncStatus('idle')
  }

  return {
    success: failedCount === 0,
    syncedCount,
    failedCount,
    errors,
  }
}

/**
 * 登录后全量同步
 * 从服务器获取最新数据并合并到本地
 */
export const syncOnLogin = async (): Promise<SyncResult> => {
  if (!isOnline()) {
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: ['当前处于离线状态'],
    }
  }

  setSyncStatus('syncing')

  try {
    const { provider } = pinServices

    // 并行获取服务器数据
    await Promise.all([
      provider.getProjects(),
      provider.getFolders(),
      provider.getArtworks(),
      provider.getPoints(),
      provider.getPointsRecords(),
      provider.getFollowedCreators(),
      provider.getBlockedCreators(),
      provider.getLikedArtworkIds(),
      provider.getFavoritedArtworkIds(),
      provider.getPurchasedArtworkIds(),
    ])

    // 同步离线队列
    const queueResult = await syncOfflineQueue()

    setSyncStatus('success')

    return {
      success: true,
      syncedCount: queueResult.syncedCount,
      failedCount: queueResult.failedCount,
      errors: queueResult.errors,
    }
  } catch (error) {
    console.error('Login sync failed:', error)
    setSyncStatus('error')

    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: [error instanceof Error ? error.message : '同步失败'],
    }
  }
}

/**
 * 添加离线操作到队列
 * 如果在线则立即执行，离线则加入队列
 */
export const queueSyncOperation = async (
  type: SyncOperationType,
  targetId: string,
  data: any
): Promise<boolean> => {
  if (isOnline()) {
    // 在线状态，立即执行
    const operation: SyncOperation = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      targetId,
      data,
      createdAt: Date.now(),
      retryCount: 0,
    }

    const success = await executeSyncOperation(operation)

    if (!success) {
      // 执行失败，加入队列稍后重试
      addToOfflineQueue(type, targetId, data)
      markPendingChanges(true)
    }

    return success
  } else {
    // 离线状态，加入队列
    addToOfflineQueue(type, targetId, data)
    markPendingChanges(true)
    return false
  }
}

/**
 * 初始化自动同步服务
 * 在应用启动时调用
 */
export const initAutoSync = (): void => {
  if (isInitialized) return

  isInitialized = true

  // 监听网络状态变化
  unsubscribeNetwork = onNetworkStatusChange((status) => {
    if (status.isConnected && hasPendingOperations()) {
      // 网络恢复且有未同步的操作，自动同步
      void syncOfflineQueue()
    }
  })

  // 应用启动时检查是否有未同步的操作
  if (isOnline() && hasPendingOperations()) {
    void syncOfflineQueue()
  }
}

/**
 * 销毁自动同步服务
 * 在应用退出时调用
 */
export const destroyAutoSync = (): void => {
  if (unsubscribeNetwork) {
    unsubscribeNetwork()
    unsubscribeNetwork = null
  }

  isInitialized = false
}

/**
 * 检查是否有未同步的变更
 */
export const checkPendingSync = (): boolean => {
  return hasPendingChanges() || hasPendingOperations()
}

/**
 * 获取待同步的操作数量
 */
export const getPendingSyncCount = (): number => {
  return getOfflineQueue().length
}

/**
 * 清除所有同步数据（谨慎使用）
 */
export const clearAllSyncData = (): void => {
  clearOfflineQueue()
  clearPendingChanges()
  setSyncStatus('idle')
}
