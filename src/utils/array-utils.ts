/** 安全转换 value 为数组，非数组返回空数组 */
export const safeArray = <T>(value: unknown): T[] => Array.isArray(value) ? (value as T[]) : []
