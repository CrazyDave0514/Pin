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

declare const uni: {
  getStorageSync: (key: string) => unknown
  setStorageSync: (key: string, value: unknown) => void
  removeStorageSync: (key: string) => void
  clearStorageSync: () => void
  getStorageInfoSync?: () => { keys: string[] }
}

export class UniStorageAdapter implements StorageAdapter {
  getSync<T>(key: string): T | undefined {
    const value = uni.getStorageSync(key)
    return value === '' || value === undefined ? undefined : (value as T)
  }

  setSync<T>(key: string, value: T): void {
    uni.setStorageSync(key, value)
  }

  removeSync(key: string): void {
    uni.removeStorageSync(key)
  }

  clearSync(): void {
    uni.clearStorageSync()
  }

  keysSync(): string[] {
    const info = uni.getStorageInfoSync?.()
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
