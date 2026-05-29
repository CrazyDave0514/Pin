/**
 * @fileoverview 用户管理控制器
 * @description 处理用户列表、详情、删除等操作
 */

'use strict';

const { success, createError } = require('../common/response');
const { PinTablestoreStore } = require('../services/tablestore-store');

/**
 * 获取用户列表
 * @param {Object} request - 请求对象
 * @returns {Promise<Object>} 响应对象
 */
const getUserList = async (request) => {
  const { page = 1, pageSize = 20, keyword = '' } = request.queries || {};
  
  const store = new PinTablestoreStore();
  const allUsers = await store.getUserList();
  
  // 过滤搜索
  let filteredUsers = allUsers;
  if (keyword) {
    const lowerKeyword = keyword.toLowerCase();
    filteredUsers = allUsers.filter(user => 
      user.uid.toLowerCase().includes(lowerKeyword) ||
      user.username.toLowerCase().includes(lowerKeyword) ||
      user.email.toLowerCase().includes(lowerKeyword) ||
      user.nickname.toLowerCase().includes(lowerKeyword)
    );
  }
  
  // 分页
  const total = filteredUsers.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const list = filteredUsers.slice(start, end);
  
  // 脱敏处理（移除密码）
  const safeList = list.map(user => {
    const { password, ...safeUser } = user;
    return safeUser;
  });
  
  return success({
    list: safeList,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
  });
};

/**
 * 获取用户详情
 * @param {Object} request - 请求对象
 * @returns {Promise<Object>} 响应对象
 */
const getUserDetail = async (request) => {
  const { uid } = request.params || {};
  
  if (!uid) {
    throw createError(400, '用户ID不能为空', 'VALIDATION_ERROR');
  }
  
  const store = new PinTablestoreStore();
  
  // 获取用户信息
  const user = await store.getRow('pin_users', { uid });
  if (!user) {
    throw createError(404, '用户不存在', 'NOT_FOUND');
  }
  
  // 脱敏
  const { password, ...userInfo } = user;
  
  // 获取用户作品统计
  const artworks = await store.getArtworks();
  const userArtworks = artworks.filter(a => a.ownerUid === uid);
  const totalLikes = userArtworks.reduce((sum, a) => sum + (a.likes || 0), 0);
  const totalFavorites = userArtworks.reduce((sum, a) => sum + (a.favorites || 0), 0);
  
  return success({
    ...userInfo,
    stats: {
      artworkCount: userArtworks.length,
      totalLikes,
      totalFavorites,
    },
    artworks: userArtworks.map(a => ({
      id: a.id,
      name: a.name,
      thumbnail: a.thumbnail,
      likes: a.likes,
      favorites: a.favorites,
      createdAt: a.createdAt,
    })),
  });
};

/**
 * 删除用户
 * @param {Object} request - 请求对象
 * @returns {Promise<Object>} 响应对象
 */
const deleteUser = async (request) => {
  const { uid } = request.params || {};
  
  if (!uid) {
    throw createError(400, '用户ID不能为空', 'VALIDATION_ERROR');
  }
  
  const store = new PinTablestoreStore();
  
  // 检查用户是否存在
  const user = await store.getRow('pin_users', { uid });
  if (!user) {
    throw createError(404, '用户不存在', 'NOT_FOUND');
  }
  
  // 级联删除：删除用户的所有项目和作品
  const projects = await store.listSingleKeyTable('pin_projects', 'projectId');
  const userProjects = projects.filter(p => p.ownerUid === uid);
  
  for (const project of userProjects) {
    await store.deleteRow('pin_projects', { projectId: project.projectId });
  }
  
  // 删除用户
  await store.deleteRow('pin_users', { uid });
  
  // 删除用户相关数据（积分记录、设置等）
  const pointsRecords = await store.listDoubleKeyTable('pin_points_records', 'uid', uid, 'recordId');
  for (const record of pointsRecords) {
    await store.deleteRow('pin_points_records', { uid, recordId: record.recordId });
  }
  
  await store.deleteRow('pin_settings', { uid });
  
  return success({ message: '删除成功' });
};

module.exports = {
  getUserList,
  getUserDetail,
  deleteUser,
};
