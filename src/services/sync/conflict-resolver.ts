/**
 * 冲突解决服务
 * 用于检测和解决多端编辑时的数据冲突
 */

import { getStorageAdapter } from '../pin/storage-adapter.ts'

/** 冲突类型 */
export type ConflictType = 'project' | 'folder' | 'artwork' | 'settings'

/** 冲突解决策略 */
export type ConflictStrategy = 'local' | 'remote' | 'merge' | 'manual'

/** 冲突记录 */
export interface ConflictRecord {
  /** 冲突ID */
  id: string
  /** 冲突类型 */
  type: ConflictType
  /** 目标ID */
  targetId: string
  /** 目标名称 */
  targetName: string
  /** 本地版本 */
  localVersion: number
  /** 远程版本 */
  remoteVersion: number
  /** 本地数据 */
  localData: any
  /** 远程数据 */
  remoteData: any
  /** 冲突字段列表 */
  conflictFields: string[]
  /** 创建时间 */
  createdAt: number
  /** 是否已解决 */
  resolved: boolean
  /** 解决策略 */
  resolvedStrategy?: ConflictStrategy
  /** 解决时间 */
  resolvedAt?: number
  /** 解决后的数据 */
  resolvedData?: any
}

/** 版本信息 */
export interface VersionInfo {
  /** 版本号 */
  version: number
  /** 最后修改时间 */
  lastModified: number
  /** 修改设备ID */
  deviceId: string
  /** 修改用户ID */
  userId: string
}

/** 存储键 */
const CONFLICTS_KEY = 'pin_sync_conflicts'
const VERSIONS_KEY = 'pin_data_versions'

/**
 * 生成唯一ID
 */
const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 获取当前设备ID
 */
const getDeviceId = (): string => {
  const storage = getStorageAdapter()
  let deviceId = storage.getSync<string>('pin_device_id')
  if (!deviceId) {
    deviceId = `D${Date.now().toString(36).toUpperCase()}`
    storage.setSync('pin_device_id', deviceId)
  }
  return deviceId
}

/**
 * 获取存储适配器
 */
const getStorage = () => getStorageAdapter()

/**
 * 获取数据版本信息
 */
export const getVersionInfo = (targetId: string): VersionInfo | null => {
  try {
    const storage = getStorage()
    const versions = storage.getSync<Record<string, VersionInfo>>(VERSIONS_KEY) || {}
    return versions[targetId] || null
  } catch (e) {
    console.error('Failed to get version info:', e)
    return null
  }
}

/**
 * 设置数据版本信息
 */
export const setVersionInfo = (targetId: string, info: Partial<VersionInfo>): void => {
  try {
    const storage = getStorage()
    const versions = storage.getSync<Record<string, VersionInfo>>(VERSIONS_KEY) || {}
    const existing = versions[targetId]

    versions[targetId] = {
      version: (existing?.version || 0) + 1,
      lastModified: Date.now(),
      deviceId: getDeviceId(),
      userId: existing?.userId || '',
      ...info,
    }

    storage.setSync(VERSIONS_KEY, versions)
  } catch (e) {
    console.error('Failed to set version info:', e)
  }
}

/**
 * 检测冲突
 * @param targetId 目标ID
 * @param type 数据类型
 * @param localData 本地数据
 * @param remoteData 远程数据
 * @returns 冲突记录，无冲突返回null
 */
export const detectConflict = (
  targetId: string,
  type: ConflictType,
  localData: any,
  remoteData: any
): ConflictRecord | null => {
  // 如果数据相同，无冲突
  if (JSON.stringify(localData) === JSON.stringify(remoteData)) {
    return null
  }

  // 获取版本信息
  const localVersion = getVersionInfo(targetId)?.version || 0
  const remoteVersion = remoteData?._version || 0

  // 如果本地版本 >= 远程版本，无冲突（本地更新）
  if (localVersion >= remoteVersion) {
    return null
  }

  // 检测冲突字段
  const conflictFields = detectConflictFields(localData, remoteData)

  if (conflictFields.length === 0) {
    return null
  }

  // 创建冲突记录
  const conflict: ConflictRecord = {
    id: generateId(),
    type,
    targetId,
    targetName: localData?.name || remoteData?.name || targetId,
    localVersion,
    remoteVersion,
    localData,
    remoteData,
    conflictFields,
    createdAt: Date.now(),
    resolved: false,
  }

  // 保存冲突记录
  saveConflict(conflict)

  return conflict
}

/**
 * 检测冲突字段
 */
const detectConflictFields = (local: any, remote: any): string[] => {
  const fields = new Set<string>()

  // 获取所有字段
  const allFields = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})])

  allFields.forEach((field) => {
    // 忽略内部字段
    if (field.startsWith('_')) return

    const localValue = local?.[field]
    const remoteValue = remote?.[field]

    // 如果值不同，标记为冲突
    if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
      fields.add(field)
    }
  })

  return Array.from(fields)
}

/**
 * 保存冲突记录
 */
export const saveConflict = (conflict: ConflictRecord): void => {
  try {
    const storage = getStorage()
    const conflicts = storage.getSync<ConflictRecord[]>(CONFLICTS_KEY) || []

    // 检查是否已存在相同目标的未解决冲突
    const existingIndex = conflicts.findIndex(
      (c) => c.targetId === conflict.targetId && !c.resolved
    )

    if (existingIndex >= 0) {
      // 更新现有冲突
      conflicts[existingIndex] = conflict
    } else {
      // 添加新冲突
      conflicts.push(conflict)
    }

    storage.setSync(CONFLICTS_KEY, conflicts)
  } catch (e) {
    console.error('Failed to save conflict:', e)
  }
}

/**
 * 获取所有未解决的冲突
 */
export const getPendingConflicts = (): ConflictRecord[] => {
  try {
    const storage = getStorage()
    const conflicts = storage.getSync<ConflictRecord[]>(CONFLICTS_KEY) || []
    return conflicts.filter((c) => !c.resolved)
  } catch (e) {
    console.error('Failed to get pending conflicts:', e)
    return []
  }
}

/**
 * 获取所有冲突（包括已解决）
 */
export const getAllConflicts = (): ConflictRecord[] => {
  try {
    const storage = getStorage()
    return storage.getSync<ConflictRecord[]>(CONFLICTS_KEY) || []
  } catch (e) {
    console.error('Failed to get all conflicts:', e)
    return []
  }
}

/**
 * 解决冲突
 * @param conflictId 冲突ID
 * @param strategy 解决策略
 * @param resolvedData 解决后的数据（手动合并时使用）
 */
export const resolveConflict = (
  conflictId: string,
  strategy: ConflictStrategy,
  resolvedData?: any
): boolean => {
  try {
    const storage = getStorage()
    const conflicts = storage.getSync<ConflictRecord[]>(CONFLICTS_KEY) || []
    const index = conflicts.findIndex((c) => c.id === conflictId)

    if (index < 0) return false

    const conflict = conflicts[index]
    let finalData = resolvedData

    // 根据策略确定最终数据
    switch (strategy) {
      case 'local':
        finalData = conflict.localData
        break
      case 'remote':
        finalData = conflict.remoteData
        break
      case 'merge':
        // 自动合并：以远程为基础，合并本地特有的字段
        finalData = { ...conflict.remoteData, ...conflict.localData }
        break
      case 'manual':
        // 手动合并：使用传入的数据
        if (!finalData) {
          console.error('Manual resolve requires resolvedData')
          return false
        }
        break
    }

    // 更新冲突记录
    conflicts[index] = {
      ...conflict,
      resolved: true,
      resolvedStrategy: strategy,
      resolvedAt: Date.now(),
      resolvedData: finalData,
    }

    storage.setSync(CONFLICTS_KEY, conflicts)

    // 更新版本信息
    setVersionInfo(conflict.targetId, { version: conflict.remoteVersion + 1 })

    return true
  } catch (e) {
    console.error('Failed to resolve conflict:', e)
    return false
  }
}

/**
 * 忽略冲突（暂时不解决）
 */
export const ignoreConflict = (conflictId: string): boolean => {
  // 暂时不做任何操作，冲突保留在列表中
  return true
}

/**
 * 清除已解决的冲突
 */
export const clearResolvedConflicts = (): void => {
  try {
    const storage = getStorage()
    const conflicts = storage.getSync<ConflictRecord[]>(CONFLICTS_KEY) || []
    const pending = conflicts.filter((c) => !c.resolved)
    storage.setSync(CONFLICTS_KEY, pending)
  } catch (e) {
    console.error('Failed to clear resolved conflicts:', e)
  }
}

/**
 * 清除所有冲突
 */
export const clearAllConflicts = (): void => {
  try {
    const storage = getStorage()
    storage.removeSync(CONFLICTS_KEY)
  } catch (e) {
    console.error('Failed to clear all conflicts:', e)
  }
}

/**
 * 检查是否有未解决的冲突
 */
export const hasPendingConflicts = (): boolean => {
  return getPendingConflicts().length > 0
}

/**
 * 获取冲突统计
 */
export const getConflictStats = (): {
  total: number
  pending: number
  resolved: number
  byType: Record<ConflictType, number>
} => {
  const all = getAllConflicts()
  const pending = all.filter((c) => !c.resolved)
  const resolved = all.filter((c) => c.resolved)

  const byType: Record<ConflictType, number> = {
    project: 0,
    folder: 0,
    artwork: 0,
    settings: 0,
  }

  pending.forEach((c) => {
    byType[c.type] = (byType[c.type] || 0) + 1
  })

  return {
    total: all.length,
    pending: pending.length,
    resolved: resolved.length,
    byType,
  }
}

/**
 * 自动解决简单冲突
 * 如果没有字段冲突，自动使用最新版本
 */
export const autoResolveSimpleConflicts = (): number => {
  const pending = getPendingConflicts()
  let resolvedCount = 0

  pending.forEach((conflict) => {
    // 如果冲突字段为空，自动使用远程版本
    if (conflict.conflictFields.length === 0) {
      resolveConflict(conflict.id, 'remote')
      resolvedCount++
    }
  })

  return resolvedCount
}
