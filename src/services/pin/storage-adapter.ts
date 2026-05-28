import {
  h5GetStorageSync,
  h5SetStorageSync,
  h5RemoveStorageSync,
  h5ClearStorageSync,
  h5GetStorageInfoSync,
} from './h5-adapter.ts'

export interface StorageAdapter {
  getSync<T>(key: string): T | undefined
  setSync<T>(key: string, value: T): void
  removeSync(key: string): void
  clearSync(): void
  keysSync(): string[]
}

const cloneValue = <T>(value: T): T => {
  if (value === undefined || value === null) return value
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * UniStorageAdapter - 使用 uni API 的存储适配器
 * 在 H5 生产构建中自动 fallback 到 localStorage
 */
export class UniStorageAdapter implements StorageAdapter {
  getSync<T>(key: string): T | undefined {
    const value = h5GetStorageSync(key)
    return value === '' || value === undefined ? undefined : (value as T)
  }

  setSync<T>(key: string, value: T): void {
    h5SetStorageSync(key, value)
  }

  removeSync(key: string): void {
    h5RemoveStorageSync(key)
  }

  clearSync(): void {
    h5ClearStorageSync()
  }

  keysSync(): string[] {
    const info = h5GetStorageInfoSync()
    return Array.isArray(info?.keys) ? info.keys : []
  }
}

export class MemoryStorageAdapter implements StorageAdapter {
  private readonly store = new Map<string, unknown>()

  getSync<T>(key: string): T | undefined {
    return cloneValue(this.store.get(key) as T)
  }

  setSync<T>(key: string, value: T): void {
    this.store.set(key, cloneValue(value))
  }

  removeSync(key: string): void {
    this.store.delete(key)
  }

  clearSync(): void {
    this.store.clear()
  }

  keysSync(): string[] {
    return Array.from(this.store.keys())
  }
}

let currentStorageAdapter: StorageAdapter = new UniStorageAdapter()

export const getStorageAdapter = () => currentStorageAdapter

export const setStorageAdapter = (adapter: StorageAdapter) => {
  currentStorageAdapter = adapter
}
