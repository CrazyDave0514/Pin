/**
 * 登录检查工具
 * 统一处理未登录状态下的权限控制和引导
 */

import { pinDataProvider } from '../services/pin/index'

/**
 * 登录检查选项
 */
export interface AuthGuardOptions {
  /** 是否显示登录引导弹窗 */
  showLoginModal?: boolean
  /** 自定义提示消息 */
  message?: string
  /** 登录成功后跳转的页面 */
  redirectUrl?: string
}

/**
 * 检查用户是否已登录
 * @returns 是否已登录
 */
export const isLoggedIn = (): boolean => {
  return pinDataProvider.isAuthenticated()
}

/**
 * 检查登录状态，未登录时显示引导
 * @param options 选项
 * @returns 是否已登录
 */
export const checkLogin = (options: AuthGuardOptions = {}): boolean => {
  const loggedIn = isLoggedIn()

  if (!loggedIn && options.showLoginModal !== false) {
    showLoginModal(options.message, options.redirectUrl)
  }

  return loggedIn
}

/**
 * 显示登录引导弹窗
 * @param message 自定义提示消息
 * @param redirectUrl 登录成功后跳转的页面
 */
export const showLoginModal = (
  message = '该功能需要登录后才能使用',
  redirectUrl?: string
): void => {
  uni.showModal({
    title: '需要登录',
    content: message,
    confirmText: '去登录',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        navigateToLogin(redirectUrl)
      }
    },
  })
}

/**
 * 跳转到登录页
 * @param redirectUrl 登录成功后跳转的页面
 */
export const navigateToLogin = (redirectUrl?: string): void => {
  const url = redirectUrl
    ? `/pages/login/index?redirect=${encodeURIComponent(redirectUrl)}`
    : '/pages/login/index'

  uni.navigateTo({ url })
}

/**
 * 需要登录的装饰器（用于方法）
 * @param target 目标对象
 * @param propertyKey 属性键
 * @param descriptor 属性描述符
 */
export const requireLogin = (
  target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): void => {
  const originalMethod = descriptor.value

  descriptor.value = function (...args: unknown[]) {
    if (!isLoggedIn()) {
      showLoginModal()
      return
    }
    return originalMethod.apply(this, args)
  }
}

/**
 * 异步检查登录状态
 * @returns Promise<boolean> 是否已登录
 */
export const checkLoginAsync = async (): Promise<boolean> => {
  try {
    const user = await pinDataProvider.getCurrentUserByToken()
    return !!user
  } catch {
    return false
  }
}

/**
 * 登录守卫组合式函数（用于 Vue3 Composition API）
 * @returns 登录相关方法
 */
export const useAuthGuard = () => {
  return {
    isLoggedIn,
    checkLogin,
    checkLoginAsync,
    showLoginModal,
    navigateToLogin,
  }
}
