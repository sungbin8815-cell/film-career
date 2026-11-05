// 도트 그래픽 엔진. 이미지 파일 없이 data/sprites.js의 설정으로 픽셀을 그립니다.
//   사람: 16×24 틀 + look(피부·머리·옷·모자·소품) + pose(idle walk1 walk2 punch kick guard hurt jump)
//   몬스터: 16×16 몸 모양(mask) + 색 + 표정 + 소품, 외곽선·명암 자동
//   아이콘·소품: 문자열 도트
// getSprite(key, pose) → canvas (캐시) / spriteImg(key, scale, opts) → <img>
import SP from '../data/sprites.js'

const OUT = '#1b1a26'
const cache = new Map()
const urlCache = new Map()

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)))
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

// 격자에 그리고 외곽선을 자동으로 두름
class Grid {
  constructor(w, h) { this.w = w; this.h = h; this.px = new Array(w * h).fill(null) }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x] : null }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c) }
  outline() {
    const add = []
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue
      if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) add.push([x, y])
    }
    for (const [x, y] of add) this.set(x, y, OUT)
    return this
  }
  toCanvas() {
    const c = canvas(this.w, this.h)
    const ctx = c.getContext('2d')
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const v = this.get(x, y)
      if (v && v !== 'clear') { ctx.fillStyle = v; ctx.fillRect(x, y, 1, 1) }
    }
    return c
  }
}

// ───── 사람 (16×24, 오른쪽을 봄) ─────
const POSE = {
  idle:  { arm: 'down', leg: 'stand', bob: 0 },
  walk1: { arm: 'swingA', leg: 'stepA', bob: 0 },
  walk2: { arm: 'swingB', leg: 'stepB', bob: 1 },
  punch: { arm: 'punch', leg: 'stance', bob: 0 },
  kick:  { arm: 'up', leg: 'kick', bob: 0 },
  guard: { arm: 'guard', leg: 'stance', bob: 1 },
  hurt:  { arm: 'hurt', leg: 'stand', bob: 0, face: 'hurt' },
  jump:  { arm: 'up', leg: 'tuck', bob: -1 },
  win:   { arm: 'cheer', leg: 'stand', bob: 0, face: 'happy' },
}

function human(L, poseName = 'idle') {
  const P = POSE[poseName] ?? POSE.idle
  const g = new Grid(18, 25)
  const ox = 1, oy = 1 + (P.bob > 0 ? 1 : 0) + (P.bob < 0 ? -1 : 0)
  const S = L.skin ?? '#f2c49b', H = L.hair ?? '#3a2a1e', T = L.top ?? '#3b5bdb', B = L.bottom ?? '#2b2b3a', F = L.shoes ?? '#1f1f28'
  const r = (x, y, w, h, c) => g.rect(ox + x, oy + y, w, h, c)
  // 다리
  const legs = {
    stand:  () => { r(5, 15, 2, 6, B); r(9, 15, 2, 6, B); r(4, 21, 3, 1, F); r(9, 21, 3, 1, F) },
    stance: () => { r(4, 15, 2, 6, B); r(10, 15, 2, 6, B); r(3, 21, 3, 1, F); r(10, 21, 3, 1, F) },
    stepA:  () => { r(4, 15, 2, 6, B); r(10, 15, 2, 5, B); r(3, 21, 3, 1, F); r(10, 20, 3, 1, F) },
    stepB:  () => { r(6, 15, 2, 5, B); r(8, 15, 2, 6, B); r(5, 20, 3, 1, F); r(8, 21, 3, 1, F) },
    kick:   () => { r(4, 15, 2, 6, B); r(3, 21, 3, 1, F); r(9, 15, 6, 2, B); r(15, 14, 1, 3, F) },
    tuck:   () => { r(5, 15, 2, 4, B); r(9, 15, 2, 4, B); r(4, 19, 3, 1, F); r(9, 19, 3, 1, F) },
  }
  if (L.dress) r(4, 13, 8, 5, L.dress)
  legs[P.leg]()
  // 몸통
  r(4, 8, 8, 7, T)
  r(4, 8, 8, 1, shade(T, 0.12))
  r(11, 9, 1, 6, shade(T, -0.12))
  // 팔
  const arm = (x, y, w, h) => r(x, y, w, h, L.sleeve ?? T)
  const hand = (x, y) => r(x, y, 1, 1, S)
  const arms = {
    down:   () => { arm(3, 9, 1, 5); hand(3, 14); arm(12, 9, 1, 5); hand(12, 14) },
    swingA: () => { arm(3, 9, 1, 4); hand(2, 13); arm(12, 9, 1, 5); hand(13, 14) },
    swingB: () => { arm(3, 9, 1, 5); hand(3, 14); arm(12, 9, 1, 4); hand(12, 13) },
    punch:  () => { arm(3, 9, 1, 4); hand(3, 13); arm(12, 9, 4, 2); r(16, 9, 1, 2, S) },
    guard:  () => { arm(11, 8, 2, 3); hand(13, 7); hand(13, 8); arm(3, 9, 1, 3); hand(4, 11) },
    hurt:   () => { arm(2, 7, 1, 3); hand(1, 6); arm(13, 7, 1, 3); hand(14, 6) },
    up:     () => { arm(3, 9, 1, 3); hand(3, 12); arm(12, 8, 2, 2); hand(14, 8) },
    cheer:  () => { arm(3, 4, 1, 5); hand(3, 3); arm(12, 4, 1, 5); hand(12, 3) },
  }
  arms[P.arm]()
  // 머리
  r(5, 2, 6, 6, S)
  r(10, 3, 1, 4, shade(S, -0.08))
  const hs = L.hairStyle ?? 'short'
  if (hs === 'short') { r(4, 1, 8, 2, H); r(4, 3, 1, 2, H) }
  if (hs === 'long') { r(4, 1, 8, 2, H); r(4, 3, 1, 5, H); r(11, 3, 1, 3, H) }
  if (hs === 'bun') { r(4, 1, 8, 2, H); r(4, 3, 1, 2, H); r(6, -1, 3, 2, H) }
  if (hs === 'spiky') { r(4, 1, 8, 2, H); r(5, 0, 1, 1, H); r(8, 0, 1, 1, H); r(10, 0, 1, 1, H); r(4, 3, 1, 2, H) }
  if (hs === 'bald') r(5, 2, 6, 1, shade(S, 0.08))
  // 얼굴
  const face = P.face ?? L.face ?? 'normal'
  const E = '#1b1a26'
  if (face === 'hurt') { r(6, 4, 1, 1, E); r(9, 4, 1, 1, E); r(7, 6, 2, 1, '#8a2b2b') }
  else if (face === 'angry') { r(6, 4, 1, 1, E); r(9, 4, 1, 1, E); r(6, 3, 1, 1, E); r(10, 3, 1, 1, E); r(7, 6, 2, 1, E) }
  else if (face === 'happy') { r(6, 4, 1, 1, E); r(9, 4, 1, 1, E); r(7, 6, 2, 1, '#b8434b') }
  else { r(6, 4, 1, 2, E); r(9, 4, 1, 2, E); r(7, 6, 2, 1, shade(S, -0.25)) }
  r(5, 5, 1, 1, '#f2a0a0'); r(10, 5, 1, 1, '#f2a0a0')
  // 모자
  const C = L.hatColor ?? '#e03131'
  switch (L.hat) {
    case 'cap': r(4, 0, 8, 2, C); r(10, 2, 4, 1, shade(C, -0.15)); break
    case 'beanie': r(4, -1, 8, 3, C); r(4, 1, 8, 1, shade(C, -0.15)); break
    case 'beret': r(3, 0, 8, 2, C); r(7, -1, 2, 1, C); break
    case 'headset': r(4, 0, 8, 1, '#2b2b3a'); r(3, 3, 1, 3, '#2b2b3a'); r(12, 3, 1, 3, '#2b2b3a'); r(12, 6, 2, 1, '#2b2b3a'); break
    case 'headband': r(4, 2, 8, 1, C); r(3, 3, 1, 2, C); break
    case 'hood': r(3, 0, 10, 2, C); r(3, 2, 1, 6, C); r(12, 2, 1, 6, C); break
    case 'veil': r(3, 0, 10, 2, '#ffffff'); r(3, 2, 1, 8, '#f1f3f5'); r(12, 2, 1, 8, '#f1f3f5'); break
    case 'hardhat': r(4, -1, 8, 3, '#fcc419'); r(3, 1, 10, 1, '#f59f00'); break
  }
  // 소품
  for (const a of L.acc ?? []) {
    switch (a) {
      case 'glasses': r(5, 4, 2, 1, '#1b1a26'); r(8, 4, 3, 1, '#1b1a26'); break
      case 'shades': r(5, 4, 6, 2, '#111'); break
      case 'tie': r(7, 8, 2, 1, '#c92a2a'); r(7, 9, 2, 4, '#c92a2a'); break
      case 'vest': r(4, 9, 2, 6, '#ff922b'); r(10, 9, 2, 6, '#ff922b'); r(4, 11, 8, 1, '#e9ecef'); break
      case 'apron': r(5, 9, 6, 8, '#e9ecef'); break
      case 'camera': r(12, 5, 4, 3, '#343a40'); r(15, 6, 1, 1, '#74c0fc'); break
      case 'backpack': r(1, 8, 2, 6, '#2f9e44'); break
      case 'phone': r(13, 12, 1, 2, '#adb5bd'); break
      case 'clipboard': r(12, 11, 3, 4, '#e9c46a'); break
      case 'megaphone': r(13, 10, 3, 2, '#fab005'); break
      case 'wheel': r(12, 11, 3, 3, '#495057'); r(13, 12, 1, 1, '#ced4da'); break
      case 'drone': r(13, 0, 4, 1, '#495057'); r(14, 1, 2, 1, '#868e96'); break
      case 'brush': r(13, 9, 1, 5, '#a0522d'); r(13, 8, 1, 1, '#e64980'); break
      case 'mic': r(13, 3, 1, 7, '#868e96'); r(12, 2, 3, 2, '#495057'); break
      case 'pearl': r(5, 8, 6, 1, '#f8f9fa'); break
      case 'gloves': r(3, 14, 1, 1, '#fab005'); r(12, 14, 1, 1, '#fab005'); break
      case 'medal': r(7, 10, 2, 2, '#fcc419'); break
      case 'scarf': r(4, 8, 8, 1, L.accColor ?? '#e64980'); r(4, 9, 1, 3, L.accColor ?? '#e64980'); break
    }
  }
  return g.outline().toCanvas()
}

// ───── 몬스터 (16×16) ─────
const MASK = {
  blob: (x, y) => ((x - 7.5) ** 2) / 49 + ((y - 11) ** 2) / 30 <= 1 && y <= 14,
  ghost: (x, y) => ((x - 7.5) ** 2 + (y - 6.5) ** 2 <= 30) || (y >= 6 && y <= 13 && x >= 2 && x <= 13) || (y === 14 && x >= 2 && x <= 13 && x % 4 !== 1),
  cloud: (x, y) => ((x - 5) ** 2 + (y - 9) ** 2 <= 14) || ((x - 10) ** 2 + (y - 8) ** 2 <= 19) || ((x - 7.5) ** 2 + (y - 11) ** 2 <= 12),
  ball: (x, y) => (x - 7.5) ** 2 + (y - 8.5) ** 2 <= 32,
  box: (x, y) => (x >= 2 && x <= 13 && y >= 3 && y <= 12) || ((x === 4 || x === 5 || x === 10 || x === 11) && y >= 13 && y <= 14),
  bird: (x, y) => ((x - 7) ** 2) / 30 + ((y - 10) ** 2) / 13 <= 1 || (x - 11) ** 2 + (y - 5.5) ** 2 <= 7,
  cup: (x, y) => (x >= 2 && x <= 10 && y >= 5 && y <= 14) || (x >= 11 && x <= 13 && y >= 7 && y <= 11 && !(x === 12 && y >= 8 && y <= 10)),
  clock: (x, y) => (x - 7.5) ** 2 + (y - 7.5) ** 2 <= 30 || ((x === 4 || x === 11) && y >= 13 && y <= 14),
  golem: (x, y) => (x >= 1 && x <= 14 && y >= 5 && y <= 13) || (x >= 4 && x <= 11 && y >= 1 && y <= 4) || ((x >= 2 && x <= 4 || x >= 11 && x <= 13) && y >= 14),
  fairy: (x, y) => (x - 7.5) ** 2 + (y - 9) ** 2 <= 9,
  swirl: (x, y) => { const d = Math.hypot(x - 7.5, y - 8); return d <= 7 && d >= 1.5 },
}

function monster(M) {
  const g = new Grid(16, 16)
  const mask = MASK[M.shape] ?? MASK.blob
  const base = M.color ?? '#8ce99a'
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!mask(x + 0.01, y + 0.01)) continue
    const hl = !mask(x - 1, y - 1)
    const sh = !mask(x + 1, y + 1)
    g.set(x, y, hl ? shade(base, 0.14) : sh ? shade(base, -0.16) : base)
  }
  if (M.shape === 'fairy') { // 날개
    for (const [cx, cy] of [[3.5, 6], [11.5, 6]]) for (let y = 3; y < 10; y++) for (let x = 0; x < 16; x++) if (((x - cx) ** 2) / 5 + ((y - cy) ** 2) / 8 <= 1 && !g.get(x, y)) g.set(x, y, '#d0ebff')
  }
  if (M.shape === 'swirl') for (let a = 0; a < 18; a++) { const t = a / 3; g.set(7.5 + Math.cos(t) * t * 0.9, 8 + Math.sin(t) * t * 0.9, shade(base, -0.3)) }
  if (M.shape === 'clock') { g.set(7, 5, OUT); g.set(7, 6, OUT); g.set(7, 7, OUT); g.set(8, 7, OUT); g.set(9, 7, OUT) }
  // 얼굴
  const ey = M.eyeY ?? { blob: 10, ghost: 6, cloud: 9, ball: 8, box: 6, bird: 5, cup: 9, clock: 10, golem: 3, fairy: 8, swirl: 8 }[M.shape] ?? 8
  const ex = M.shape === 'bird' ? [10, 12] : M.shape === 'golem' ? [5, 9] : M.shape === 'fairy' ? [6, 9] : [5, 10]
  const ec = M.eye === 'red' ? '#ff3b3b' : '#1b1a26'
  if (M.eye === 'sleepy') { g.set(ex[0], ey, ec); g.set(ex[0] + 1, ey, ec); g.set(ex[1], ey, ec); g.set(ex[1] + 1, ey, ec) }
  else {
    g.set(ex[0], ey, '#ffffff'); g.set(ex[0], ey + 1, ec); g.set(ex[1], ey, '#ffffff'); g.set(ex[1], ey + 1, ec)
    if (M.eye === 'angry' || M.eye === 'red') { g.set(ex[0] - 1, ey - 1, OUT); g.set(ex[0], ey - 1, OUT); g.set(ex[1], ey - 1, OUT); g.set(ex[1] + 1, ey - 1, OUT) }
  }
  if (M.mouth !== false && M.shape !== 'bird') { const mx = Math.round((ex[0] + ex[1]) / 2); g.set(mx, ey + 3, M.mouth === 'grin' ? '#ffffff' : OUT); g.set(mx + 1, ey + 3, OUT) }
  if (M.shape === 'bird') { g.set(14, 6, '#fab005'); g.set(15, 6, '#fab005') }
  // 소품
  for (const a of M.acc ?? []) {
    switch (a) {
      case 'plug': g.rect(13, 12, 2, 2, '#e03131'); g.set(15, 12, '#adb5bd'); g.set(15, 13, '#adb5bd'); break
      case 'battery': g.rect(6, 4, 4, 2, '#495057'); g.rect(7, 3, 2, 1, '#adb5bd'); break
      case 'plus': g.set(7, 12, '#ffffff'); g.set(6, 12, '#ffffff'); g.set(8, 12, '#ffffff'); break
      case 'steam': g.set(4, 2, '#e9ecef'); g.set(5, 1, '#e9ecef'); g.set(8, 3, '#e9ecef'); g.set(9, 2, '#e9ecef'); break
      case 'drops': g.set(4, 14, '#4dabf7'); g.set(8, 15, '#4dabf7'); g.set(11, 14, '#4dabf7'); break
      case 'sdcard': g.rect(11, 10, 4, 5, '#1c7ed6'); g.rect(11, 10, 2, 1, '#e9ecef'); break
      case 'dollar': g.rect(7, 11, 2, 1, '#2f9e44'); g.rect(6, 12, 4, 1, '#2f9e44'); g.rect(7, 13, 2, 1, '#2f9e44'); break
      case 'tie': g.rect(7, 11, 2, 3, '#c92a2a'); break
      case 'slate': g.rect(10, 8, 5, 4, '#212529'); g.rect(10, 7, 5, 1, '#f8f9fa'); break
      case 'antenna': g.set(7, 0, '#e03131'); g.set(7, 1, '#868e96'); g.set(7, 2, '#868e96'); break
      case 'screen': g.rect(4, 5, 8, 4, '#0b7285'); break
      case 'zzz': g.set(13, 1, '#e9ecef'); g.set(14, 1, '#e9ecef'); g.set(14, 2, '#e9ecef'); g.set(13, 3, '#e9ecef'); g.set(14, 3, '#e9ecef'); break
      case 'bolt': g.set(12, 2, '#fcc419'); g.set(11, 3, '#fcc419'); g.set(12, 3, '#fcc419'); g.set(11, 4, '#fcc419'); break
      case 'crack': g.set(5, 8, OUT); g.set(6, 9, OUT); g.set(5, 10, OUT); g.set(10, 6, OUT); g.set(11, 7, OUT); break
    }
  }
  return g.outline().toCanvas()
}

// ───── 문자열 도트 ─────
function rows(def) {
  const h = def.rows.length, w = Math.max(...def.rows.map((r) => r.length))
  const g = new Grid(w + 2, h + 2)
  def.rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = def.pal[ch]; if (c) g.set(x + 1, y + 1, c) }))
  return def.outline === false ? g.toCanvas() : g.outline().toCanvas()
}

// 실루엣 (도감 잠금)
function silhouette(src) {
  const c = canvas(src.width, src.height)
  const ctx = c.getContext('2d')
  ctx.drawImage(src, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = '#0a0912'
  ctx.fillRect(0, 0, c.width, c.height)
  return c
}

// key: 'job:cam_maknae' 'enemy:pigeons' 'icon:heart' 'prop:lamp' 'look:{json}'
export function getSprite(key, pose = 'idle') {
  const ck = `${key}|${pose}`
  if (cache.has(ck)) return cache.get(ck)
  const [kind, id] = key.split(/:(.+)/)
  let c
  if (kind === 'job') c = human(SP.looks[id] ?? SP.looks._default, pose)
  else if (kind === 'enemy') {
    const e = SP.enemies[id]
    c = e?.human ? human(e.human, pose) : monster(e ?? { shape: 'blob' })
  } else if (kind === 'icon') c = rows(SP.icons[id] ?? SP.icons.question)
  else if (kind === 'prop') c = rows(SP.props[id] ?? SP.props.box)
  else if (kind === 'sil') c = silhouette(getSprite(id, pose))
  else c = monster({ shape: 'blob' })
  cache.set(ck, c)
  return c
}

export const isHuman = (enemyId) => !!SP.enemies[enemyId]?.human

export function spriteImg(key, scale = 3, { pose = 'idle', cls = '', flip = false, alt = '' } = {}) {
  const ck = `${key}|${pose}`
  let url = urlCache.get(ck)
  const c = getSprite(key, pose)
  if (!url) { url = c.toDataURL(); urlCache.set(ck, url) }
  const img = document.createElement('img')
  img.src = url
  img.width = c.width * scale
  img.height = c.height * scale
  img.alt = alt
  img.className = `px ${cls}${flip ? ' flip' : ''}`
  img.draggable = false
  return img
}

export const icon = (id, scale = 2, cls = '') => spriteImg(`icon:${id}`, scale, { cls: `ico ${cls}` })
