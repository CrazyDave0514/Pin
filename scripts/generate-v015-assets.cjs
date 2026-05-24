const fs = require('fs')
const path = require('path')
const { PNG } = require('pngjs')

const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'src/static/assets/v015')
const iconDir = path.join(outDir, 'icons')
const bgDir = path.join(outDir, 'backgrounds')
const tabbarDir = path.join(root, 'src/static/tabbar')

const colors = {
  ink: '#231f1a',
  muted: '#8e8377',
  brand: '#f7b733',
  brandDeep: '#ce7b1d',
  bg: '#f7f3ec',
  surface: '#fffdfa',
  line: '#e7ddd0',
  green: '#5f9b73',
  blue: '#4c7f9f',
  red: '#cf5c4d',
  violet: '#8b6fad'
}

const iconSize = 64
const scale = 4

function hexToRgba(hex, alpha = 1) {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return [r, g, b, Math.round(alpha * 255)]
}

function createCanvas(w, h, fill) {
  const png = new PNG({ width: w, height: h })
  if (fill) {
    const [r, g, b, a] = hexToRgba(fill)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        png.data[i] = r
        png.data[i + 1] = g
        png.data[i + 2] = b
        png.data[i + 3] = a
      }
    }
  }
  return png
}

function setPixel(png, x, y, rgba) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return
  const i = (Math.floor(y) * png.width + Math.floor(x)) * 4
  const sa = rgba[3] / 255
  const da = png.data[i + 3] / 255
  const oa = sa + da * (1 - sa)
  if (oa <= 0) return
  png.data[i] = Math.round((rgba[0] * sa + png.data[i] * da * (1 - sa)) / oa)
  png.data[i + 1] = Math.round((rgba[1] * sa + png.data[i + 1] * da * (1 - sa)) / oa)
  png.data[i + 2] = Math.round((rgba[2] * sa + png.data[i + 2] * da * (1 - sa)) / oa)
  png.data[i + 3] = Math.round(oa * 255)
}

function circle(png, cx, cy, r, color, alpha = 1) {
  const rgba = hexToRgba(color, alpha)
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= r * r) setPixel(png, x, y, rgba)
    }
  }
}

function rect(png, x, y, w, h, color, alpha = 1) {
  const rgba = hexToRgba(color, alpha)
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(png, xx, yy, rgba)
  }
}

function roundedRect(png, x, y, w, h, r, color, alpha = 1) {
  const rgba = hexToRgba(color, alpha)
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const cx = xx < x + r ? x + r : xx > x + w - r ? x + w - r : xx
      const cy = yy < y + r ? y + r : yy > y + h - r ? y + h - r : yy
      const dx = xx - cx
      const dy = yy - cy
      if (dx * dx + dy * dy <= r * r) setPixel(png, xx, yy, rgba)
    }
  }
}

function line(png, x1, y1, x2, y2, width, color, alpha = 1) {
  const rgba = hexToRgba(color, alpha)
  const dx = x2 - x1
  const dy = y2 - y1
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps
    circle(png, x1 + dx * t, y1 + dy * t, width / 2, color, alpha)
  }
}

function strokeRect(png, x, y, w, h, r, width, color, alpha = 1) {
  for (let i = 0; i < width; i++) {
    roundedRect(png, x + i, y + i, w - i * 2, h - i * 2, Math.max(0, r - i), color, alpha)
  }
  roundedRect(png, x + width, y + width, w - width * 2, h - width * 2, Math.max(0, r - width), '#000000', 0)
  clearRounded(png, x + width, y + width, w - width * 2, h - width * 2, Math.max(0, r - width))
}

function clearRounded(png, x, y, w, h, r) {
  const clear = [0, 0, 0, 0]
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const cx = xx < x + r ? x + r : xx > x + w - r ? x + w - r : xx
      const cy = yy < y + r ? y + r : yy > y + h - r ? y + h - r : yy
      const dx = xx - cx
      const dy = yy - cy
      if (dx * dx + dy * dy <= r * r) {
        const i = (yy * png.width + xx) * 4
        png.data[i] = clear[0]
        png.data[i + 1] = clear[1]
        png.data[i + 2] = clear[2]
        png.data[i + 3] = clear[3]
      }
    }
  }
}

function downsample(hi, factor) {
  const lo = new PNG({ width: hi.width / factor, height: hi.height / factor })
  for (let y = 0; y < lo.height; y++) {
    for (let x = 0; x < lo.width; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let yy = 0; yy < factor; yy++) {
        for (let xx = 0; xx < factor; xx++) {
          const i = ((y * factor + yy) * hi.width + (x * factor + xx)) * 4
          r += hi.data[i]
          g += hi.data[i + 1]
          b += hi.data[i + 2]
          a += hi.data[i + 3]
        }
      }
      const n = factor * factor
      const o = (y * lo.width + x) * 4
      lo.data[o] = Math.round(r / n)
      lo.data[o + 1] = Math.round(g / n)
      lo.data[o + 2] = Math.round(b / n)
      lo.data[o + 3] = Math.round(a / n)
    }
  }
  return lo
}

function savePng(file, png) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, PNG.sync.write(png))
}

function icon(name, draw, color = colors.ink, targetDirs = [iconDir]) {
  const hi = createCanvas(iconSize * scale, iconSize * scale)
  const g = {
    c: color,
    s: scale,
    line: (...args) => line(hi, ...args.map((v, i) => i < 5 ? v * scale : v)),
    circle: (cx, cy, r, c = color, a = 1) => circle(hi, cx * scale, cy * scale, r * scale, c, a),
    rect: (x, y, w, h, c = color, a = 1) => rect(hi, x * scale, y * scale, w * scale, h * scale, c, a),
    roundedRect: (x, y, w, h, r, c = color, a = 1) => roundedRect(hi, x * scale, y * scale, w * scale, h * scale, r * scale, c, a),
    strokeRect: (x, y, w, h, r, width, c = color, a = 1) => strokeRect(hi, x * scale, y * scale, w * scale, h * scale, r * scale, width * scale, c, a)
  }
  draw(g)
  const png = downsample(hi, scale)
  for (const dir of targetDirs) savePng(path.join(dir, `${name}.png`), png)
}

function drawHome(g) {
  g.line(14, 31, 32, 16, 5, g.c)
  g.line(50, 31, 32, 16, 5, g.c)
  g.strokeRect(20, 29, 24, 22, 6, 4, g.c)
  g.rect(29, 41, 6, 10, g.c)
}

function drawProject(g) {
  g.strokeRect(13, 16, 38, 34, 8, 4, g.c)
  g.line(22, 25, 42, 25, 4, g.c)
  g.line(22, 33, 38, 33, 4, g.c)
  g.line(22, 41, 34, 41, 4, g.c)
}

function drawMine(g) {
  g.circle(32, 23, 9, g.c)
  g.strokeRect(18, 36, 28, 15, 8, 4, g.c)
}

function drawPlus(g) {
  g.line(32, 16, 32, 48, 5, g.c)
  g.line(16, 32, 48, 32, 5, g.c)
}

function drawSearch(g) {
  g.strokeRect(15, 15, 25, 25, 13, 4, g.c)
  g.line(38, 38, 50, 50, 5, g.c)
}

function drawSettings(g) {
  g.circle(32, 32, 6, g.c)
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * 2 * i / 8
    const x1 = 32 + Math.cos(a) * 15
    const y1 = 32 + Math.sin(a) * 15
    const x2 = 32 + Math.cos(a) * 22
    const y2 = 32 + Math.sin(a) * 22
    g.line(x1, y1, x2, y2, 5, g.c)
  }
}

function drawBack(g) {
  g.line(38, 18, 24, 32, 5, g.c)
  g.line(24, 32, 38, 46, 5, g.c)
}

function drawGrid(g) {
  g.strokeRect(15, 15, 34, 34, 5, 4, g.c)
  g.line(26, 16, 26, 48, 3, g.c)
  g.line(38, 16, 38, 48, 3, g.c)
  g.line(16, 26, 48, 26, 3, g.c)
  g.line(16, 38, 48, 38, 3, g.c)
}

function drawImage(g) {
  g.strokeRect(13, 17, 38, 30, 7, 4, g.c)
  g.circle(24, 27, 4, g.c)
  g.line(18, 43, 29, 33, 4, g.c)
  g.line(29, 33, 38, 42, 4, g.c)
  g.line(36, 38, 45, 31, 4, g.c)
}

function drawBlueprint(g) {
  drawGrid(g)
  g.circle(22, 22, 3, colors.brand)
  g.circle(32, 32, 3, colors.brand)
  g.circle(42, 42, 3, colors.brand)
}

function drawBeads(g) {
  for (const [x, y, c] of [[22, 22, colors.brand], [34, 22, colors.red], [22, 34, colors.green], [34, 34, colors.blue], [46, 34, colors.violet]]) {
    g.circle(x, y, 5, c)
  }
}

function drawPoints(g) {
  g.circle(32, 32, 20, colors.brand)
  g.circle(32, 32, 11, '#fff4d5')
  g.line(32, 20, 32, 44, 4, colors.brandDeep)
  g.line(22, 32, 42, 32, 4, colors.brandDeep)
}

function drawFavorite(g) {
  g.line(32, 49, 17, 31, 5, g.c)
  g.line(32, 49, 47, 31, 5, g.c)
  g.circle(24, 25, 10, g.c)
  g.circle(40, 25, 10, g.c)
}

function drawBrush(g) {
  g.line(21, 43, 43, 21, 6, g.c)
  g.circle(19, 45, 6, g.c)
  g.line(40, 18, 48, 10, 5, colors.brand)
}

function drawEraser(g) {
  g.line(20, 43, 43, 20, 12, g.c)
  g.line(35, 50, 51, 50, 4, g.c)
}

function drawEyedropper(g) {
  g.line(20, 44, 44, 20, 5, g.c)
  g.strokeRect(37, 13, 13, 13, 5, 4, g.c)
  g.circle(18, 46, 4, colors.brand)
}

function drawUndo(g) {
  g.line(24, 23, 14, 32, 5, g.c)
  g.line(14, 32, 24, 41, 5, g.c)
  g.line(17, 32, 42, 32, 5, g.c)
  g.line(42, 32, 49, 40, 5, g.c)
}

function drawRedo(g) {
  g.line(40, 23, 50, 32, 5, g.c)
  g.line(50, 32, 40, 41, 5, g.c)
  g.line(47, 32, 22, 32, 5, g.c)
  g.line(22, 32, 15, 40, 5, g.c)
}

function drawExport(g) {
  g.strokeRect(15, 25, 34, 25, 6, 4, g.c)
  g.line(32, 14, 32, 37, 5, g.c)
  g.line(23, 23, 32, 14, 5, g.c)
  g.line(41, 23, 32, 14, 5, g.c)
}

function drawSave(g) {
  g.strokeRect(14, 14, 36, 36, 7, 4, g.c)
  g.rect(22, 15, 20, 10, g.c)
  g.strokeRect(22, 34, 20, 15, 5, 4, g.c)
}

function drawMore(g) {
  g.circle(20, 32, 4, g.c)
  g.circle(32, 32, 4, g.c)
  g.circle(44, 32, 4, g.c)
}

function drawWarning(g) {
  g.line(32, 14, 51, 48, 5, colors.red)
  g.line(51, 48, 13, 48, 5, colors.red)
  g.line(13, 48, 32, 14, 5, colors.red)
  g.line(32, 26, 32, 37, 4, colors.red)
  g.circle(32, 43, 2.5, colors.red)
}

function drawMove(g) {
  g.line(32, 14, 32, 50, 4, g.c)
  g.line(14, 32, 50, 32, 4, g.c)
  g.line(32, 14, 25, 21, 4, g.c)
  g.line(32, 14, 39, 21, 4, g.c)
  g.line(32, 50, 25, 43, 4, g.c)
  g.line(32, 50, 39, 43, 4, g.c)
  g.line(14, 32, 21, 25, 4, g.c)
  g.line(14, 32, 21, 39, 4, g.c)
  g.line(50, 32, 43, 25, 4, g.c)
  g.line(50, 32, 43, 39, 4, g.c)
}

function drawFill(g) {
  g.line(22, 19, 42, 39, 5, g.c)
  g.line(27, 14, 47, 34, 5, g.c)
  g.strokeRect(16, 22, 28, 22, 6, 4, g.c)
  g.circle(48, 48, 5, colors.brandDeep)
}

function drawPalette(g) {
  g.circle(32, 32, 22, g.c)
  g.circle(42, 43, 9, '#000000', 0)
  g.circle(24, 24, 3.5, colors.brand)
  g.circle(35, 22, 3.5, colors.red)
  g.circle(22, 35, 3.5, colors.green)
  g.circle(34, 36, 3.5, colors.blue)
}

function drawTrash(g) {
  g.line(20, 23, 44, 23, 4, g.c)
  g.line(26, 17, 38, 17, 4, g.c)
  g.strokeRect(22, 25, 20, 25, 5, 4, g.c)
  g.line(28, 31, 28, 44, 3, g.c)
  g.line(36, 31, 36, 44, 3, g.c)
}

function drawTag(g) {
  g.strokeRect(17, 18, 28, 22, 6, 4, g.c)
  g.line(45, 29, 33, 49, 4, g.c)
  g.line(17, 29, 33, 49, 4, g.c)
  g.circle(25, 27, 3, colors.brandDeep)
}

function drawRotate(g) {
  g.line(20, 25, 28, 17, 4, g.c)
  g.line(28, 17, 36, 25, 4, g.c)
  g.line(28, 18, 28, 48, 4, g.c)
  g.line(44, 39, 36, 47, 4, g.c)
  g.line(36, 47, 28, 39, 4, g.c)
}

function drawFlipHorizontal(g) {
  g.line(32, 15, 32, 49, 3, colors.brandDeep)
  g.line(13, 32, 27, 21, 4, g.c)
  g.line(13, 32, 27, 43, 4, g.c)
  g.line(51, 32, 37, 21, 4, g.c)
  g.line(51, 32, 37, 43, 4, g.c)
}

function drawFlipVertical(g) {
  g.line(15, 32, 49, 32, 3, colors.brandDeep)
  g.line(32, 13, 21, 27, 4, g.c)
  g.line(32, 13, 43, 27, 4, g.c)
  g.line(32, 51, 21, 37, 4, g.c)
  g.line(32, 51, 43, 37, 4, g.c)
}

const iconSpecs = [
  ['home', drawHome],
  ['project', drawProject],
  ['mine', drawMine],
  ['create', drawPlus],
  ['search', drawSearch],
  ['settings', drawSettings],
  ['back', drawBack],
  ['blank-canvas', drawGrid],
  ['image-import', drawImage],
  ['blueprint-import', drawBlueprint],
  ['bead-inventory', drawBeads],
  ['points', drawPoints],
  ['favorite', drawFavorite],
  ['brush', drawBrush],
  ['eraser', drawEraser],
  ['eyedropper', drawEyedropper],
  ['grid', drawGrid],
  ['undo', drawUndo],
  ['redo', drawRedo],
  ['export', drawExport],
  ['save', drawSave],
  ['more', drawMore],
  ['warning', drawWarning],
  ['move', drawMove],
  ['fill', drawFill],
  ['palette', drawPalette],
  ['trash', drawTrash],
  ['tag', drawTag],
  ['rotate', drawRotate],
  ['flip-horizontal', drawFlipHorizontal],
  ['flip-vertical', drawFlipVertical]
]

for (const [name, draw] of iconSpecs) {
  icon(name, draw, colors.ink)
  icon(`${name}-muted`, draw, colors.muted)
  icon(`${name}-active`, draw, colors.brandDeep)
}

icon('home', drawHome, colors.muted, [tabbarDir])
icon('home-active', drawHome, colors.brandDeep, [tabbarDir])
icon('project', drawProject, colors.muted, [tabbarDir])
icon('project-active', drawProject, colors.brandDeep, [tabbarDir])
icon('mine', drawMine, colors.muted, [tabbarDir])
icon('mine-active', drawMine, colors.brandDeep, [tabbarDir])

function background(name, w, h, paint) {
  const png = createCanvas(w, h, colors.bg)
  paint(png)
  savePng(path.join(bgDir, `${name}.png`), png)
}

background('workspace-grid', 960, 540, png => {
  for (let x = 0; x < png.width; x += 32) rect(png, x, 0, 1, png.height, colors.ink, 0.05)
  for (let y = 0; y < png.height; y += 32) rect(png, 0, y, png.width, 1, colors.ink, 0.05)
  roundedRect(png, 88, 72, 300, 300, 28, colors.surface, 0.72)
  roundedRect(png, 520, 88, 280, 210, 24, '#efe4d7', 0.82)
  for (let i = 0; i < 60; i++) {
    const x = 140 + (i % 12) * 18
    const y = 130 + Math.floor(i / 12) * 18
    const palette = [colors.brand, colors.red, colors.green, colors.blue, colors.surface, colors.ink]
    circle(png, x, y, 5, palette[i % palette.length], 0.94)
  }
})

background('empty-project', 640, 420, png => {
  roundedRect(png, 110, 70, 420, 280, 28, colors.surface, 1)
  for (let y = 132; y < 278; y += 24) {
    for (let x = 205; x < 436; x += 24) circle(png, x, y, 7, colors.line, 0.92)
  }
  for (const [x, y, c] of [[253, 180, colors.brand], [277, 180, colors.brand], [301, 180, colors.red], [325, 180, colors.red], [349, 204, colors.green], [373, 204, colors.blue]]) {
    circle(png, x, y, 8, c, 1)
  }
})

background('login-hero-beads', 720, 720, png => {
  for (let x = 0; x < png.width; x += 36) rect(png, x, 0, 1, png.height, colors.ink, 0.035)
  for (let y = 0; y < png.height; y += 36) rect(png, 0, y, png.width, 1, colors.ink, 0.035)
  const palette = [colors.brand, colors.red, colors.green, colors.blue, colors.violet, colors.surface]
  for (let y = 190; y <= 500; y += 34) {
    for (let x = 190; x <= 500; x += 34) {
      const dx = x - 360
      const dy = y - 360
      if (dx * dx + dy * dy < 23000) circle(png, x, y, 11, palette[(x + y) % palette.length], 0.98)
    }
  }
})

background('editor-dark-grid', 960, 540, png => {
  rect(png, 0, 0, png.width, png.height, '#211e1a', 1)
  for (let x = 0; x < png.width; x += 24) rect(png, x, 0, 1, png.height, colors.surface, 0.045)
  for (let y = 0; y < png.height; y += 24) rect(png, 0, y, png.width, 1, colors.surface, 0.045)
  roundedRect(png, 250, 80, 460, 360, 24, '#14120f', 1)
  for (let y = 170; y <= 340; y += 24) {
    for (let x = 340; x <= 620; x += 24) circle(png, x, y, 7, colors.surface, 0.85)
  }
})

const manifest = {
  version: 'v0.1.5',
  generatedAt: new Date().toISOString(),
  iconBase: '/static/assets/v015/icons/',
  backgroundBase: '/static/assets/v015/backgrounds/',
  icons: iconSpecs.flatMap(([name]) => [`${name}.png`, `${name}-muted.png`, `${name}-active.png`]),
  tabbar: ['home.png', 'home-active.png', 'project.png', 'project-active.png', 'mine.png', 'mine-active.png'],
  backgrounds: ['workspace-grid.png', 'empty-project.png', 'login-hero-beads.png', 'editor-dark-grid.png']
}

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`Generated ${manifest.icons.length} icons, ${manifest.tabbar.length} tabbar icons, ${manifest.backgrounds.length} backgrounds.`)
