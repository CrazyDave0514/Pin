/**
 * 网络状态检测服务
 * 用于检测网络连接状态，支持在线/离线状态切换监听
 */

/** 网络状态类型 */
export type NetworkType = 'wifi' | '4g' | '3g' | '2g' | 'unknown' | 'none'

/** 网络状态信息 */
export interface NetworkStatus {
  /** 是否已连接 */
  isConnected: boolean
  /** 网络类型 */
  networkType: NetworkType
}

/** 网络状态变化监听器 */
type NetworkStatusListener = (status: NetworkStatus) => void

/** 监听器集合 */
const listeners = new Set<NetworkStatusListener>()

/** 当前网络状态 */
let currentStatus: NetworkStatus = {
  isConnected: true,
  networkType: 'unknown',
}

/**
 * 获取当前网络状态
 */
export const getNetworkStatus = (): NetworkStatus => {
  return { ...currentStatus }
}

/**
 * 检查是否在线
 */
export const isOnline = (): boolean => {
  return currentStatus.isConnected
}

/**
 * 检查是否离线
 */
export const isOffline = (): boolean => {
  return !currentStatus.isConnected
}

/**
 * 更新网络状态
 */
const updateNetworkStatus = (status: NetworkStatus): void => {
  const prevStatus = currentStatus
  currentStatus = status

  // 状态变化时通知所有监听器
  if (prevStatus.isConnected !== status.isConnected) {
    listeners.forEach((listener) => {
      try {
        listener(status)
      } catch (e) {
        console.error('Network status listener error:', e)
      }
    })
  }
}

/**
 * 初始化网络状态监听
 * 在应用启动时调用
 */
export const initNetworkStatus = (): void => {
  // #ifdef H5
  // H5 环境使用浏览器 API
  const updateOnlineStatus = () => {
    updateNetworkStatus({
      isConnected: navigator.onLine,
      networkType: navigator.onLine ? 'unknown' : 'none',
    })
  }

  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  updateOnlineStatus()
  // #endif

  // #ifndef H5
  // 小程序/APP 环境使用 uni API
  uni.getNetworkType({
    success: (res) => {
      updateNetworkStatus({
        isConnected: res.networkType !== 'none',
        networkType: res.networkType as NetworkType,
      })
    },
  })

  uni.onNetworkStatusChange((res) => {
    updateNetworkStatus({
      isConnected: res.isConnected,
      networkType: res.networkType as NetworkType,
    })
  })
  // #endif
}

/**
 * 添加网络状态变化监听器
 * @param listener 监听器函数
 * @returns 取消监听的函数
 */
export const onNetworkStatusChange = (listener: NetworkStatusListener): (() => void) => {
  listeners.add(listener)

  // 立即返回当前状态
  listener(currentStatus)

  // 返回取消监听的函数
  return () => {
    listeners.delete(listener)
  }
}

/**
 * 移除网络状态变化监听器
 */
export const offNetworkStatusChange = (listener: NetworkStatusListener): void => {
  listeners.delete(listener)
}

/**
 * 等待网络恢复
 * @param timeout 超时时间（毫秒）
 * @returns 是否成功恢复
 */
export const waitForOnline = (timeout = 30000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true)
      return
    }

    const unsubscribe = onNetworkStatusChange((status) => {
      if (status.isConnected) {
        unsubscribe()
        resolve(true)
      }
    })

    // 超时处理
    setTimeout(() => {
      unsubscribe()
      resolve(false)
    }, timeout)
  })
}
