/**
 * 全局错误处理工具
 * 提供统一的错误提示和处理机制
 */

/** 错误类型 */
export type ErrorType = 'network' | 'server' | 'validation' | 'auth' | 'unknown'

/** 错误信息配置 */
const ERROR_MESSAGES: Record<ErrorType, string> = {
  network: '网络连接失败，请检查网络后重试',
  server: '服务器繁忙，请稍后重试',
  validation: '输入信息有误，请检查后重试',
  auth: '登录已过期，请重新登录',
  unknown: '操作失败，请稍后重试',
}

/**
 * 解析错误类型
 * @param error 错误对象
 * @returns 错误类型
 */
export const parseErrorType = (error: unknown): ErrorType => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // 网络错误
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('failed to fetch') ||
      message.includes('network request failed') ||
      message.includes('abort')
    ) {
      return 'network'
    }

    // 认证错误
    if (
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('token') ||
      message.includes('auth') ||
      message.includes('登录')
    ) {
      return 'auth'
    }

    // 验证错误
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('格式') ||
      message.includes('不能为空')
    ) {
      return 'validation'
    }

    // 服务器错误
    if (
      message.includes('server') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    ) {
      return 'server'
    }
  }

  return 'unknown'
}

/**
 * 获取用户友好的错误信息
 * @param error 错误对象
 * @returns 错误信息
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // 如果错误信息是中文，直接返回
    if (/[\u4e00-\u9fa5]/.test(error.message)) {
      return error.message
    }

    // 根据错误类型返回对应信息
    const type = parseErrorType(error)
    return ERROR_MESSAGES[type]
  }

  if (typeof error === 'string') {
    return error
  }

  return ERROR_MESSAGES.unknown
}

/**
 * 显示错误提示
 * @param error 错误对象或错误信息
 * @param options 配置选项
 */
export const showError = (
  error: unknown,
  options: {
    /** 是否显示默认的错误提示 */
    showToast?: boolean
    /** 自定义错误信息 */
    customMessage?: string
    /** 错误回调 */
    onError?: (type: ErrorType, message: string) => void
  } = {}
): void => {
  const { showToast = true, customMessage, onError } = options

  const type = parseErrorType(error)
  const message = customMessage || getErrorMessage(error)

  // 调用错误回调
  if (onError) {
    onError(type, message)
  }

  // 显示错误提示
  if (showToast) {
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 3000,
    })
  }

  // 如果是认证错误，可以在这里处理登出逻辑
  if (type === 'auth') {
    // 可以触发全局的登录过期事件
    uni.$emit('auth:expired')
  }
}

/**
 * 显示成功提示
 * @param message 成功信息
 */
export const showSuccess = (message: string): void => {
  uni.showToast({
    title: message,
    icon: 'success',
    duration: 2000,
  })
}

/**
 * 显示加载提示
 * @param message 加载信息
 * @returns 关闭加载提示的函数
 */
export const showLoading = (message = '加载中...'): (() => void) => {
  uni.showLoading({
    title: message,
    mask: true,
  })

  return () => {
    uni.hideLoading()
  }
}

/**
 * 包装异步函数，自动处理错误
 * @param fn 异步函数
 * @param errorHandler 错误处理函数
 * @returns 包装后的函数
 */
export const withErrorHandler = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorHandler?: (error: unknown) => void
): ((...args: Parameters<T>) => Promise<ReturnType<T> | undefined>) => {
  return async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    try {
      return await fn(...args)
    } catch (error) {
      if (errorHandler) {
        errorHandler(error)
      } else {
        showError(error)
      }
      return undefined
    }
  }
}

/**
 * 重试机制
 * @param fn 需要重试的函数
 * @param options 重试配置
 * @returns 函数执行结果
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: {
    /** 最大重试次数 */
    maxRetries?: number
    /** 重试间隔（毫秒） */
    retryDelay?: number
    /** 重试条件 */
    retryCondition?: (error: unknown) => boolean
  } = {}
): Promise<T> => {
  const { maxRetries = 3, retryDelay = 1000, retryCondition } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // 检查是否需要重试
      if (attempt < maxRetries) {
        if (retryCondition && !retryCondition(error)) {
          throw error
        }

        // 等待后重试
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }

  throw lastError
}

/**
 * 全局错误处理器
 * 用于捕获未处理的 Promise 错误
 */
export const setupGlobalErrorHandler = (): void => {
  // #ifdef H5
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    showError(event.reason)
  })
  // #endif

  // uni-app 全局错误处理
  uni.onError((error) => {
    console.error('Uni app error:', error)
  })
}
