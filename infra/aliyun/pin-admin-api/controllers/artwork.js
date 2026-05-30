/**
 * @fileoverview 作品管理控制器
 * @description 处理作品列表、详情、下架、删除等操作
 */

'use strict';

const { success, createError } = require('../common/response');
const { PinTablestoreStore } = require('../services/tablestore-store');

/**
 * 获取作品列表
 * @param {Object} request - 请求对象
 * @returns {Promise<Object>} 响应对象
 */
const getArtworkList = async (request) => {
  const { 
    page = 1, 
    pageSize = 20, 
    keyword = '',
    status = 'all',
    startDate = '',
    endDate = '',
  } = request.queries || {};
  
  const store = new PinTablestoreStore();
  let artworks = await store.getArtworks();
  
  // 关键词搜索
  if (keyword) {
    const lowerKeyword = keyword.toLowerCase();
    artworks = artworks.filter(artwork => 
      artwork.id.toLowerCase().includes(lowerKeyword) ||
      artwork.name.toLowerCase().includes(lowerKeyword) ||
      artwork.creatorName.toLowerCase().includes(lowerKeyword)
    );
  }
  
  // 状态筛选
  if (status === 'active') {
    artworks = artworks.filter(a => !a.isOffShelf);
  } else if (status === 'offshelf') {
    artworks = artworks.filter(a => a.isOffShelf);
  }
  
  // 时间范围筛选
  if (startDate) {
    const start = Number(startDate);
    artworks = artworks.filter(a => a.createdAt >= start);
  }
  if (endDate) {
    const end = Number(endDate);
    artworks = artworks.filter(a => a.createdAt <= end);
  }
  
  // 分页
  const total = artworks.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const list = artworks.slice(start, end);
  
  return success({
    list,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
  });
};

/**
 * 获取作品详情
 * @param {Object} request - 请求对象
 * @returns {Promise<Object>} 响应对象
 */
const getArtworkDetail = async (request) => {
  const { id } = request.params || {};
  
  if (!id) {
    throw createError(400, '作品ID不能为空', 'VALIDATION_ERROR');
  }
  
  const store = new PinTablestoreStore();
  const artwork = await store.getArtworkById(id);
  
  if (!artwork) {
    throw createError(404, '作品不存在', 'NOT_FOUND');
  }
  
  return success(artwork);
};

/**
 * 下架作品
 * @param {Object} request - 请求对象
 * @returns {Promise<Object>} 响应对象
 */
const offShelfArtwork = async (request) => {
  const { id } = request.params || {};
  
  if (!id) {
    throw createError(400, '作品ID不能为空', 'VALIDATION_ERROR');
  }
  
  const store = new PinTablestoreStore();
  const artwork = await store.getArtworkById(id);
  
  if (!artwork) {
    throw createError(404, '作品不存在', 'NOT_FOUND');
  }
  
  // 设置下架状态
  artwork.isOffShelf = true;
  artwork.updatedAt = Date.now();
  
  // 更新作品
  const artworks = await store.getArtworks();
  const index = artworks.findIndex(a => a.id === id);
  if (index !== -1) {
    artworks[index] = artwork;
    await store.setArtworks(artworks);
  }
  
  return success({ message: '下架成功' });
};

/**
 * 删除作品
 * @param {Object} request - 请求对象
 * @returns {Promise<Object>} 响应对象
 */
const deleteArtwork = async (request) => {
  const { id } = request.params || {};
  
  if (!id) {
    throw createError(400, '作品ID不能为空', 'VALIDATION_ERROR');
  }
  
  const store = new PinTablestoreStore();
  const artwork = await store.getArtworkById(id);
  
  if (!artwork) {
    throw createError(404, '作品不存在', 'NOT_FOUND');
  }
  
  // 删除作品
  await store.deleteRow('pin_artworks', { artworkId: id });
  
  return success({ message: '删除成功' });
};

module.exports = {
  getArtworkList,
  getArtworkDetail,
  offShelfArtwork,
  deleteArtwork,
};
