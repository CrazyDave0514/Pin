// #ifdef H5
import jszipScriptUrl from './vendor-jszip.min.js?url'

declare global {
  interface Window {
    JSZip?: any
  }
}

let jszipLoader: Promise<any> | null = null
// #endif

export const getJsZip = async () => {
  // #ifdef H5
  if (window.JSZip) return window.JSZip

  if (!jszipLoader) {
    jszipLoader = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[data-jszip-loader="true"]`) as HTMLScriptElement | null
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.JSZip || null), { once: true })
        existingScript.addEventListener('error', () => reject(new Error('ZIP 库加载失败')), { once: true })
        return
      }

      const script = document.createElement('script')
      script.src = jszipScriptUrl
      script.async = true
      script.dataset.jszipLoader = 'true'
      script.onload = () => resolve(window.JSZip || null)
      script.onerror = () => reject(new Error('ZIP 库加载失败'))
      document.head.appendChild(script)
    })
  }

  return jszipLoader
  // #endif

  // #ifndef H5
  return null
  // #endif
}
