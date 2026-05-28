/**
 * H5 环境适配器
 * 提供 H5 生产构建中 uni API 不可用时 fallback 到原生浏览器 API 的能力
 */

/**
 * 检查当前环境是否支持 uni API
 */
export const isUniAvailable = (): boolean => {
  try {
    return typeof uni !== 'undefined' && !!uni.request
  } catch {
    return false
  }
}

/**
 * 检查当前环境是否支持 localStorage
 */
export const isLocalStorageAvailable = (): boolean => {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

/**
 * HTTP 请求选项
 */
export interface H5RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: unknown
  header?: Record<string, string>
  timeout?: number
  success?: (response: { statusCode: number; data: unknown }) => void
  fail?: (error: { errMsg: string }) => void
}

/**
 * 使用原生 fetch API 发送 HTTP 请求（H5 fallback）
 */
const requestWithFetch = (options: H5RequestOptions): void => {
  const { url, method = 'GET', data, header = {}, timeout = 10000 } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  fetch(url, {
    method,
    headers: header,
    body: data ? JSON.stringify(data) : undefined,
    signal: controller.signal,
  })
    .then(async (response) => {
      clearTimeout(timeoutId)
      const statusCode = response.status
      let responseData: unknown

      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = await response.text()
      }

      options.success?.({ statusCode, data: responseData })
    })
    .catch((error) => {
      clearTimeout(timeoutId)
      const errMsg = error instanceof Error ? error.message : '请求失败'
      options.fail?.({ errMsg })
    })
}

/**
 * 兼容 H5 的 HTTP 请求
 * 优先使用 uni.request，H5 环境 fallback 到 fetch
 */
export const h5Request = (options: H5RequestOptions): void => {
  if (isUniAvailable()) {
    uni.request(options)
  } else {
    requestWithFetch(options)
  }
}

/**
 * Storage 操作选项
 */
export interface H5StorageOptions {
  key: string
  data?: unknown
  success?: () => void
  fail?: () => void
}

/**
 * 兼容 H5 的同步存储获取
 */
export const h5GetStorageSync = (key: string): unknown => {
  if (isUniAvailable()) {
    return uni.getStorageSync(key)
  }

  if (isLocalStorageAvailable()) {
    try {
      const value = localStorage.getItem(key)
      if (value === null) return undefined
      // 尝试解析 JSON
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    } catch {
      return undefined
    }
  }

  return undefined
}

/**
 * 兼容 H5 的同步存储设置
 */
export const h5SetStorageSync = (key: string, data: unknown): void => {
  if (isUniAvailable()) {
    uni.setStorageSync(key, data)
    return
  }

  if (isLocalStorageAvailable()) {
    try {
      const value = typeof data === 'string' ? data : JSON.stringify(data)
      localStorage.setItem(key, value)
    } catch {
      // 存储失败时静默处理
    }
  }
}

/**
 * 兼容 H5 的同步存储删除
 */
export const h5RemoveStorageSync = (key: string): void => {
  if (isUniAvailable()) {
    uni.removeStorageSync(key)
    return
  }

  if (isLocalStorageAvailable()) {
    try {
      localStorage.removeItem(key)
    } catch {
      // 删除失败时静默处理
    }
  }
}

/**
 * 兼容 H5 的同步清除所有存储
 */
export const h5ClearStorageSync = (): void => {
  if (isUniAvailable()) {
    uni.clearStorageSync()
    return
  }

  if (isLocalStorageAvailable()) {
    try {
      localStorage.clear()
    } catch {
      // 清除失败时静默处理
    }
  }
}

/**
 * 兼容 H5 的获取所有存储键
 */
export const h5GetStorageInfoSync = (): { keys: string[] } => {
  if (isUniAvailable() && uni.getStorageInfoSync) {
    return uni.getStorageInfoSync()
  }

  if (isLocalStorageAvailable()) {
    try {
      return { keys: Object.keys(localStorage) }
    } catch {
      return { keys: [] }
    }
  }

  return { keys: [] }
}
