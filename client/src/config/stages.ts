// 스테이지 모드: 부서를 골라 막내로 시작 → 스테이지를 깰 때마다 승진.
// 막내(0) → 서드(1) → 세컨드(2) → 퍼스트(3) → 감독(4) → 마지막 무대에서 '전설의 감독'과 대결.
import type { Difficulty } from '../core/AI'
import { CHARACTERS, getCharacter } from './characters'

export interface StageDef {
  name: string
  place: string
  bg: string
  difficulty: Difficulty
  /** 상대 직급 (보스면 감독 + 강화) */
  oppRank: number
  boss?: boolean
  /** 시작 전 한 줄 (상대 대사) */
  taunt: string
}

export const STAGES: StageDef[] = [
  { name: 'STAGE 1', place: '크로마키 스튜디오', bg: 'stage_chroma', difficulty: 'easy', oppRank: 0, taunt: '막내가 장비를 그렇게 들어? 한판 붙자!' },
  { name: 'STAGE 2', place: '골목 야간 로케', bg: 'stage_alley', difficulty: 'easy', oppRank: 1, taunt: '해 뜨기 전에 찍어야 돼. 비켜!' },
  { name: 'STAGE 3', place: '사극 세트장', bg: 'stage_hanok', difficulty: 'normal', oppRank: 2, taunt: '이 세트, 내가 먼저 맡았어.' },
  { name: 'STAGE 4', place: '노을 진 옥상', bg: 'stage_roof', difficulty: 'normal', oppRank: 3, taunt: '매직아워는 20분뿐이다. 덤벼!' },
  { name: 'FINAL', place: '영화제 시상식 무대', bg: 'stage_award', difficulty: 'hard', oppRank: 4, boss: true, taunt: '트로피는 하나뿐이다. 증명해 봐라.' },
]

/** 승진할 때 체력·공격력 보너스 (스테이지 모드) */
export const BOSS_MUL = { hp: 1.2, dmg: 1.1 }

/** 이 캐릭터로 스테이지 모드를 할 때 상대 순서 (보스는 같은 부서의 전설) */
export function opponentFor(playerId: string, stage: number): string {
  if (STAGES[stage]?.boss) return playerId
  const others = CHARACTERS.filter((c) => c.id !== playerId).map((c) => c.id)
  // 캐릭터마다 다른 순서가 되도록 시작 위치를 밀어줌
  const shift = CHARACTERS.findIndex((c) => c.id === playerId)
  return others[(stage + shift) % others.length]
}

export function titleOf(charId: string, rank: number, boss = false) {
  const c = getCharacter(charId)
  return boss ? `전설의 ${c.titles[4]}` : `${c.dept} ${c.titles[Math.min(4, rank)]}`
}

// ───── 저장 (브라우저 localStorage) ─────
export interface StageSave { stage: number; cleared: boolean }
const KEY = 'rolling.stage.v1'

export function loadProgress(): Record<string, StageSave> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, StageSave> } catch { return {} }
}
export function saveProgress(charId: string, s: StageSave) {
  const all = loadProgress()
  all[charId] = s
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* 저장 불가(사생활 보호 모드 등) */ }
}
