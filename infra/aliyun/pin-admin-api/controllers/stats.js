/**
 * @fileoverview 统计数据控制器
 * @description 处理仪表盘统计数据
 */

'use strict';

const { success } = require('../common/response');
const { PinTablestoreStore } = require('../services/tablestore-store');
const { getVisitStats } = require('../common/sls');

/**
 * 获取概览统计
 * @param {Object} request - 请求对象
 * @returns {Promise<Object>} 响应对象
 */
const getOverview = async (request) => {
  const store = new PinTablestoreStore();
  
  // 获取所有用户和作品
  const [users, artworks] = await Promise.all([
    store.getUserList(),
    store.getArtworks(),
  ]);
  
  const totalUsers = users.length;
  const totalArtworks = artworks.length;
  
  // 计算今日新增（按创建时间）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();
  
  const todayNewUsers = users.filter(u => u.createdAt >= todayTimestamp).length;
  const todayNewArtworks = artworks.filter(a => a.createdAt >= todayTimestamp).length;
  
  // 获取访问统计（从 SLS）
  const visitStats = await getVisitStats();
  
  return success({
    totalUsers,
    totalArtworks,
    todayNewUsers,
    todayNewArtworks,
    todayVisits: visitStats.today,
    yesterdayVisits: visitStats.yesterday,
    visitTrend: visitStats.trend,
  });
};

module.exports = {
  getOverview,
};
