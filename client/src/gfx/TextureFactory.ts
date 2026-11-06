// 부팅 때 코드로 그린 도트를 Phaser 텍스처·애니메이션으로 등록합니다.
// 실제 스프라이트 PNG로 바꿀 때는 이 파일에서 같은 키(예: 'dp', 'dp_alt')로 load.spritesheet 하면 됩니다.
import Phaser from 'phaser'
import { paint, paintProjectile, FW, FH, KITS, type Costume } from './Painter'
import { animsFor } from './charPoses'
import { KIT_OF } from '../config/characters'

const E = '#1b1325'
export const COSTUMES: Record<string, Costume> = {
  // 촬영감독: 파란 캡 + 남색 후드티(빨간 끈) + 흰 운동화
  dp: { skin: '#f6c9a0', hair: '#2b1d16', cap: '#2f6fe4', capLogo: '#ffd23f', hoodie: '#27304a', strings: '#e23b4e', pants: '#3a3f4f', shoes: '#f4f1ea', shoeStripe: '#2f6fe4', eye: E, blush: '#f2918e' },
  dp_alt: { skin: '#eab88d', hair: '#151018', cap: '#e0353f', capLogo: '#ffffff', hoodie: '#5a1f2e', strings: '#ffd23f', pants: '#25222e', shoes: '#26232e', shoeStripe: '#e0353f', eye: E, blush: '#ee8b8b' },
  dp_boss: { skin: '#f0c19a', hair: '#0c0a10', cap: '#16131c', capLogo: '#d4af37', hoodie: '#1c1a22', strings: '#d4af37', pants: '#111016', shoes: '#d4af37', shoeStripe: '#16131c', eye: '#b91c1c', blush: '#e88a8a' },
  // 연출감독: 베레모 + 뿔테 안경 + 재킷 + 노란 스카프
  director: { skin: '#f3c6a0', hair: '#1d1410', hat: 'beret', cap: '#b91c1c', hoodie: '#e8e4da', top: 'jacket', topAccent: '#6b5b3e', strings: '#facc15', pants: '#2e2a26', shoes: '#4a3426', shoeStripe: '#2e2a26', eye: E, blush: '#f2918e', glasses: '#26232e' },
  director_alt: { skin: '#e8b58c', hair: '#3a2a20', hat: 'beret', cap: '#1e3a8a', hoodie: '#d6d3d1', top: 'jacket', topAccent: '#374151', strings: '#38bdf8', pants: '#1f2937', shoes: '#111827', shoeStripe: '#1f2937', eye: E, blush: '#ee8b8b', glasses: '#7c2d12' },
  director_boss: { skin: '#f0c19a', hair: '#e5e5e5', hat: 'beret', cap: '#0c0a10', hoodie: '#1c1a22', top: 'jacket', topAccent: '#0c0a10', strings: '#d4af37', pants: '#111016', shoes: '#d4af37', shoeStripe: '#111016', eye: '#b91c1c', blush: '#e88a8a', glasses: '#d4af37' },
  // 사운드감독: 비니 + 헤드폰 + 낚시 조끼
  sound: { skin: '#f6c9a0', hair: '#5b3a24', hat: 'beanie', cap: '#3f9d5a', capLogo: '#bbf7d0', headphones: '#1f2430', hoodie: '#6b7280', top: 'vest', topAccent: '#4d5b3a', strings: '#facc15', pants: '#3a3f4f', shoes: '#57534e', shoeStripe: '#3f9d5a', eye: E, blush: '#f2918e' },
  sound_alt: { skin: '#eab88d', hair: '#1a1410', hat: 'beanie', cap: '#ea580c', capLogo: '#fed7aa', headphones: '#e5e7eb', hoodie: '#334155', top: 'vest', topAccent: '#1f2937', strings: '#f97316', pants: '#25222e', shoes: '#26232e', shoeStripe: '#ea580c', eye: E, blush: '#ee8b8b' },
  sound_boss: { skin: '#f0c19a', hair: '#0c0a10', hat: 'beanie', cap: '#0c0a10', capLogo: '#d4af37', headphones: '#d4af37', hoodie: '#1c1a22', top: 'vest', topAccent: '#0c0a10', strings: '#d4af37', pants: '#111016', shoes: '#d4af37', shoeStripe: '#111016', eye: '#b91c1c', blush: '#e88a8a' },
  // 조명감독: 반다나 + 검은 티 + 작업 장갑 + 공구 벨트 + 수염
  gaffer: { skin: '#e0a878', hair: '#1a1410', hairStyle: 'spiky', hat: 'bandana', cap: '#f59e0b', capLogo: '#7c2d12', hoodie: '#26262e', top: 'vest', topAccent: '#3f3f46', strings: '#f59e0b', pants: '#44403c', shoes: '#78350f', shoeStripe: '#f59e0b', eye: E, blush: '#e2876f', gloves: '#facc15', belt: '#78350f', stubble: true },
  gaffer_alt: { skin: '#c98d62', hair: '#3a2a20', hairStyle: 'spiky', hat: 'bandana', cap: '#0ea5e9', capLogo: '#ffffff', hoodie: '#e5e7eb', top: 'vest', topAccent: '#1e3a8a', strings: '#0ea5e9', pants: '#1f2937', shoes: '#111827', shoeStripe: '#0ea5e9', eye: E, blush: '#d27b6a', gloves: '#e5e7eb', belt: '#111827', stubble: true },
  gaffer_boss: { skin: '#d9a073', hair: '#0c0a10', hairStyle: 'spiky', hat: 'bandana', cap: '#0c0a10', capLogo: '#d4af37', hoodie: '#1c1a22', top: 'vest', topAccent: '#0c0a10', strings: '#d4af37', pants: '#111016', shoes: '#d4af37', shoeStripe: '#111016', eye: '#b91c1c', blush: '#d27b6a', gloves: '#d4af37', belt: '#d4af37', stubble: true },
  // 미술감독: 올림머리 + 흰 티 + 물감 묻은 데님 앞치마
  art: { skin: '#f6c9a0', hair: '#7c4a2a', hairStyle: 'bun', hat: undefined, hoodie: '#e8e4da', top: 'apron', topAccent: '#3d6fb6', strings: '#a855f7', pants: '#4b5563', shoes: '#a855f7', shoeStripe: '#f4f1ea', eye: E, blush: '#f2918e' },
  art_alt: { skin: '#eab88d', hair: '#151018', hairStyle: 'bun', hoodie: '#fde68a', top: 'apron', topAccent: '#78350f', strings: '#22c55e', pants: '#3f3f46', shoes: '#22c55e', shoeStripe: '#f4f1ea', eye: E, blush: '#ee8b8b' },
  art_boss: { skin: '#f0c19a', hair: '#0c0a10', hairStyle: 'bun', hoodie: '#1c1a22', top: 'apron', topAccent: '#0c0a10', strings: '#d4af37', pants: '#111016', shoes: '#d4af37', shoeStripe: '#111016', eye: '#b91c1c', blush: '#e88a8a' },
  // 분장실장: 긴 머리 + 검은 작업복 + 분홍 브러시 벨트
  makeup: { skin: '#f8d2b4', hair: '#4a2433', hairStyle: 'long', hoodie: '#2b2433', top: 'apron', topAccent: '#3b3145', strings: '#ff7eb6', pants: '#2b2433', shoes: '#ff7eb6', shoeStripe: '#ffffff', eye: E, blush: '#ff8fb0', belt: '#ff7eb6' },
  makeup_alt: { skin: '#eab88d', hair: '#e8c26a', hairStyle: 'long', hoodie: '#f4f1ea', top: 'apron', topAccent: '#d6d3d1', strings: '#8b5cf6', pants: '#e5e7eb', shoes: '#8b5cf6', shoeStripe: '#ffffff', eye: E, blush: '#ff8fb0', belt: '#8b5cf6' },
  makeup_boss: { skin: '#f3c9ab', hair: '#0c0a10', hairStyle: 'long', hoodie: '#1c1a22', top: 'apron', topAccent: '#0c0a10', strings: '#d4af37', pants: '#111016', shoes: '#d4af37', shoeStripe: '#111016', eye: '#b91c1c', blush: '#e88a8a', belt: '#d4af37' },
}

/** 텍스처 키 → 캐릭터 id (dp_alt → dp) */
const charOf = (key: string) => key.replace(/_(alt|boss)$/, '')
export const PROJECTILE_KINDS = ['lightstand', 'cut', 'wave', 'script', 'bulb', 'paint', 'spray', 'beam']

export function animKey(tex: string, anim: string) { return `${tex}_${anim}` }

/** 부팅 때는 기본 색만 그리고, 2P 색·보스 색은 그 전투가 시작될 때 그림 (부팅 시간 단축) */
export function buildFighterTextures(scene: Phaser.Scene) {
  for (const key of Object.keys(COSTUMES)) if (!/_(alt|boss)$/.test(key)) ensureFighterTexture(scene, key)
  for (const k of PROJECTILE_KINDS) scene.textures.addCanvas(`proj_${k}`, paintProjectile(k))
}

export function ensureFighterTexture(scene: Phaser.Scene, key: string) {
  if (scene.textures.exists(key)) return
  const costume = COSTUMES[key]
  {
    const ANIMS = animsFor(charOf(key))
    const all = Object.entries(ANIMS).flatMap(([name, a]) => a.frames.map((p, i) => ({ name: `${name}_${i}`, pose: p })))
    const sheet = document.createElement('canvas')
    sheet.width = FW * all.length; sheet.height = FH
    const ctx = sheet.getContext('2d')!
    const kit = KITS[KIT_OF[charOf(key)] ?? 'camera']
    all.forEach((f, i) => ctx.drawImage(paint(costume, f.pose, kit), i * FW, 0))
    const tex = scene.textures.addCanvas(key, sheet)!
    all.forEach((f, i) => tex.add(f.name, 0, i * FW, 0, FW, FH))
    for (const [name, a] of Object.entries(ANIMS)) {
      scene.anims.create({
        key: animKey(key, name),
        frames: a.frames.map((_, i) => ({ key, frame: `${name}_${i}` })),
        frameRate: a.fps,
        repeat: a.loop ? -1 : 0,
      })
    }
  }
}

// ───── 효과·배경 ─────
function cv(w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')!] as const }

export function buildFxTextures(scene: Phaser.Scene) {
  // 타격 불꽃 (6프레임)
  const sparks = [{ key: 'spark', main: '#fff7cc', edge: '#f59e0b' }, { key: 'blockspark', main: '#e0f2fe', edge: '#38bdf8' }]
  for (const s of sparks) {
    const [c, ctx] = cv(32 * 6, 32)
    for (let f = 0; f < 6; f++) {
      const r = 3 + f * 2.4
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2 + f * 0.2
        const len = r * (a % 2 ? 0.6 : 1)
        for (let t = f * 1.2; t < len; t++) {
          ctx.fillStyle = t > len - 3 ? s.edge : s.main
          ctx.fillRect(Math.round(f * 32 + 16 + Math.cos(ang) * t), Math.round(16 + Math.sin(ang) * t), 2, 2)
        }
      }
    }
    const tex = scene.textures.addCanvas(s.key, c)!
    for (let f = 0; f < 6; f++) tex.add(`f${f}`, 0, f * 32, 0, 32, 32)
    scene.anims.create({ key: s.key, frames: [0, 1, 2, 3, 4, 5].map((f) => ({ key: s.key, frame: `f${f}` })), frameRate: 30, repeat: 0 })
  }
  // 먼지
  const [dc, dctx] = cv(16, 8)
  dctx.fillStyle = '#d6d3d1'; dctx.fillRect(2, 4, 4, 3); dctx.fillRect(7, 3, 5, 4); dctx.fillRect(12, 5, 3, 2)
  scene.textures.addCanvas('dust', dc)
  // 그림자
  const [sc, sctx] = cv(32, 6)
  sctx.fillStyle = 'rgba(0,0,0,0.35)'; sctx.beginPath(); sctx.ellipse(16, 3, 15, 3, 0, 0, Math.PI * 2); sctx.fill()
  scene.textures.addCanvas('shadow', sc)
  // 1픽셀 흰색 (게이지·플래시용)
  const [wc, wctx] = cv(2, 2); wctx.fillStyle = '#fff'; wctx.fillRect(0, 0, 2, 2)
  scene.textures.addCanvas('px', wc)
}

/** STAGE 1 크로마키 스튜디오 배경 (480×270) */
export function buildChromaStage(scene: Phaser.Scene) {
  const [c, ctx] = cv(480, 270)
  const ground = 230
  // 크로마키 벽
  ctx.fillStyle = '#16a34a'; ctx.fillRect(0, 0, 480, ground)
  ctx.fillStyle = '#15803d'
  for (let x = 0; x < 480; x += 40) ctx.fillRect(x, 0, 2, ground)       // 천 이음새
  ctx.fillStyle = '#22c55e'; ctx.fillRect(0, ground - 30, 480, 30)       // 곡면(사이클로라마) 하이라이트
  ctx.fillStyle = '#4ade80'; ctx.fillRect(0, ground - 30, 480, 2)
  // 트래킹 마커 (X 표시)
  ctx.fillStyle = '#bbf7d0'
  for (const [mx, my] of [[60, 60], [180, 90], [300, 50], [420, 100], [120, 150], [360, 160]]) {
    for (let i = -3; i <= 3; i++) { ctx.fillRect(mx + i, my + i, 1, 1); ctx.fillRect(mx + i, my - i, 1, 1) }
  }
  // 천장 조명 트러스
  ctx.fillStyle = '#1f2937'; ctx.fillRect(0, 0, 480, 10)
  ctx.fillStyle = '#374151'
  for (let x = 0; x < 480; x += 12) { ctx.fillRect(x, 2, 8, 1); ctx.fillRect(x + 3, 4, 1, 5) }
  // 대형 조명 (양쪽 소프트박스)
  const softbox = (x: number, flip: boolean) => {
    ctx.fillStyle = '#4b5563'; ctx.fillRect(x + 14, 70, 2, ground - 70)               // 스탠드
    ctx.fillRect(x + 6, ground - 2, 18, 2)
    ctx.fillStyle = '#111827'; ctx.fillRect(x, 40, 30, 36)                             // 박스
    ctx.fillStyle = '#fef9c3'; ctx.fillRect(x + (flip ? 2 : 4), 44, 24, 28)            // 빛 면
    ctx.fillStyle = '#fde68a'; ctx.fillRect(x + (flip ? 2 : 4), 44, 24, 3)
  }
  softbox(8, false); softbox(442, true)
  // C-스탠드
  const cstand = (x: number) => {
    ctx.fillStyle = '#6b7280'
    ctx.fillRect(x, 120, 2, ground - 120); ctx.fillRect(x - 10, ground - 2, 22, 2)
    ctx.fillRect(x - 18, 124, 20, 2)                                                  // 암
    ctx.fillStyle = '#111827'; ctx.fillRect(x - 24, 112, 10, 16)                      // 플래그
  }
  cstand(96); cstand(390)
  // 바닥
  ctx.fillStyle = '#4b5563'; ctx.fillRect(0, ground, 480, 40)
  ctx.fillStyle = '#374151'
  for (let x = 0; x < 480; x += 32) ctx.fillRect(x, ground, 1, 40)
  ctx.fillStyle = '#6b7280'; ctx.fillRect(0, ground, 480, 2)
  // 바닥 마크 테이프
  ctx.fillStyle = '#facc15'; ctx.fillRect(160, ground + 8, 6, 2); ctx.fillRect(314, ground + 8, 6, 2)
  ctx.fillStyle = '#f43f5e'; ctx.fillRect(238, ground + 14, 4, 4)
  // 케이블
  ctx.fillStyle = '#111827'
  for (let x = 0; x < 480; x++) ctx.fillRect(x, ground + 24 + Math.round(Math.sin(x / 18) * 2), 1, 1)
  scene.textures.addCanvas('stage_chroma', c)
}

// ───── 스테이지 배경 2~5 (480×270, 지면 y=230) ─────
function floor(ctx: CanvasRenderingContext2D, ground: number, base: string, line: string, top: string, step = 32) {
  ctx.fillStyle = base; ctx.fillRect(0, ground, 480, 40)
  ctx.fillStyle = line; for (let x = 0; x < 480; x += step) ctx.fillRect(x, ground, 1, 40)
  ctx.fillStyle = top; ctx.fillRect(0, ground, 480, 2)
}
const rnd = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

export function buildStages(scene: Phaser.Scene) {
  const ground = 230
  // STAGE 2: 골목 야간 로케 — 남색 하늘, 건물, 간판, 가로등, 촬영용 조명
  {
    const [c, ctx] = cv(480, 270); const r = rnd(7)
    const sky = ctx.createLinearGradient(0, 0, 0, ground); sky.addColorStop(0, '#0b1026'); sky.addColorStop(1, '#2a1e4a')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 480, ground)
    ctx.fillStyle = '#fef9c3'; for (let i = 0; i < 40; i++) ctx.fillRect(Math.floor(r() * 480), Math.floor(r() * 90), 1, 1)
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(400, 40, 12, 0, Math.PI * 2); ctx.fill()
    const blds = [[0, 70, 90, '#1e1b3a'], [86, 100, 80, '#272347'], [160, 60, 110, '#1b1834'], [266, 90, 90, '#262145'], [352, 76, 128, '#1d1a38']] as const
    for (const [x, y, w, col] of blds) {
      ctx.fillStyle = col; ctx.fillRect(x, y, w, ground - y)
      for (let wy = y + 10; wy < ground - 30; wy += 16) for (let wx = x + 8; wx < x + w - 10; wx += 14) { ctx.fillStyle = r() < 0.45 ? '#fcd34d' : '#3b3566'; ctx.fillRect(wx, wy, 7, 9) }
    }
    // 네온 간판
    const sign = (x: number, y: number, w: number, col: string, txt: string) => { ctx.fillStyle = '#0a0812'; ctx.fillRect(x - 2, y - 2, w + 4, 18); ctx.fillStyle = col; ctx.fillRect(x, y, w, 14); ctx.fillStyle = '#0a0812'; ctx.font = 'bold 10px sans-serif'; ctx.fillText(txt, x + 4, y + 11) }
    sign(100, 120, 44, '#f472b6', '노래방'); sign(280, 112, 36, '#38bdf8', '분식'); sign(180, 140, 40, '#fbbf24', '24시')
    // 가로등
    for (const x of [60, 420]) { ctx.fillStyle = '#4b5563'; ctx.fillRect(x, 120, 3, ground - 120); ctx.fillRect(x - 8, 120, 14, 3); ctx.fillStyle = '#fef08a'; ctx.fillRect(x - 8, 123, 10, 3); ctx.fillStyle = 'rgba(254,240,138,0.12)'; ctx.beginPath(); ctx.moveTo(x - 8, 126); ctx.lineTo(x - 40, ground); ctx.lineTo(x + 26, ground); ctx.lineTo(x + 2, 126); ctx.fill() }
    floor(ctx, ground, '#3f3f46', '#2f2f36', '#52525b', 40)
    ctx.fillStyle = '#facc15'; for (let x = 10; x < 480; x += 48) ctx.fillRect(x, ground + 18, 20, 2)   // 차선
    ctx.fillStyle = 'rgba(56,189,248,0.25)'; ctx.fillRect(300, ground + 6, 60, 3)   // 물웅덩이 반사
    scene.textures.addCanvas('stage_alley', c)
  }
  // STAGE 3: 사극 세트장 — 한옥 지붕, 기와, 담장, 횃불, 마당
  {
    const [c, ctx] = cv(480, 270)
    const sky = ctx.createLinearGradient(0, 0, 0, ground); sky.addColorStop(0, '#7dd3fc'); sky.addColorStop(1, '#e0f2fe')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 480, ground)
    ctx.fillStyle = '#86b39a'; ctx.beginPath(); ctx.moveTo(0, 130); for (let x = 0; x <= 480; x += 40) ctx.lineTo(x, 110 + Math.sin(x / 70) * 22); ctx.lineTo(480, ground); ctx.lineTo(0, ground); ctx.fill()  // 산
    const hanok = (x: number, w: number, y: number) => {
      ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x + 8, y + 18, w - 16, ground - y - 60)                          // 기둥·벽
      ctx.fillStyle = '#f5e6c8'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 14 + k * ((w - 28) / 4), y + 24, (w - 28) / 4 - 6, 40)  // 창호지 문
      ctx.fillStyle = '#b08a5a'; for (let k = 0; k < 4; k++) { const bx = x + 14 + k * ((w - 28) / 4); ctx.fillRect(bx + ((w - 28) / 8) - 3, y + 24, 1, 40); ctx.fillRect(bx, y + 44, (w - 28) / 4 - 6, 1) }
      ctx.fillStyle = '#374151'; ctx.beginPath(); ctx.moveTo(x - 10, y + 20); ctx.quadraticCurveTo(x + w / 2, y - 4, x + w + 10, y + 20); ctx.lineTo(x + w, y + 8); ctx.quadraticCurveTo(x + w / 2, y - 18, x, y + 8); ctx.fill()  // 기와 지붕
      ctx.fillStyle = '#4b5563'; for (let k = 0; k < w; k += 6) ctx.fillRect(x + k, y + 12 - Math.sin((k / w) * Math.PI) * 10, 2, 6)
      ctx.fillStyle = '#d4a373'; ctx.fillRect(x + 4, ground - 42, w - 8, 6)                                     // 툇마루
    }
    hanok(40, 160, 70); hanok(280, 170, 60)
    // 돌담
    ctx.fillStyle = '#a8a29e'; ctx.fillRect(0, ground - 30, 480, 30)
    ctx.fillStyle = '#78716c'; for (let y = ground - 30; y < ground; y += 10) for (let x = (y / 10) % 2 * 10; x < 480; x += 20) ctx.fillRect(x, y, 1, 10)
    ctx.fillStyle = '#57534e'; ctx.fillRect(0, ground - 30, 480, 2)
    // 횃불
    for (const x of [22, 458]) { ctx.fillStyle = '#78350f'; ctx.fillRect(x, ground - 70, 3, 70); ctx.fillStyle = '#f97316'; ctx.fillRect(x - 3, ground - 80, 9, 10); ctx.fillStyle = '#fde047'; ctx.fillRect(x - 1, ground - 78, 5, 6) }
    floor(ctx, ground, '#c8a46e', '#b48f5a', '#dcbc86', 48)
    // 촬영 레일
    ctx.fillStyle = '#6b7280'; ctx.fillRect(0, ground + 26, 480, 2); ctx.fillRect(0, ground + 32, 480, 2)
    ctx.fillStyle = '#44403c'; for (let x = 0; x < 480; x += 16) ctx.fillRect(x, ground + 24, 3, 12)
    scene.textures.addCanvas('stage_hanok', c)
  }
  // STAGE 4: 노을 진 옥상 — 주황 하늘, 도시 실루엣, 물탱크, 난간, 반사판
  {
    const [c, ctx] = cv(480, 270); const r = rnd(11)
    const sky = ctx.createLinearGradient(0, 0, 0, ground); sky.addColorStop(0, '#7c3aed'); sky.addColorStop(0.5, '#f97316'); sky.addColorStop(1, '#fde68a')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 480, ground)
    ctx.fillStyle = '#fff7ed'; ctx.beginPath(); ctx.arc(240, 150, 26, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(253,186,116,0.6)'; for (let y = 60; y < 120; y += 14) ctx.fillRect(40 + Math.floor(r() * 200), y, 60 + Math.floor(r() * 80), 3)  // 구름 줄
    // 먼 도시 실루엣 (낮게, 창문 불빛)
    let x = 0; while (x < 480) { const w = 18 + Math.floor(r() * 30), h = 14 + Math.floor(r() * 40); ctx.fillStyle = r() < 0.5 ? '#3b1a5a' : '#2e1546'; ctx.fillRect(x, ground - 26 - h, w, h + 26); ctx.fillStyle = '#fbbf24'; for (let k = 0; k < 4; k++) if (r() < 0.6) ctx.fillRect(x + 3 + Math.floor(r() * (w - 6)), ground - 24 - Math.floor(r() * h), 2, 2); x += w + 2 }
    // 물탱크
    ctx.fillStyle = '#334155'; ctx.fillRect(360, 120, 70, 70); ctx.fillStyle = '#475569'; ctx.fillRect(360, 120, 70, 6); ctx.fillStyle = '#1e293b'; for (const lx of [366, 420]) ctx.fillRect(lx, 190, 4, 40)
    // 반사판 (촬영 장비)
    ctx.fillStyle = '#9ca3af'; ctx.fillRect(70, 150, 2, 80); ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.ellipse(71, 140, 22, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.ellipse(71, 140, 22, 18, 0, -Math.PI / 2, Math.PI / 2); ctx.fill()
    // 난간
    ctx.fillStyle = '#1f2937'; ctx.fillRect(0, ground - 26, 480, 3); for (let xx = 0; xx < 480; xx += 20) ctx.fillRect(xx, ground - 26, 2, 26)
    floor(ctx, ground, '#57534e', '#44403c', '#78716c', 40)
    ctx.fillStyle = '#16a34a'; ctx.fillRect(200, ground + 10, 80, 4)   // 방수 페인트 자국
    scene.textures.addCanvas('stage_roof', c)
  }
  // FINAL: 영화제 시상식 무대 — 붉은 커튼, 스포트라이트, 트로피, 레드카펫
  {
    const [c, ctx] = cv(480, 270)
    ctx.fillStyle = '#12091c'; ctx.fillRect(0, 0, 480, ground)
    // 커튼
    for (let xx = 0; xx < 480; xx += 12) { ctx.fillStyle = (xx / 12) % 2 ? '#7f1d1d' : '#991b1b'; ctx.fillRect(xx, 0, 12, ground) }
    ctx.fillStyle = '#12091c'; ctx.beginPath(); ctx.moveTo(110, 0); ctx.quadraticCurveTo(240, 70, 370, 0); ctx.lineTo(370, ground); ctx.lineTo(110, ground); ctx.fill()   // 가운데 열린 무대
    ctx.fillStyle = '#d4af37'; ctx.fillRect(0, 0, 480, 6); for (let xx = 0; xx < 480; xx += 16) ctx.fillRect(xx + 4, 6, 6, 4)
    // 스크린 + 글자
    ctx.fillStyle = '#1e1b4b'; ctx.fillRect(150, 40, 180, 90); ctx.fillStyle = '#312e81'; ctx.fillRect(154, 44, 172, 82)
    ctx.fillStyle = '#fde68a'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ROLLING!', 240, 80); ctx.font = 'bold 10px sans-serif'; ctx.fillText('FILM AWARDS', 240, 98)
    // 스포트라이트
    for (const [sx, tx] of [[60, 200], [420, 280]]) { ctx.fillStyle = 'rgba(254,249,195,0.16)'; ctx.beginPath(); ctx.moveTo(sx - 6, 0); ctx.lineTo(tx - 50, ground); ctx.lineTo(tx + 50, ground); ctx.lineTo(sx + 6, 0); ctx.fill() }
    // 트로피 (양쪽)
    for (const tx of [130, 350]) { ctx.fillStyle = '#d4af37'; ctx.fillRect(tx - 3, ground - 62, 6, 22); ctx.beginPath(); ctx.arc(tx, ground - 66, 9, 0, Math.PI); ctx.fill(); ctx.fillRect(tx - 9, ground - 74, 18, 8); ctx.fillStyle = '#78350f'; ctx.fillRect(tx - 10, ground - 40, 20, 40); ctx.fillStyle = '#fde68a'; ctx.fillRect(tx - 6, ground - 72, 3, 6) }
    floor(ctx, ground, '#1c1917', '#292524', '#d4af37', 40)
    ctx.fillStyle = '#b91c1c'; ctx.fillRect(140, ground + 2, 200, 38); ctx.fillStyle = '#d4af37'; ctx.fillRect(140, ground + 2, 200, 1); ctx.fillRect(140, ground + 2, 1, 38); ctx.fillRect(339, ground + 2, 1, 38)  // 레드카펫
    scene.textures.addCanvas('stage_award', c)
  }
}
