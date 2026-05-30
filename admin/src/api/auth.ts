/**
 * @fileoverview 认证相关 API
 */

import request from '@/utils/request'

export interface LoginParams {
  email: string
  password: string
}

export interface LoginResult {
  token: string
  admin: {
    email: string
    name: string
  }
}

export interface AdminInfo {
  admin: {
    email: string
    role: string
  }
}

/**
 * 管理员登录
 */
export const login = (params: LoginParams): Promise<LoginResult> => {
  return request.post('/admin/login', params)
}

/**
 * 管理员登出
 */
export const logout = (): Promise<{ message: string }> => {
  return request.post('/admin/logout')
}

/**
 * 获取当前管理员信息
 */
export const getCurrentAdmin = (): Promise<AdminInfo> => {
  return request.get('/admin/me')
}
