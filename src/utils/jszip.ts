// #ifdef H5
import './vendor-jszip.min.js'

declare global {
  interface Window {
    JSZip?: any
  }
}
// #endif

export const getJsZip = () => {
  // #ifdef H5
  return window.JSZip
  // #endif

  // #ifndef H5
  return null
  // #endif
}
