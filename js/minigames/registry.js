// 미니게임 공통 인터페이스
//
//   register(id, { title, run(root, params, ctx) })
//     root   : 미니게임이 마음대로 그려도 되는 DOM 요소
//     params : 이벤트 데이터의 minigame.params (예: { enemy: 'actor' })
//     ctx    : { stat(id), career, rankName, art(key) }  — 본 게임 정보 읽기 전용
//     반환   : Promise<{ outcome: 'win' | 'lose' | 'flee' | (임의 문자열), summary?: string }>
//
// 엔진은 outcome에 맞는 이벤트 데이터의 minigame.results[outcome]을 적용합니다.
// 새 미니게임(리듬게임, 퍼즐 등)은 이 폴더에 파일을 만들고 register만 하면 됩니다.

const games = new Map()

export function register(id, game) {
  games.set(id, game)
}

export function getMinigame(id) {
  return games.get(id) ?? null
}

export async function runMinigame(id, root, params, ctx) {
  const g = games.get(id)
  if (!g) {
    console.warn('[미니게임] 등록되지 않음:', id)
    return { outcome: 'flee', summary: '미니게임을 불러오지 못했다.' }
  }
  return g.run(root, params ?? {}, ctx)
}
