<script>
export default {
  onLaunch: function () {
    console.log('App Launch')
  },
  onShow: function () {
    console.log('App Show')
  },
  onHide: function () {
    console.log('App Hide')
  },
}
</script>

<style>
/* 全局样式 - H5 移动端适配 */

/* 基础字体大小设置 */
html {
  font-size: 16px;
}

/* H5 平台适配 */
/* #ifdef H5 */
body {
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 防止横向滚动 */
page {
  max-width: 100vw;
  overflow-x: hidden;
}

/* TabBar 适配 */
.uni-tabbar {
  max-width: 100vw !important;
}

/* 字体大小适配 */
.uni-tabbar__label {
  font-size: 10px !important;
}

/* 导航栏字体 */
.uni-page-head__title {
  font-size: 17px !important;
}
/* #endif */

/* 通用样式 */
* {
  box-sizing: border-box;
}

/* 防止图片溢出 */
image {
  max-width: 100%;
}

/* 安全区域适配 */
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
