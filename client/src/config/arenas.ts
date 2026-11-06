// 스테이지별 떠 있는 발판 (스매시 스타일). 아래에서 뛰어 올라갈 수 있고, ↓를 잠깐 누르면 내려옴.
// 좌표: x = 발판 중심, y = 발판 윗면 높이(지면 0), w = 폭. 스테이지 폭은 core/types.ts STAGE_W(1200)
import type { Platform } from '../core/Traits'

export type PlatformLook = 'truss' | 'scaffold' | 'crane' | 'roof' | 'stage'
export interface Arena { platforms: Platform[]; look: PlatformLook }

export const ARENAS: Record<string, Arena> = {
  // 크로마키 스튜디오: 조명 트러스 두 줄 + 가운데 높은 트러스
  stage_chroma: { look: 'truss', platforms: [{ x: 300, y: 80, w: 150 }, { x: 900, y: 80, w: 150 }, { x: 600, y: 150, w: 130 }] },
  // 골목 야간 로케: 비계(아시바) 계단
  stage_alley: { look: 'scaffold', platforms: [{ x: 220, y: 70, w: 120 }, { x: 420, y: 130, w: 110 }, { x: 780, y: 130, w: 110 }, { x: 980, y: 70, w: 120 }] },
  // 사극 세트장: 크레인에 매달린 발판 (가운데 높이)
  stage_hanok: { look: 'crane', platforms: [{ x: 380, y: 95, w: 130 }, { x: 820, y: 95, w: 130 }] },
  // 노을 진 옥상: 물탱크·환풍기 위
  stage_roof: { look: 'roof', platforms: [{ x: 160, y: 60, w: 110 }, { x: 600, y: 110, w: 170 }, { x: 1040, y: 60, w: 110 }] },
  // 시상식 무대: 양쪽 단상 + 높은 조명 트러스
  stage_award: { look: 'stage', platforms: [{ x: 250, y: 50, w: 160 }, { x: 950, y: 50, w: 160 }, { x: 600, y: 140, w: 150 }] },
}

export const arenaFor = (bg: string): Arena => ARENAS[bg] ?? ARENAS.stage_chroma
