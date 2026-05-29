/**
 * @fileoverview 格式化工具函数
 * @description 日期、数字等格式化函数
 */

/**
 * 格式化日期时间
 * @param timestamp - 时间戳（毫秒）
 * @returns 格式化后的字符串
 */
export const formatDateTime = (timestamp: number): string => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 格式化日期
 * @param timestamp - 时间戳（毫秒）
 * @returns 格式化后的字符串
 */
export const formatDate = (timestamp: number): string => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * 格式化数字（添加千分位）
 * @param num - 数字
 * @returns 格式化后的字符串
 */
export const formatNumber = (num: number): string => {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString('zh-CN')
}

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @returns 格式化后的字符串
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
