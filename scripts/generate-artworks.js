/**
 * generate-artworks.js
 * 生成 300+ 条拼豆作品假数据
 * 输出：artworks.json（JSON 文件）和 artworks.js（ES Module 导出文件）
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// 配置常量
// ============================================================

/** 生成的作品总数 */
const TOTAL_COUNT = 300;

/** 热门作品数量（前 N 条点赞数偏高） */
const HOT_COUNT = 50;

/** 创作者名称库（30 个中文昵称循环使用） */
const CREATOR_NAMES = [
  '拼豆达人小王', '像素艺术家', '豆豆创作者', '彩虹拼豆', '创意工坊',
  '手作达人', '拼图小能手', '豆子画家', '像素小王子', '手工爱好者',
  '拼豆大师', '创意拼图', '彩虹手工', '豆豆工坊', '像素达人',
  '手作小屋', '拼豆新手', '创意画家', '豆子达人', '像素工坊',
  '拼图达人', '手工小达人', '豆豆艺术家', '拼豆爱好者', '像素创作者',
  '手作大师', '创意豆豆', '拼图小天才', '豆子工坊', '像素小天才',
];

/** 作品名称 - 前缀词 */
const PREFIX_WORDS = [
  '可爱的', '帅气的', '精致的', '梦幻的', '复古的',
  '萌萌的', '酷炫的', '简约的', '华丽的', '清新的',
];

/** 作品名称 - 主题词 */
const THEME_WORDS = [
  '小猫咪', '小狗狗', '小兔子', '樱花树', '向日葵',
  '彩虹', '星星', '爱心', '蝴蝶', '独角兽',
  '马里奥', '皮卡丘', '小熊', '小企鹅', '小恐龙',
  '小狐狸', '草莓蛋糕', '冰淇淋', '棒棒糖', '小房子',
  '小汽车', '小飞机', '机器人', '外星人', '小公主',
  '小王子', '小美人鱼', '小精灵', '小蘑菇', '小花朵',
];

/** 作品名称 - 后缀词 */
const SUFFIX_WORDS = [
  '拼豆图', '像素画', '拼豆作品', '像素作品', '拼豆图案',
];

/** 标签库 */
const TAG_LIBRARY = [
  '动物', '植物', '动漫', '食物', '风景',
  '人物', '交通工具', '花卉', '水果', '卡通',
  '可爱', '简约', '复古', '梦幻', '创意',
  '入门', '进阶', '节日', '情侣', '亲子',
];

/** 主题词与标签的映射关系（用于生成更合理的标签） */
const THEME_TAG_MAP = {
  '小猫咪': ['动物', '可爱'],
  '小狗狗': ['动物', '可爱'],
  '小兔子': ['动物', '可爱'],
  '樱花树': ['植物', '花卉', '风景'],
  '向日葵': ['植物', '花卉'],
  '彩虹': ['风景', '梦幻'],
  '星星': ['风景', '梦幻'],
  '爱心': ['情侣', '可爱'],
  '蝴蝶': ['动物', '花卉'],
  '独角兽': ['动物', '梦幻', '卡通'],
  '马里奥': ['动漫', '卡通', '进阶'],
  '皮卡丘': ['动漫', '卡通', '可爱'],
  '小熊': ['动物', '可爱'],
  '小企鹅': ['动物', '可爱'],
  '小恐龙': ['动物', '卡通'],
  '小狐狸': ['动物', '可爱'],
  '草莓蛋糕': ['食物', '可爱'],
  '冰淇淋': ['食物', '可爱'],
  '棒棒糖': ['食物', '可爱'],
  '小房子': ['风景', '简约'],
  '小汽车': ['交通工具', '卡通'],
  '小飞机': ['交通工具', '卡通'],
  '机器人': ['动漫', '卡通', '进阶'],
  '外星人': ['动漫', '卡通', '创意'],
  '小公主': ['人物', '可爱', '梦幻'],
  '小王子': ['人物', '卡通'],
  '小美人鱼': ['人物', '动漫', '梦幻'],
  '小精灵': ['人物', '梦幻', '卡通'],
  '小蘑菇': ['植物', '可爱'],
  '小花朵': ['植物', '花卉', '可爱'],
};

// ============================================================
// 工具函数
// ============================================================

/**
 * 生成指定范围内的随机整数 [min, max]
 * @param {number} min - 最小值（含）
 * @param {number} max - 最大值（含）
 * @returns {number} 随机整数
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 从数组中随机选取一个元素
 * @param {Array} arr - 源数组
 * @returns {*} 随机选中的元素
 */
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 从数组中随机选取 n 个不重复的元素
 * @param {Array} arr - 源数组
 * @param {number} n - 选取数量
 * @returns {Array} 选中的元素数组
 */
function randomPickMultiple(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

/**
 * 生成补零的序号字符串
 * @param {number} num - 序号
 * @param {number} digits - 总位数
 * @returns {string} 补零后的字符串
 */
function padNumber(num, digits) {
  return String(num).padStart(digits, '0');
}

/**
 * 生成作品名称
 * @returns {string} 组合后的作品名称
 */
function generateArtworkName() {
  const prefix = randomPick(PREFIX_WORDS);
  const theme = randomPick(THEME_WORDS);
  const suffix = randomPick(SUFFIX_WORDS);
  return `${prefix}${theme}${suffix}`;
}

/**
 * 根据主题词生成合理的标签（1~3 个）
 * @param {string} themeWord - 主题词
 * @returns {string[]} 标签数组
 */
function generateTags(themeWord) {
  // 优先使用主题词对应的标签
  const mappedTags = THEME_TAG_MAP[themeWord] || [];
  const tagCount = randomInt(1, 3);

  if (mappedTags.length >= tagCount) {
    // 映射标签足够，直接从中选取
    return randomPickMultiple(mappedTags, tagCount);
  }

  // 映射标签不足，从标签库补充
  const remaining = TAG_LIBRARY.filter(tag => !mappedTags.includes(tag));
  const extra = randomPickMultiple(remaining, tagCount - mappedTags.length);
  return [...mappedTags, ...extra];
}

/**
 * 生成近 30 天内的随机时间戳
 * @returns {number} 毫秒级时间戳
 */
function generateTimestamp() {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return now - Math.floor(Math.random() * thirtyDaysMs);
}

/**
 * 生成单条作品数据
 * @param {number} index - 作品序号（从 1 开始）
 * @param {boolean} isHot - 是否为热门作品
 * @returns {Object} 作品数据对象
 */
function generateArtwork(index, isHot) {
  const themeWord = randomPick(THEME_WORDS);
  const likes = isHot
    ? randomInt(1000, 5000)
    : randomInt(0, 5000);

  return {
    id: `artwork_${padNumber(index, 3)}`,
    name: generateArtworkName(),
    coverImage: `https://picsum.photos/seed/pin${index}/400/400`,
    creatorName: CREATOR_NAMES[(index - 1) % CREATOR_NAMES.length],
    creatorAvatar: '',
    likes,
    points: randomInt(1, 50),
    createdAt: generateTimestamp(),
    tags: generateTags(themeWord),
    viewCount: likes * 2 + randomInt(0, 500),
    useCount: Math.floor(likes * 0.1) + randomInt(0, 20),
    isPublic: true,
    description: '',
  };
}

// ============================================================
// 主流程
// ============================================================

/**
 * 主函数：生成所有假数据并写入文件
 */
function main() {
  console.log(`开始生成 ${TOTAL_COUNT} 条拼豆作品假数据...`);

  // 生成作品数据
  const artworks = [];
  for (let i = 1; i <= TOTAL_COUNT; i++) {
    const isHot = i <= HOT_COUNT;
    artworks.push(generateArtwork(i, isHot));
  }

  // 按 createdAt 倒序排列（最新的在前）
  artworks.sort((a, b) => b.createdAt - a.createdAt);

  // 确定输出路径
  const projectRoot = path.resolve(__dirname, '..');
  const outputDir = path.join(projectRoot, 'src', 'static', 'data');

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`创建输出目录: ${outputDir}`);
  }

  // 写入 JSON 文件
  const jsonPath = path.join(outputDir, 'artworks.json');
  const jsonContent = JSON.stringify(artworks, null, 2);
  fs.writeFileSync(jsonPath, jsonContent, 'utf-8');
  console.log(`JSON 文件已写入: ${jsonPath} (${(Buffer.byteLength(jsonContent) / 1024).toFixed(1)} KB)`);

  // 写入 JS 文件（ES Module 导出）
  const jsPath = path.join(outputDir, 'artworks.js');
  const jsContent = `export const defaultArtworks = ${jsonContent};\n`;
  fs.writeFileSync(jsPath, jsContent, 'utf-8');
  console.log(`JS 文件已写入: ${jsPath} (${(Buffer.byteLength(jsContent) / 1024).toFixed(1)} KB)`);

  // 输出统计信息
  const totalLikes = artworks.reduce((sum, a) => sum + a.likes, 0);
  const totalViews = artworks.reduce((sum, a) => sum + a.viewCount, 0);
  const avgLikes = Math.round(totalLikes / artworks.length);
  const avgViews = Math.round(totalViews / artworks.length);
  const newest = new Date(artworks[0].createdAt).toLocaleString('zh-CN');
  const oldest = new Date(artworks[artworks.length - 1].createdAt).toLocaleString('zh-CN');

  console.log('\n========== 数据统计 ==========');
  console.log(`作品总数: ${artworks.length}`);
  console.log(`热门作品: 前 ${HOT_COUNT} 条`);
  console.log(`总点赞数: ${totalLikes.toLocaleString()}`);
  console.log(`平均点赞数: ${avgLikes}`);
  console.log(`总浏览量: ${totalViews.toLocaleString()}`);
  console.log(`平均浏览量: ${avgViews}`);
  console.log(`最新作品时间: ${newest}`);
  console.log(`最早作品时间: ${oldest}`);
  console.log(`涉及创作者: ${new Set(artworks.map(a => a.creatorName)).size} 人`);
  console.log('==============================\n');
  console.log('生成完成!');
}

main();
