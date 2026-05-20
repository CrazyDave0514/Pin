const fs = require('fs');
const path = require('path');

// 生成简单的24x24 PNG图标
// PNG文件头 + IHDR + IDAT + IEND

function createSimplePNG(color) {
  // 简化的PNG生成 - 创建一个24x24的纯色方块
  const width = 24;
  const height = 24;
  
  // PNG签名
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdr = createChunk('IHDR', ihdrData);
  
  // IDAT chunk - 压缩的图像数据
  // 创建一个简单的RGB图像数据
  const pixelData = Buffer.alloc(width * height * 3 + height);
  for (let y = 0; y < height; y++) {
    pixelData[y * (width * 3 + 1)] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const offset = y * (width * 3 + 1) + 1 + x * 3;
      pixelData[offset] = color.r;
      pixelData[offset + 1] = color.g;
      pixelData[offset + 2] = color.b;
    }
  }
  
  const compressed = require('zlib').deflateSync(pixelData);
  const idat = createChunk('IDAT', compressed);
  
  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type);
  
  const crc = require('zlib').crc32Sync(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// 生成图标
const icons = [
  { name: 'home.png', color: { r: 153, g: 153, b: 153 } },
  { name: 'home-active.png', color: { r: 0, g: 122, b: 255 } },
  { name: 'project.png', color: { r: 153, g: 153, b: 153 } },
  { name: 'project-active.png', color: { r: 0, g: 122, b: 255 } },
  { name: 'mine.png', color: { r: 153, g: 153, b: 153 } },
  { name: 'mine-active.png', color: { r: 0, g: 122, b: 255 } },
];

const tabbarDir = path.join(__dirname, 'src/static/tabbar');

icons.forEach(icon => {
  const png = createSimplePNG(icon.color);
  fs.writeFileSync(path.join(tabbarDir, icon.name), png);
  console.log(`Generated ${icon.name}`);
});

console.log('All icons generated!');
