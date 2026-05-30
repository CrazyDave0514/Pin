/**
 * @fileoverview 管理员认证控制器
 * @description 处理管理员登录、登出、信息获取
 */

'use strict';

const bcrypt = require('bcryptjs');
const { success, fail, createError } = require('../common/response');
const { generateToken, verifyToken, extractTokenFromRequest } = require('../common/jwt');

// 管理员白名单（从环境变量读取）
const getAdminEmails = () => {
  const emails = process.env.ADMIN_EMAILS || '';
  return emails.split(',').map(e => e.trim()).filter(Boolean);
};

// 管理员密码哈希（从环境变量读取）
const getAdminPasswordHash = () => {
  return process.env.ADMIN_PASSWORD_HASH || '';
};

/**
 * 管理员登录
 * @param {Object} request - 请求对象
 * @returns {Promise<Object>} 响应对象
 */
const login = async (request) => {
  const { email, password } = request.body || {};

  // 参数验证
  if (!email || !password) {
    throw createError(400, '邮箱和密码不能为空', 'VALIDATION_ERROR');
  }

  // 邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createError(400, '邮箱格式不正确', 'VALIDATION_ERROR');
  }

  // 检查邮箱是否在白名单中
  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(email)) {
    throw createError(403, '该邮箱无管理员权限', 'FORBIDDEN');
  }

  // 验证密码
  const passwordHash = getAdminPasswordHash();
  if (!passwordHash) {
    throw createError(500, '管理员密码未配置', 'CONFIG_ERROR');
  }

  const isPasswordValid = await bcrypt.compare(password, passwordHash);
  if (!isPasswordValid) {
    throw createError(401, '邮箱或密码错误', 'INVALID_CREDENTIALS');
  }

  // 生成 Token
  const token = generateToken({ email, role: 'admin' });

  return success({
    token,
    admin: {
      email,
      name: '管理员',
    },
  });
};

/**
 * 管理员登出
 * @param {Object} request - 请求对象
 * @returns {Promise<Object>} 响应对象
 */
const logout = async (request) => {
  // 客户端清除 Token 即可，服务端无需处理
  return success({ message: '登出成功' });
};

/**
 * 获取当前管理员信息
 * @param {Object} request - 请求对象
 * @returns {Promise<Object>} 响应对象
 */
const getCurrentAdmin = async (request) => {
  const token = extractTokenFromRequest(request);

  if (!token) {
    throw createError(401, '未提供认证令牌', 'UNAUTHORIZED');
  }

  try {
    const decoded = verifyToken(token);
    return success({
      admin: {
        email: decoded.email,
        role: decoded.role,
      },
    });
  } catch (error) {
    if (error.code === 'TOKEN_EXPIRED') {
      throw createError(401, '令牌已过期', 'TOKEN_EXPIRED');
    }
    throw createError(401, '令牌无效', 'TOKEN_INVALID');
  }
};

module.exports = {
  login,
  logout,
  getCurrentAdmin,
};
