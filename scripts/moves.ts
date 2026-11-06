// 기술표 MOVES.md 만들기: npm run moves
// 수정은 client/src/config/characters.ts 에서 하고, 이 스크립트로 표를 다시 뽑습니다.
import { writeFileSync } from 'node:fs'
import { CHARACTERS, howTo } from '../client/src/config/characters'
import { TRAIT_INFO } from '../client/src/core/Traits'
import type { CharacterData, MoveData } from '../client/src/core/types'

const RANK = ['막내', '서드', '세컨드', '퍼스트', '감독']
const out: string[] = [
  '# ROLLING! 기술표',
  '',
  '> 이 파일은 `npm run moves`로 자동 생성됩니다. 바꾸고 싶은 이름·대사·수치를 적어서 알려주시거나,',
  '> `client/src/config/characters.ts`를 직접 고친 뒤 `npm run moves`를 다시 실행하세요.',
  '>',
  '> - 버튼: **A** 약공격(J) · **B** 강공격(K) · **C** 직업기(L) · **D** 특성기(I) · **R** 궁극기(U, SP 100)',
  '> - 방향 × 버튼: 중립 / → 앞 / ← 뒤 / ↑ 위 / ↓ 아래 / 공중 / 공중 ↓ / 대시 중 — 같은 버튼도 방향마다 다른 기술',
  '> - 이동: →→ 대시 · ←← 백스텝(잠깐 무적) · 공중에서 →→ 공중 대시. 방어는 상대 반대 방향(하단은 ↓까지, 공중 공격은 서서)',
  '> - 커맨드: 표의 순서대로 입력 (예: `↓ → C`, `백스텝 C`, `대시 D`). 버튼 사이 간격이 넉넉해서 천천히 눌러도 됩니다',
  '> - 캔슬 순서: A → B → C·D·커맨드 → R. 맞히면 위 단계로 이어서 낼 수 있습니다',
  '> - **원거리 제약**: 투사체·레이저·사거리 200 이상 기술은 최소 쿨타임 1.7초 + 경직 +8 (헛치면 반격당함). 망원 촬영은 가만히 서서 풀초점이 되어야 큰 한 방(×2.2), 초점이 안 맞으면 약한 견제 사격',
  '> - **무게**: 히트스톱 = 피해 × 무게. B는 무겁고 A는 가벼움, 사운드 붐대는 가장 묵직함(느린 대신 세고 멀리)',
  '> - 태그 모드(2대2): 교체(키보드 Q) · 어시스트(키보드 E)',
  '> - **발동**: 누르고 나서 판정이 나오기까지 프레임 (60프레임 = 1초) · **경직**: 끝난 뒤 못 움직이는 프레임 · **쿨**: 초 · **배움**: 스테이지 모드 직급',
  '',
]

function tags(m: MoveData) {
  const p = m.projectile
  const trait = !!m.effect && m.hitbox.w === 0 && !p
  if (trait) return ['특성 효과', m.ult ? '궁극기 연출' : ''].filter(Boolean).join(', ')
  const reach = p ? (p.atTarget ? '상대 위치' : `사거리 ~${Math.round(p.offsetX + Math.abs(p.vx) * p.life)}`) : `사거리 ${m.hitbox.x + m.hitbox.w}${m.hold ? `→${Math.round(m.hitbox.x + m.hitbox.w + m.hold.max * m.hold.reach)} (모으기)` : ''}`
  return [reach, p ? '투사체' : '', p?.pierce ? '관통' : '', m.multiHit ? '연타' : '', m.kbY || m.lastHitKbY || p?.kbY ? '띄우기' : '', m.wallBounce || p?.wallBounce ? '벽 튕김' : '', m.groundBounce ? '바닥 튕김' : '',
    m.dash ? '돌진' : '', m.lift ? '뛰어오름' : '', m.armor ? `슈퍼아머 ${m.armor}` : '', m.low ? '하단' : '', m.overhead ? '중단' : '', m.expose || p?.expose ? `노출 +${m.expose ?? p?.expose}` : '',
    m.debuff?.bleed || p?.debuff?.bleed ? '출혈' : '', m.ranged ? '원거리(연사 불가)' : '', (m.weight ?? 1) >= 1.4 ? '묵직(히트스톱 큼)' : '', m.debuff?.slow || p?.debuff?.slow ? '노화(느려짐)' : '', m.debuff?.blind || p?.debuff?.blind ? '파우더(시야)' : '', m.pull || p?.pull ? '끌어오기' : '', m.ult ? '궁극기 연출' : ''].filter(Boolean).join(', ')
}

function row(c: CharacterData, id: string) {
  const m = c.moves[id]!
  const p = m.projectile
  const trait = !!m.effect && m.hitbox.w === 0 && !p
  const dmg = trait ? '-' : m.ult ? `${m.ult.total}` : m.multiHit ? `${m.damage}×${m.multiHit.max}` : String(p ? p.damage : m.damage)
  return `| ${howTo(c, id)} | ${m.name} | ${m.voice ?? ''} | ${dmg} | ${m.startup} | ${m.recovery} | ${m.cd ? (m.cd / 60).toFixed(1) : ''} | ${m.cost ?? ''} | ${RANK[m.rank ?? 0]} | ${tags(m)} |`
}

const HEAD = ['| 입력 | 기술 | 대사 | 피해 | 발동 | 경직 | 쿨 | SP | 배움 | 특징 |', '|---|---|---|---|---|---|---|---|---|---|']
for (const c of CHARACTERS) {
  out.push(`## ${c.name} (${c.nameEn}) — ${c.dept}`, '')
  const ti = TRAIT_INFO[c.trait]
  out.push(`${c.desc}  `, `**${c.style}** · 난이도 ${'★'.repeat(c.difficulty)}${'☆'.repeat(3 - c.difficulty)}  `, `체력 ${c.hp} · 공격 ${c.stats.power} · 속도 ${c.stats.speed} · 사거리 ${c.stats.reach} · 공중 대시 ${c.airDashes}회  `,
    `직급: ${c.titles.join(' → ')}  `, `태그 어시스트: ${c.moves[c.assist ?? 'C_n']?.name ?? ''}`, '',
    `**특성 · ${ti.name} (게이지: ${ti.gauge})** — ${ti.desc}  `, `패시브: ${ti.passive}`, '')
  const cmdIds = new Set(c.commands.map((k) => k.move))
  const slots = Object.keys(c.moves).filter((id) => !cmdIds.has(id) && !id.startsWith('copy'))
  const base = slots.filter((id) => !id.includes('~'))
  const sections: [string, string[]][] = [
    ['A·B 기본기', base.filter((id) => id[0] === 'A' || id[0] === 'B')],
    ['C 직업기 · D 특성기 · R 궁극기', base.filter((id) => id[0] === 'C' || id[0] === 'D' || id === 'R')],
    ['고유 커맨드', c.commands.map((k) => k.move).filter((id) => c.moves[id])],
    ['특성 모드 변형 (렌즈·변신·배역)', slots.filter((id) => id.includes('~'))],
  ]
  for (const [title, ids] of sections) {
    if (!ids.length) continue
    out.push(`### ${title}`, '', ...HEAD, ...ids.map((id) => row(c, id)), '')
  }
}
writeFileSync(new URL('../MOVES.md', import.meta.url), out.join('\n'))
console.log('MOVES.md 작성 완료')
