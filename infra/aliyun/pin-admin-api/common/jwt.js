/**
 * @fileoverview JWT 工具函数
 * @description 管理员认证使用的 JWT 实现（独立密钥）
 */

'use strict';

const crypto = require('crypto');

// 管理员 JWT 密钥（与用户端分开）
const JWT_SECRET = process.env.JWT_SECRET_ADMIN || 'pin-admin-default-secret-change-in-production';
const JWT_EXPIRES_IN_DAYS = 7;

/**
 * Base64 URL 编码
 * @param {string} str - 原始字符串
 * @returns {string} 编码后的字符串
 */
const base64UrlEncode = (str) => {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * Base64 URL 解码
 * @param {string} str - 编码后的字符串
 * @returns {string} 解码后的字符串
 */
const base64UrlDecode = (str) => {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString();
};

/**
 * HMAC SHA256 签名
 * @param {string} secret - 密钥
 * @param {string} message - 消息
 * @returns {string} 签名结果
 */
const hmacSha256 = (secret, message) => {
  return crypto.createHmac('sha256', secret).update(message).digest('base64');
};

/**
 * 生成 JWT Token
 * @param {Object} payload - Token 载荷
 * @returns {string} JWT Token
 */
const generateToken = (payload) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (JWT_EXPIRES_IN_DAYS * 24 * 60 * 60),
  }));
  const signature = base64UrlEncode(hmacSha256(JWT_SECRET, `${encodedHeader}.${encodedPayload}`));
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

/**
 * 验证 JWT Token
 * @param {string} token - JWT Token
 * @returns {Object} 解码后的载荷
 * @throws {Error} Token 无效或过期
 */
const verifyToken = (token) => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = base64UrlEncode(hmacSha256(JWT_SECRET, `${encodedHeader}.${encodedPayload}`));

  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));

  // 检查过期
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    const error = new Error('Token expired');
    error.code = 'TOKEN_EXPIRED';
    throw error;
  }

  return payload;
};

/**
 * 从请求中提取 Token
 * @param {Object} request - 请求对象
 * @returns {string|null} Token 或 null
 */
const extractTokenFromRequest = (request) => {
  const { token, raw } = request;
  
  if (token) return token;
  
  const headers = raw?.headers || {};
  const authHeader = headers.authorization || headers.Authorization || '';
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromRequest,
};
