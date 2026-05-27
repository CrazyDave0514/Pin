export interface AliyunPinApiConfig {
  baseUrl?: string
  apiKey?: string
  fallbackToLocal?: boolean
  timeoutMs?: number
}

// 默认 API Gateway 地址（根据 codex 文档配置）
const DEFAULT_API_GATEWAY = 'https://ee8a7564e6124d75a7e558be596a6e09-cn-hangzhou.alicloudapi.com/pin'

const DEFAULT_CONFIG: Required<Pick<AliyunPinApiConfig, 'fallbackToLocal' | 'timeoutMs' | 'baseUrl'>> = {
  fallbackToLocal: true,
  timeoutMs: 10000,
  baseUrl: DEFAULT_API_GATEWAY,
}

let currentConfig: AliyunPinApiConfig = {
  ...DEFAULT_CONFIG,
}

export const getAliyunPinApiConfig = (): AliyunPinApiConfig => ({
  ...DEFAULT_CONFIG,
  ...currentConfig,
})

export const setAliyunPinApiConfig = (config: Partial<AliyunPinApiConfig>) => {
  currentConfig = {
    ...currentConfig,
    ...config,
  }
}

/**
 * 重置为默认配置
 */
export const resetAliyunConfig = () => {
  currentConfig = { ...DEFAULT_CONFIG }
}
