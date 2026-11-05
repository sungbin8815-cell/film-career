// 부팅 때 코드로 그린 도트를 Phaser 텍스처·애니메이션으로 등록합니다.
// 실제 스프라이트 PNG로 바꿀 때는 이 파일에서 같은 키(예: 'dp', 'dp_alt')로 load.spritesheet 하면 됩니다.
import Phaser from 'phaser'
import { paint, paintLightStandFalling, FW, FH, type Costume } from './Painter'
import { ANIMS } from './poses'

export const COSTUMES: Record<string, Costume> = {
  // 촬영감독: 파란 캡, 남색 상의 + 주황 촬영팀 조끼
  dp: { skin: '#f3c196', hair: '#3b2414', cap: '#2563eb', top: '#1e3a8a', topDark: '#172554', vest: '#f59e0b', pants: '#374151', shoes: '#e5e7eb', accent: '#fbbf24' },
  // 같은 캐릭터 미러전용 2P 색
  dp_alt: { skin: '#e8b48a', hair: '#111827', cap: '#dc2626', top: '#7f1d1d', topDark: '#450a0a', vest: '#9ca3af', pants: '#1f2937', shoes: '#fca5a5', accent: '#f87171' },
}

export function animKey(tex: string, anim: string) { return `${tex}_${anim}` }

export function buildFighterTextures(scene: Phaser.Scene) {
  for (const [key, costume] of Object.entries(COSTUMES)) {
    const all = Object.entries(ANIMS).flatMap(([name, a]) => a.frames.map((p, i) => ({ name: `${name}_${i}`, pose: p })))
    const sheet = document.createElement('canvas')
    sheet.width = FW * all.length; sheet.height = FH
    const ctx = sheet.getContext('2d')!
    all.forEach((f, i) => ctx.drawImage(paint(costume, f.pose), i * FW, 0))
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
  scene.textures.addCanvas('lightstand', paintLightStandFalling())
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
