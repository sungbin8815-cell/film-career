// 기술표 MOVES.md 만들기: npm run moves
// 수정은 client/src/config/characters.ts 에서 하고, 이 스크립트로 표를 다시 뽑습니다.
import { writeFileSync } from 'node:fs'
import { CHARACTERS, BTN_LABEL } from '../client/src/config/characters'
import { TRAIT_INFO } from '../client/src/core/Traits'

const RANK = ['막내', '서드', '세컨드', '퍼스트', '감독']
const INPUT: Record<string, string> = { light: '약', heavy: '강', jl: '점프 중 약', jh: '점프 중 강', special1: 'Q', special2: 'W (↓+Q)', trait: 'E', super: 'R (SP 100)',
  special1_wide: 'Q (광각)', special2_wide: 'W (광각)', special1_tele: 'Q (망원)', special2_tele: 'W (망원)' }
const out: string[] = [
  '# ROLLING! 기술표',
  '',
  '> 이 파일은 `npm run moves`로 자동 생성됩니다. 바꾸고 싶은 이름·대사·수치를 적어서 알려주시거나,',
  '> `client/src/config/characters.ts`를 직접 고친 뒤 `npm run moves`를 다시 실행하세요.',
  '>',
  '> - 조작: 약·강 기본기 + **Q·W·E 스킬(쿨타임)** + **R 필살(SP 100)**. 방어는 버튼 없이 상대 반대쪽 방향(하단은 ↓까지, 점프 공격은 서서)',
  '> - 태그 모드(2대2): 교체(키보드 Q) · 어시스트(키보드 E) — 어시스트는 캐릭터마다 정해진 기술 하나',
  '> - **발동**: 누르고 나서 공격 판정이 나오기까지 프레임 (60프레임 = 1초, 작을수록 빠름)',
  '> - **쿨**: 스킬을 다시 쓰기까지 초',
  '> - **경직**: 공격이 끝난 뒤 못 움직이는 프레임 (클수록 막혔을 때 위험)',
  '> - **배움**: 스테이지 모드에서 이 기술을 쓸 수 있게 되는 직급',
  '> - 공통 콤보 입력: 약약약 · 약약강 · 약강강 · 강강 · 약약Q · 약강Q · ↓+약 · ↓+강',
  '',
]
for (const c of CHARACTERS) {
  out.push(`## ${c.name} (${c.nameEn}) — ${c.dept}`, '')
  const ti = TRAIT_INFO[c.trait]
  out.push(`${c.desc}  `, `체력 ${c.hp} · 공격 ${c.stats.power} · 속도 ${c.stats.speed} · 사거리 ${c.stats.reach}  `, `직급: ${c.titles.join(' → ')}  `, `태그 어시스트: ${c.moves[c.assist ?? 'special1']?.name}`, '',
    `**패시브 · 고유 게이지(${ti.gauge})** — ${ti.passive}  `, `**E ${ti.name}** — ${ti.desc}`, '')
  out.push('| 입력 | 기술 | 대사 | 피해 | 발동 | 경직 | 쿨 | SP | 배움 | 특징 |', '|---|---|---|---|---|---|---|---|---|---|')
  const rows: [string, string][] = Object.keys(INPUT).map((id) => [INPUT[id], id])
  for (const k of c.combos) rows.push([k.seq.map((t) => BTN_LABEL[t]).join(' '), k.move])
  for (const [input, id] of rows) {
    const m = c.moves[id]
    if (!m) continue
    const p = m.projectile
    const hits = m.multiHit ? `${m.damage}×${m.multiHit.max}` : String(p ? p.damage : m.damage)
    const trait = !!m.effect && m.hitbox.w === 0 && !m.projectile
    const tags = trait ? '특수 효과' : [p ? '투사체' : '', m.multiHit ? '연타' : '', m.kbY || m.lastHitKbY || p?.kbY ? '띄우기/다운' : '', m.dash ? '돌진' : '', m.finisher ? '마무리 연출' : '', m.low ? '하단' : '', m.overhead ? '중단' : '', m.expose ? `노출 +${m.expose}` : '', m.hitstun >= 40 || (p?.hitstun ?? 0) >= 40 ? '긴 경직' : ''].filter(Boolean).join(', ')
    out.push(`| ${input} | ${m.name} | ${m.voice ?? ''} | ${trait ? '-' : hits} | ${m.startup} | ${m.recovery} | ${m.cd ? (m.cd / 60).toFixed(1) : ''} | ${m.cost ?? ''} | ${RANK[m.rank ?? 0]} | ${tags} |`)
  }
  out.push('')
}
writeFileSync(new URL('../MOVES.md', import.meta.url), out.join('\n'))
console.log('MOVES.md 작성 완료')
