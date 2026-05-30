/**
 * @fileoverview 响应工具函数
 * @description 封装统一的响应格式和错误处理
 */

'use strict';

/**
 * 构建响应对象
 * @param {number} statusCode - HTTP 状态码
 * @param {Object} body - 响应体
 * @returns {Object} 响应对象
 */
const buildResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
  },
  isBase64Encoded: false,
  body: JSON.stringify(body),
});

/**
 * 成功响应
 * @param {*} data - 响应数据
 * @returns {Object} 响应对象
 */
const success = (data) => buildResponse(200, {
  success: true,
  data,
});

/**
 * 失败响应
 * @param {number} statusCode - HTTP 状态码
 * @param {string} message - 错误信息
 * @param {string} [code] - 错误代码
 * @returns {Object} 响应对象
 */
const fail = (statusCode, message, code) => buildResponse(statusCode, {
  success: false,
  message,
  code: code || 'ERROR',
});

/**
 * 创建标准化错误
 * @param {number} statusCode - HTTP 状态码
 * @param {string} message - 错误信息
 * @param {string} [code] - 错误代码
 * @returns {Error} 错误对象
 */
const createError = (statusCode, message, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code || 'ERROR';
  return error;
};

module.exports = {
  buildResponse,
  success,
  fail,
  createError,
};
