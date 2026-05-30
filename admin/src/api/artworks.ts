/**
 * @fileoverview 作品管理 API
 */

import request from '@/utils/request'

export interface Artwork {
  id: string
  name: string
  creatorName: string
  thumbnail: string
  points: number
  likes: number
  favorites: number
  viewCount: number
  isOffShelf: boolean
  createdAt: number
}

export interface ArtworkListParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: 'all' | 'active' | 'offshelf'
  startDate?: string
  endDate?: string
}

export interface ArtworkListResult {
  list: Artwork[]
  total: number
  page: number
  pageSize: number
}

export interface ArtworkDetail {
  id: string
  name: string
  creatorName: string
  creatorAvatar: string
  ownerUid: string
  description: string
  tags: string[]
  likes: number
  favorites: number
  viewCount: number
  useCount: number
  points: number
  isPublic: boolean
  isOffShelf: boolean
  beadCount: number
  colorTypeCount: number
  thumbnail: string
  createdAt: number
  updatedAt: number
}

/**
 * 获取作品列表
 */
export const getArtworkList = (params: ArtworkListParams): Promise<ArtworkListResult> => {
  return request.get('/admin/artworks', { params })
}

/**
 * 获取作品详情
 */
export const getArtworkDetail = (id: string): Promise<ArtworkDetail> => {
  return request.get(`/admin/artworks/${id}`)
}

/**
 * 下架作品
 */
export const offShelfArtwork = (id: string): Promise<{ message: string }> => {
  return request.post(`/admin/artworks/${id}/offshelf`)
}

/**
 * 删除作品
 */
export const deleteArtwork = (id: string): Promise<{ message: string }> => {
  return request.delete(`/admin/artworks/${id}`)
}
