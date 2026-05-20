const fs = require('fs');
const path = require('path');

// 生成一个简单的测试图片（200x200 PNG）
function createTestPNG() {
  const width = 200;
  const height = 200;
  
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
  
  // 创建一个渐变色测试图片
  const pixelData = Buffer.alloc(width * height * 3 + height);
  for (let y = 0; y < height; y++) {
    pixelData[y * (width * 3 + 1)] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const offset = y * (width * 3 + 1) + 1 + x * 3;
      // 创建对角线渐变
      const ratio = (x + y) / (width + height);
      pixelData[offset] = Math.floor(255 * ratio);     // R
      pixelData[offset + 1] = Math.floor(255 * (1 - ratio)); // G
      pixelData[offset + 2] = 128; // B
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

// 生成测试图片
const testImage = createTestPNG();
const outputPath = path.join(__dirname, 'src/static/test-avatar.png');
fs.writeFileSync(outputPath, testImage);
console.log(`Test image generated: ${outputPath}`);
console.log(`File size: ${testImage.length} bytes`);
