export interface AliyunPinApiConfig {
  baseUrl?: string
  apiKey?: string
  fallbackToLocal?: boolean
  timeoutMs?: number
}

// FC 公网访问地址（临时方案，域名备案完成后切换回 API Gateway）
const DEFAULT_API_GATEWAY = 'https://pin-app-http-pin-api-upqapogxgn.cn-hangzhou.fcapp.run'

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
