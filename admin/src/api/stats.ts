/**
 * @fileoverview 统计数据 API
 */

import request from '@/utils/request'

export interface OverviewStats {
  totalUsers: number
  totalArtworks: number
  todayNewUsers: number
  todayNewArtworks: number
  todayVisits: number
  yesterdayVisits: number
  visitTrend: number
}

/**
 * 获取概览统计
 */
export const getOverview = (): Promise<OverviewStats> => {
  return request.get('/admin/stats/overview')
}
