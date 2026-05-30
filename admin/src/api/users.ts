/**
 * @fileoverview 用户管理 API
 */

import request from '@/utils/request'

export interface User {
  uid: string
  username: string
  email: string
  nickname: string
  avatar: string
  createdAt: number
  bio?: string
}

export interface UserListParams {
  page?: number
  pageSize?: number
  keyword?: string
}

export interface UserListResult {
  list: User[]
  total: number
  page: number
  pageSize: number
}

export interface UserStats {
  artworkCount: number
  totalLikes: number
  totalFavorites: number
}

export interface UserDetail extends User {
  stats: UserStats
  artworks: {
    id: string
    name: string
    thumbnail: string
    likes: number
    favorites: number
    createdAt: number
  }[]
}

/**
 * 获取用户列表
 */
export const getUserList = (params: UserListParams): Promise<UserListResult> => {
  return request.get('/admin/users', { params })
}

/**
 * 获取用户详情
 */
export const getUserDetail = (uid: string): Promise<UserDetail> => {
  return request.get(`/admin/users/${uid}`)
}

/**
 * 删除用户
 */
export const deleteUser = (uid: string): Promise<{ message: string }> => {
  return request.delete(`/admin/users/${uid}`)
}
