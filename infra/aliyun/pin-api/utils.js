'use strict'

/**
 * 安全 JSON 解析，失败返回 fallback
 */
const safeJsonParse = (value, fallback) => {
  if (typeof value !== 'string' || !value) return fallback
  try {
    return JSON.parse(value)
  } catch (error) {
    return fallback
  }
}

/**
 * 安全数组包装
 */
const safeArray = (value) => {
  return Array.isArray(value) ? value : []
}

module.exports = { safeJsonParse, safeArray }
