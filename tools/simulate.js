// 밸런스·구조 점검: node tools/simulate.js 300 [random|smart]
//   - 직업 트리 검사: 최종이 아닌 모든 직업에 조건 없는 다음 직업이 있는지
//   - N판 자동 플레이: 레벨 진행, 최종 직업 분포, 전투 승률·턴 수, 판당 터치 수, 판끼리 루트 차이
import * as E from '../js/engine.js'
import * as St from '../js/state.js'
import { moveList } from '../js/combat.js'
import { autoResolve } from '../js/action-core.js'
import D from '../data/index.js'

const N = Number(process.argv[2] ?? 300)
const POLICY = process.argv[3] ?? 'random'
let warns = 0
const ow = console.warn
console.warn = (...a) => { warns++; if (warns < 8) ow(...a) }

// 1) 트리 검사
const problems = []
for (const j of D.jobs.filter((x) => x.tier < 4)) {
  const kids = D.jobs.filter((k) => k.tier === j.tier + 1 && (k.from === 'any' || k.from.includes(j.id)))
  const free = kids.filter((k) => !k.when || JSON.stringify(k.when).includes(`"${j.id}"`))
  if (!kids.length) problems.push(`${j.id}: 다음 직업 없음`)
  else if (!free.length) problems.push(`${j.id}: 조건 없이 갈 수 있는 다음 직업 없음 (${kids.map((k) => k.id).join(',')})`)
}
console.log(problems.length ? `트리 문제:\n  ${problems.join('\n  ')}` : '트리 검사: 모든 직업에 기본 다음 루트 있음')
const finals = D.jobs.filter((j) => j.tier === 4)
console.log(`직업 ${D.jobs.length}개 (최종 ${finals.length}개) · 스킬 ${D.skills.length} · 사건 ${D.events.length} · 적 ${D.enemies.length} · 장비 ${D.items.length}`)

// 2) 자동 플레이
let step
E.setListener((s) => { step = s })
const endCount = {}
const paths = new Set()
let actionFights = 0, actionLoss = 0, turnFights = 0
let taps = 0, fights = 0, losses = 0, turns = 0, levelSum = 0, finalSum = 0, bossLoss = 0, bosses = 0
const jobAtProject = {}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

for (let n = 0; n < N; n++) {
  E.newGame()
  let guard = 0
  while (step.type !== 'ending' && guard++ < 3000) {
    const s = E.getState()
    taps++
    switch (step.type) {
      case 'class': E.chooseClass('camera'); break
      case 'trait': E.chooseTrait(pick(step.offered)); break
      case 'offers': E.chooseOffer(Math.floor(Math.random() * step.offers.length)); break
      case 'map': {
        const p = s.project
        const opts = p.step >= D.config.nodesPerProject ? ['boss'] : p.nodes[p.step]
        let i = Math.floor(Math.random() * opts.length)
        if (POLICY === 'smart' && s.hp < St.maxHp(s) * 0.4 && opts.includes('rest')) i = opts.indexOf('rest')
        E.chooseNode(i); break
      }
      case 'action': {
        fights++; actionFights++
        const r = autoResolve(s.actionSetup)
        if (r.result === 'lose') actionLoss++
        E.actionDone(r); break
      }
      case 'combat': {
        if (step.ended) { E.combatFinish(); break }
        if (s.combat.turn === 1) { fights++; turnFights++ }
        turns++
        if (POLICY === 'smart' && s.hp < St.maxHp(s) * 0.25 && s.bag.bacchus > 0) { E.useBag(); break }
        const list = moveList(s).filter((k) => s.mp >= (k.mp ?? 0))
        let k
        if (POLICY === 'smart') {
          const hpLow = s.hp < St.maxHp(s) * 0.35
          const heal = list.find((x) => x.type === 'heal')
          const guardSk = list.find((x) => x.type === 'guard' || x.type === 'stun')
          const atk = list.filter((x) => ['attack', 'gold', 'stun'].includes(x.type)).sort((a, b) => b.power - a.power)
          k = (hpLow && heal) || (s.combat.charging && guardSk) || atk[0] || list[0]
        } else k = pick(list)
        E.useSkill(k.id); break
      }
      case 'combat_end':
        if (step.result === 'lose') losses++
        if (step.source === 'boss') { bosses++; if (step.result === 'lose') bossLoss++ }
        E.proceed(); break
      case 'event': {
        const ev = D.events.find((e) => e.id === step.id)
        const vis = E.visibleChoices(ev)
        E.chooseEvent(pick(vis).i); break
      }
      case 'shop': {
        const afford = step.stock.filter((id) => St.getItem(id).price <= s.money)
        if (afford.length && Math.random() < 0.6) E.buyItem(afford[0])
        else E.proceed()
        break
      }
      case 'rest': E.chooseRest(pick(step.options)); break
      case 'levelup': E.chooseSkill(step.choices.length ? pick(step.choices) : '__stat'); break
      case 'jobchange': E.chooseJob(POLICY === 'smart' ? step.open[0] : pick(step.open)); break
      case 'result':
        jobAtProject[s.projectNo] = (jobAtProject[s.projectNo] ?? 0) + St.tierOf(s)
        E.proceed(); break
      default: E.proceed()
    }
  }
  const s = E.getState()
  if (step.type !== 'ending') { console.log('끝나지 않은 판', step.type); break }
  levelSum += s.level
  if (step.final) finalSum++
  endCount[step.job] = (endCount[step.job] ?? 0) + 1
  paths.add(s.jobHistory.map((j) => j.job).join('>'))
}

console.log(`\n=== ${N}판 (${POLICY}) ===`)
console.log(`판당 터치 ${(taps / N).toFixed(0)}회 · 평균 최종 레벨 ${(levelSum / N).toFixed(1)} · 최종 전직 도달 ${(100 * finalSum / N).toFixed(0)}%`)
console.log(`전투 ${(fights / N).toFixed(1)}회/판 · 패배율 ${(100 * losses / fights).toFixed(1)}% · 보스 패배율 ${(100 * bossLoss / bosses).toFixed(1)}% · 전투당 ${(turns / fights).toFixed(1)}턴`)
console.log(`  액션(1대다수) ${(actionFights / N).toFixed(1)}회/판 · 패배율 ${(100 * actionLoss / Math.max(1, actionFights)).toFixed(1)}% · 턴제(1대1) ${(turnFights / N).toFixed(1)}회/판 · 턴제 전투당 ${(turns / Math.max(1, turnFights)).toFixed(1)}턴`)
console.log('작품 n개 후 평균 직업 단계:', Object.entries(jobAtProject).map(([k, v]) => `${k}:${(v / N).toFixed(1)}`).join(' '))
console.log(`서로 다른 전직 경로: ${paths.size}가지`)
console.log('\n최종 직업 분포:')
const sorted = Object.entries(endCount).sort((a, b) => b[1] - a[1])
for (const [id, c] of sorted) console.log(`  ${String(c).padStart(4)}  ${St.getJob(id)?.name}${St.getJob(id)?.tier === 4 ? '' : ' (미완)'}`)
const never = finals.filter((j) => !endCount[j.id]).map((j) => j.name)
console.log(`\n한 번도 안 나온 최종 직업: ${never.join(', ') || '없음'}`)
const evSeen = new Set()
console.log(`경고: ${warns}`)
