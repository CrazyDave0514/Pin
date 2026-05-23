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

<style lang="scss">
/* ==================== Pin 全局设计系统 ==================== */

/* CSS 自定义属性 - 设计 Token */
page {
  /* 品牌色 */
  --color-primary: #F5A623;
  --color-primary-dark: #E09400;
  --color-primary-light: #FFF4E0;

  /* 功能色 */
  --color-success: #52C41A;
  --color-warning: #FAAD14;
  --color-error: #FF4D4F;
  --color-info: #1890FF;

  /* 文字色 */
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #666666;
  --color-text-tertiary: #999999;
  --color-text-disabled: #CCCCCC;
  --color-text-inverse: #FFFFFF;

  /* 背景色 */
  --color-bg-page: #F5F5F5;
  --color-bg-panel: #FFFFFF;
  --color-bg-elevated: #FFFFFF;
  --color-bg-hover: #F8F8F8;
  --color-bg-active: #F0F0F0;
  --color-bg-mask: rgba(0, 0, 0, 0.5);

  /* 边框色 */
  --color-border: #E8E8E8;
  --color-border-light: #F0F0F0;
  --color-divider: #EEEEEE;

  /* 字体 */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-size-h1: 24px;
  --font-size-h2: 20px;
  --font-size-h3: 17px;
  --font-size-body1: 15px;
  --font-size-body2: 14px;
  --font-size-caption: 13px;
  --font-size-small: 11px;

  /* 间距 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 24px;
  --space-3xl: 32px;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.12);
  --shadow-xl: 0 8px 24px rgba(0, 0, 0, 0.16);

  /* 动效 */
  --duration-fast: 200ms;
  --duration-normal: 300ms;
  --easing-default: ease;
  --easing-out: ease-out;

  /* 页面基础样式 */
  font-family: var(--font-family);
  font-size: var(--font-size-body2);
  color: var(--color-text-primary);
  background-color: var(--color-bg-page);
  line-height: 1.5;
}

/* ==================== 基础重置 ==================== */
html {
  font-size: 16px;
}

* {
  box-sizing: border-box;
}

image {
  max-width: 100%;
  display: block;
}

/* ==================== H5 平台适配 ==================== */
/* #ifdef H5 */
body {
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

page {
  max-width: 100vw;
  overflow-x: hidden;
}

/* TabBar 适配 */
.uni-tabbar {
  max-width: 100vw !important;
  border-top: 1px solid var(--color-border-light) !important;
}

.uni-tabbar__label {
  font-size: 10px !important;
}

/* 导航栏适配 */
.uni-page-head {
  background-color: var(--color-bg-panel) !important;
}

.uni-page-head__title {
  font-size: 17px !important;
  font-weight: 600 !important;
  color: var(--color-text-primary) !important;
}

.uni-page-head-btn {
  color: var(--color-text-primary) !important;
}

/* ==================== PC 端深色主题适配 ==================== */
@media (min-width: 768px) and (prefers-color-scheme: dark) {
  page {
    /* 文字色 - 深色主题 */
    --color-text-primary: #E8E8E8;
    --color-text-secondary: #A0A0A0;
    --color-text-tertiary: #707070;
    --color-text-disabled: #555555;
    --color-text-inverse: #1A1A1A;

    /* 背景色 - 深色主题 */
    --color-bg-page: #0D0D0D;
    --color-bg-panel: #1A1A1A;
    --color-bg-elevated: #242424;
    --color-bg-hover: #2A2A2A;
    --color-bg-active: #333333;
    --color-bg-mask: rgba(0, 0, 0, 0.7);

    /* 边框色 - 深色主题 */
    --color-border: #333333;
    --color-border-light: #2A2A2A;
    --color-divider: #333333;

    /* 阴影 - 深色主题 */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.5);
    --shadow-xl: 0 8px 24px rgba(0, 0, 0, 0.6);
  }

  /* 导航栏深色适配 */
  .uni-page-head {
    background-color: #1A1A1A !important;
    border-bottom: 1px solid #333333 !important;
  }

  .uni-page-head__title {
    color: #E8E8E8 !important;
  }

  .uni-page-head-btn {
    color: #E8E8E8 !important;
  }

  /* TabBar 深色适配 */
  .uni-tabbar {
    background-color: #1A1A1A !important;
    border-top: 1px solid #333333 !important;
  }

  .uni-tabbar__label {
    color: #707070 !important;
  }

  .uni-tabbar__item--active .uni-tabbar__label {
    color: #F5A623 !important;
  }
}
/* #endif */

/* ==================== 安全区域 ==================== */
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-area-top {
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}

/* ==================== 通用工具类 ==================== */

/* 文字颜色 */
.text-primary { color: var(--color-text-primary); }
.text-secondary { color: var(--color-text-secondary); }
.text-tertiary { color: var(--color-text-tertiary); }
.text-disabled { color: var(--color-text-disabled); }
.text-inverse { color: var(--color-text-inverse); }
.text-brand { color: var(--color-primary); }
.text-success { color: var(--color-success); }
.text-warning { color: var(--color-warning); }
.text-error { color: var(--color-error); }

/* 文字大小 */
.text-h1 { font-size: var(--font-size-h1); font-weight: 700; line-height: 1.3; }
.text-h2 { font-size: var(--font-size-h2); font-weight: 600; line-height: 1.4; }
.text-h3 { font-size: var(--font-size-h3); font-weight: 600; line-height: 1.4; }
.text-body1 { font-size: var(--font-size-body1); font-weight: 400; line-height: 1.5; }
.text-body2 { font-size: var(--font-size-body2); font-weight: 400; line-height: 1.5; }
.text-caption { font-size: var(--font-size-caption); font-weight: 400; line-height: 1.4; }
.text-small { font-size: var(--font-size-small); font-weight: 400; line-height: 1.3; }

/* 背景色 */
.bg-page { background-color: var(--color-bg-page); }
.bg-panel { background-color: var(--color-bg-panel); }
.bg-brand { background-color: var(--color-primary); }
.bg-brand-light { background-color: var(--color-primary-light); }

/* Flex 布局 */
.flex { display: flex; }
.flex-col { display: flex; flex-direction: column; }
.flex-row { display: flex; flex-direction: row; }
.flex-center { display: flex; align-items: center; justify-content: center; }
.flex-between { display: flex; align-items: center; justify-content: space-between; }
.flex-start { display: flex; align-items: center; justify-content: flex-start; }
.flex-end { display: flex; align-items: center; justify-content: flex-end; }
.flex-wrap { display: flex; flex-wrap: wrap; }
.flex-1 { flex: 1; }
.flex-shrink-0 { flex-shrink: 0; }

/* 间距 */
.gap-xs { gap: var(--space-xs); }
.gap-sm { gap: var(--space-sm); }
.gap-md { gap: var(--space-md); }
.gap-lg { gap: var(--space-lg); }

/* 文字截断 */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 多行截断 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* 安全点击区域 */
.touchable {
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 分割线 */
.divider {
  height: 1px;
  background-color: var(--color-divider);
  width: 100%;
}

/* 卡片基础样式 */
.card {
  background-color: var(--color-bg-panel);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}
</style>
