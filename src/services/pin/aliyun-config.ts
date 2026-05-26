export interface AliyunPinApiConfig {
  baseUrl?: string
  apiKey?: string
  fallbackToLocal?: boolean
  timeoutMs?: number
}

const DEFAULT_CONFIG: Required<Pick<AliyunPinApiConfig, 'fallbackToLocal' | 'timeoutMs'>> = {
  fallbackToLocal: true,
  timeoutMs: 10000,
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
