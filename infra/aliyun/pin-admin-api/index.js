/**
 * @fileoverview Pin 管理后台 API 入口
 * @description 阿里云函数计算 FC 3.0 入口函数
 */

'use strict';

const { buildResponse, fail, createError } = require('./common/response');
const { extractTokenFromRequest, verifyToken } = require('./common/jwt');
const authController = require('./controllers/auth');
const userController = require('./controllers/user');
const artworkController = require('./controllers/artwork');
const statsController = require('./controllers/stats');

// ============================================
// 请求解析工具
// ============================================

/**
 * 安全解析 JSON
 * @param {string} value - JSON 字符串
 * @returns {Object|null} 解析结果
 */
const safeJsonParse = (value) => {
  if (typeof value !== 'string' || !value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

/**
 * 标准化事件源
 * @param {Buffer|string|Object} event - 事件对象
 * @returns {Object} 标准化后的对象
 */
const normalizeEventSource = (event) => {
  if (typeof event === 'string') {
    return safeJsonParse(event) || { body: event };
  }

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(event)) {
    const text = event.toString('utf8');
    return safeJsonParse(text) || { body: text };
  }

  if (event instanceof Uint8Array) {
    const text = Buffer.from(event).toString('utf8');
    return safeJsonParse(text) || { body: text };
  }

  return event || {};
};

/**
 * 解析请求体
 * @param {Object} request - 请求对象
 * @returns {Object} 解析后的请求体
 */
const parseRequestBody = (request) => {
  const body = request?.body;
  if (!body) return {};
  if (Buffer.isBuffer(body)) {
    const text = body.toString('utf8');
    return safeJsonParse(text) || {};
  }
  if (typeof body === 'string') {
    return safeJsonParse(body) || {};
  }
  return body;
};

/**
 * 标准化路由路径
 * @param {string} path - 原始路径
 * @returns {string} 标准化后的路径
 */
const normalizeRoutePath = (path) => {
  const normalized = String(path || '/').trim() || '/';
  // 移除常见的 FC 3.0 路径前缀
  if (normalized === '/pin') return '/';
  if (normalized.startsWith('/pin/')) {
    return normalized.slice(4) || '/';
  }
  // 移除 /proxy/<trigger-name>/ 前缀（FC HTTP 代理）
  if (normalized.startsWith('/proxy/')) {
    const parts = normalized.slice(7).split('/');
    if (parts.length > 1) {
      return '/' + parts.slice(1).join('/') || '/';
    }
  }
  return normalized;
};

/**
 * 标准化请求对象
 * @param {Object} event - FC 事件对象
 * @returns {Object} 标准化后的请求对象
 */
const normalizeRequest = (event) => {
  const rootRequest = normalizeEventSource(event);

  // 判断是否为 HTTP Trigger 的请求对象格式
  const isHttpRequest = rootRequest.path && rootRequest.method && !rootRequest.httpMethod && !rootRequest.requestContext;

  let request, body;
  if (isHttpRequest) {
    request = rootRequest;
    body = parseRequestBody(request);
  } else {
    const nestedBody = parseRequestBody(rootRequest);
    request = (
      !rootRequest.path &&
      !rootRequest.rawPath &&
      nestedBody &&
      typeof nestedBody === 'object' &&
      (nestedBody.path || nestedBody.rawPath || nestedBody.httpMethod || nestedBody.method)
    ) ? nestedBody : rootRequest;

    body = request === nestedBody ? parseRequestBody(request) : nestedBody;
  }

  const method = String(
    request.httpMethod ||
    request.method ||
    request.requestContext?.http?.method ||
    rootRequest.httpMethod ||
    rootRequest.method ||
    'GET'
  ).toUpperCase();

  // 提取认证 Token
  let token = null;
  if (request.queries && request.queries.token) {
    token = request.queries.token;
  }

  if (!token) {
    const rawHeaders = request.headers || {};
    const authToken = rawHeaders['x-auth-token'] || rawHeaders['X-Auth-Token'] || '';
    if (authToken) {
      token = authToken;
    } else {
      const authHeader = rawHeaders.authorization || rawHeaders.Authorization || '';
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
  }

  return {
    raw: request,
    path: normalizeRoutePath(
      request.path ||
      request.rawPath ||
      request.requestContext?.path ||
      request.uri ||
      '/'
    ),
    method,
    body,
    token,
    queries: request.queries || request.queryParameters || {},
    params: {},
  };
};

/**
 * 从路径中提取参数
 * @param {string} pattern - 路由模式
 * @param {string} path - 实际路径
 * @returns {Object|null} 参数对象或 null
 */
const matchRoute = (pattern, path) => {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }

  return params;
};

// ============================================
// 路由处理
// ============================================

/**
 * 验证管理员 Token
 * @param {Object} request - 请求对象
 * @returns {Object} 解码后的 Token 载荷
 * @throws {Error} Token 无效或过期
 */
const verifyAdminToken = (request) => {
  const token = extractTokenFromRequest(request);
  if (!token) {
    throw createError(401, '未提供认证令牌', 'UNAUTHORIZED');
  }

  try {
    const decoded = verifyToken(token);
    if (decoded.role !== 'admin') {
      throw createError(403, '无管理员权限', 'FORBIDDEN');
    }
    return decoded;
  } catch (error) {
    if (error.code === 'TOKEN_EXPIRED') {
      throw createError(401, '令牌已过期', 'TOKEN_EXPIRED');
    }
    throw createError(401, '令牌无效', 'TOKEN_INVALID');
  }
};

/**
 * 路由处理
 * @param {Object} request - 请求对象
 * @returns {Promise<Object>} 响应对象
 */
const route = async (request) => {
  const { method, path } = request;

  // 健康检查
  if (path === '/health' && method === 'GET') {
    return { statusCode: 200, body: JSON.stringify({ status: 'ok', service: 'pin-admin-api' }) };
  }

  // 管理员认证路由（无需 token）
  if (path === '/admin/login' && method === 'POST') {
    return await authController.login(request);
  }

  // 以下路由需要管理员认证
  verifyAdminToken(request);

  if (path === '/admin/logout' && method === 'POST') {
    return await authController.logout(request);
  }

  if (path === '/admin/me' && method === 'GET') {
    return await authController.getCurrentAdmin(request);
  }

  // 用户管理路由
  if (path === '/admin/users' && method === 'GET') {
    return await userController.getUserList(request);
  }

  if (path === '/admin/users/batch' && method === 'DELETE') {
    return await userController.batchDeleteUsers(request);
  }

  if (path === '/admin/users/cleanup-ghost' && method === 'POST') {
    return await userController.cleanupGhostUsers(request);
  }

  const userDetailMatch = matchRoute('/admin/users/:uid', path);
  if (userDetailMatch && method === 'GET') {
    request.params = userDetailMatch;
    return await userController.getUserDetail(request);
  }

  if (userDetailMatch && method === 'DELETE') {
    request.params = userDetailMatch;
    return await userController.deleteUser(request);
  }

  // 作品管理路由
  if (path === '/admin/artworks' && method === 'GET') {
    return await artworkController.getArtworkList(request);
  }

  const artworkDetailMatch = matchRoute('/admin/artworks/:id', path);
  if (artworkDetailMatch && method === 'GET') {
    request.params = artworkDetailMatch;
    return await artworkController.getArtworkDetail(request);
  }

  if (artworkDetailMatch && method === 'DELETE') {
    request.params = artworkDetailMatch;
    return await artworkController.deleteArtwork(request);
  }

  const artworkOffShelfMatch = matchRoute('/admin/artworks/:id/offshelf', path);
  if (artworkOffShelfMatch && method === 'POST') {
    request.params = artworkOffShelfMatch;
    return await artworkController.offShelfArtwork(request);
  }

  // 统计路由
  if (path === '/admin/stats/overview' && method === 'GET') {
    return await statsController.getOverview(request);
  }

  if (path === '/admin/stats/user-trend' && method === 'GET') {
    return await statsController.getUserTrend(request);
  }

  if (path === '/admin/stats/artwork-distribution' && method === 'GET') {
    return await statsController.getArtworkDistribution(request);
  }

  return fail(404, `路由不存在: ${method} ${path}`, 'NOT_FOUND');
};

// ============================================
// 云函数入口
// ============================================

/**
 * FC 3.0 入口函数
 * @param {Buffer|Object} event - 事件对象
 * @param {Object} context - 上下文对象
 * @returns {Promise<string>} JSON 字符串响应
 */
exports.handler = async (event, context) => {
  try {
    // 解析事件对象
    let eventObj;
    if (Buffer.isBuffer(event)) {
      eventObj = JSON.parse(event.toString());
    } else if (typeof event === 'string') {
      eventObj = JSON.parse(event);
    } else if (typeof event === 'object') {
      eventObj = event;
    } else {
      eventObj = {};
    }

    const request = normalizeRequest(eventObj);
    const response = await route(request);

    return JSON.stringify(response);
  } catch (error) {
    console.error('Handler error:', error);

    const statusCode = error.statusCode || 500;
    const errorResponse = buildResponse(statusCode, {
      success: false,
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
    });

    return JSON.stringify(errorResponse);
  }
};
