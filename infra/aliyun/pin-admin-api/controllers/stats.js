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

/**
 * 获取用户注册趋势（近N天）
 * @param {Object} request - 请求对象
 * @returns {Promise<Object>} 响应对象
 */
const getUserTrend = async (request) => {
  const { days = 7 } = request.queries || {};
  const store = new PinTablestoreStore();

  const users = await store.getUserList();
  const n = Math.min(Number(days), 30);

  const trend = [];
  const now = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = users.filter(u => u.createdAt >= date.getTime() && u.createdAt < nextDate.getTime()).length;

    trend.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      count,
    });
  }

  return success(trend);
};

/**
 * 获取作品分布统计
 * @param {Object} request - 请求对象
 * @returns {Promise<Object>} 响应对象
 */
const getArtworkDistribution = async (request) => {
  const store = new PinTablestoreStore();
  const artworks = await store.getArtworks();
  const users = await store.getUserList();

  // 按创建时间分类：7天内、30天内、更早
  const now = Date.now();
  const sevenDays = now - 7 * 24 * 3600 * 1000;
  const thirtyDays = now - 30 * 24 * 3600 * 1000;

  const recent = artworks.filter(a => a.createdAt >= sevenDays).length;
  const month = artworks.filter(a => a.createdAt >= thirtyDays && a.createdAt < sevenDays).length;
  const older = artworks.filter(a => a.createdAt < thirtyDays).length;

  // 活跃用户（7天内有作品的用户）
  const activeUids = new Set(
    artworks.filter(a => a.createdAt >= sevenDays).map(a => a.ownerUid)
  );
  const activeUsers = users.filter(u => activeUids.has(u.uid)).length;
  const newUsers = users.filter(u => u.createdAt >= sevenDays).length;
  const silentUsers = Math.max(0, users.length - activeUsers - newUsers);

  return success({
    artworkTimeline: [
      { name: '近7天', value: recent },
      { name: '7-30天', value: month },
      { name: '30天前', value: older },
    ],
    userDistribution: [
      { name: '活跃用户', value: activeUsers },
      { name: '新用户', value: newUsers },
      { name: '沉默用户', value: silentUsers },
    ],
  });
};

module.exports = {
  getOverview,
  getUserTrend,
  getArtworkDistribution,
};
