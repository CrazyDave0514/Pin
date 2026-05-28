/**
 * 版本配置文件
 * 统一管理应用版本号
 */

/** 当前应用版本号 */
export const APP_VERSION = '0.2.1'

/** 版本名称 */
export const APP_VERSION_NAME = 'V0.2.1'

/** 构建时间戳 */
export const BUILD_TIMESTAMP = Date.now()

/** 版本信息对象 */
export const VERSION_INFO = {
  version: APP_VERSION,
  versionName: APP_VERSION_NAME,
  buildTime: BUILD_TIMESTAMP,
  environment: process.env.NODE_ENV || 'production',
} as const

/**
 * 获取版本信息字符串
 */
export const getVersionString = (): string => {
  return `${APP_VERSION_NAME} (${new Date(BUILD_TIMESTAMP).toLocaleDateString()})`
}

/**
 * 比较版本号
 * @param v1 版本号1
 * @param v2 版本号2
 * @returns 1: v1 > v2, -1: v1 < v2, 0: v1 === v2
 */
export const compareVersion = (v1: string, v2: string): number => {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)
  const maxLength = Math.max(parts1.length, parts2.length)

  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i] || 0
    const part2 = parts2[i] || 0
    if (part1 > part2) return 1
    if (part1 < part2) return -1
  }
  return 0
}

/**
 * 检查是否需要更新
 * @param currentVersion 当前版本
 * @param latestVersion 最新版本
 * @returns 是否需要更新
 */
export const shouldUpdate = (currentVersion: string, latestVersion: string): boolean => {
  return compareVersion(currentVersion, latestVersion) < 0
}
