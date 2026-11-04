// 플레이 점검용: 무작위로 선택하는 플레이어로 N판을 돌립니다.
//   node tools/simulate.js 300
// 확인 항목: 같은 이야기 반복 여부, 판마다 이야기·선택지 차이, 조용한 시즌 비율, 엔딩·성향 분포, 한 번도 안 나온 이야기
import * as E from '../js/engine.js'
import D from '../data/index.js'
import { CONDITION_KEYS } from '../js/conditions.js'

const N = Number(process.argv[2] ?? 300)
// steady: 일 위주로 하고 직업을 잘 안 바꾸는 플레이어 / random: 완전 무작위
const POLICY = process.argv[3] ?? 'random'
const leanVals = { art: [], risk: [], people: [] }
let step = null
E.setListener((s) => { step = s })

const endings = {}
const combos = {}
const storyCount = {}
const runs = []
let repeats = 0
let quiet = 0
let seasons = 0
let errors = 0

const origWarn = console.warn
console.warn = (...a) => { errors++; if (errors < 10) origWarn(...a) }

for (let n = 0; n < N; n++) {
  E.newGame()
  const seenThisRun = []
  const choiceSets = []
  let guard = 0
  while (step.type !== 'ending' && guard++ < 3000) {
    if (step.type === 'story') {
      const st = E.storyById(step.id)
      if (!step.id.startsWith('offer:')) {
        if (seenThisRun.includes(step.id)) repeats++
        seenThisRun.push(step.id)
        storyCount[step.id] = (storyCount[step.id] ?? 0) + 1
      }
      const vis = E.visibleChoices(st)
      choiceSets.push(`${step.id}:${vis.map((v) => v.i).join(',')}`)
      let pool = vis
      if (POLICY === 'steady') {
        const changesJob = (v) => v.c.effects?.setJob && !step.id.startsWith('offer:')
        const keep = vis.filter((v) => !changesJob(v))
        if (keep.length && Math.random() < 0.85) pool = keep
        if (step.id.startsWith('offer:') && Math.random() < 0.8) pool = vis.filter((v) => v.c.id === 'accept')
      }
      const pick = pool[Math.floor(Math.random() * pool.length)]
      E.choose(pick.i)
    } else if (step.type === 'season') {
      const acts = E.availableActions()
      // 일하는 행동을 조금 더 자주 고르는 무작위 플레이어
      const weighted = acts.flatMap((a) => (a.group === 'work' ? Array(POLICY === 'steady' ? 6 : 3).fill(a) : [a]))
      seasons++
      E.chooseAction(weighted[Math.floor(Math.random() * weighted.length)].id)
    } else if (step.type === 'recap') {
      if (step.text) quiet++
      E.proceed()
    } else if (step.type === 'minigame') {
      E.minigameDone({ outcome: 'win' })
    } else E.proceed()
  }
  if (step.type !== 'ending') { console.log('끝나지 않은 판:', step); break }
  const e = step.ending
  for (const k of Object.keys(leanVals)) leanVals[k].push(E.getState().lean[k])
  endings[e.id] = (endings[e.id] ?? 0) + 1
  combos[e.combo.key] = (combos[e.combo.key] ?? 0) + 1
  runs.push({ stories: new Set(seenThisRun), choices: choiceSets, film: e.film.length, turning: e.turning.length, memoir: e.memoir.length })
}

// 판끼리 이야기 겹침 (Jaccard)
let sim = 0, pairs = 0
for (let i = 0; i < Math.min(runs.length, 60); i++) for (let j = i + 1; j < Math.min(runs.length, 60); j++) {
  const a = runs[i].stories, b = runs[j].stories
  const inter = [...a].filter((x) => b.has(x)).length
  sim += inter / (a.size + b.size - inter); pairs++
}

console.log(`=== ${N}판 (${POLICY}) ===`)
console.log(`판당 이야기 ${(runs.reduce((a, r) => a + r.stories.size, 0) / N).toFixed(1)}개 · 시즌 ${(seasons / N).toFixed(1)}개 · 조용한 시즌 ${(100 * quiet / seasons).toFixed(1)}%`)
console.log(`같은 판 안에서 반복된 이야기: ${repeats}회`)
console.log(`두 판의 이야기 겹침(평균 Jaccard): ${(100 * sim / pairs).toFixed(1)}%`)
console.log(`필모 평균 ${(runs.reduce((a, r) => a + r.film, 0) / N).toFixed(1)}줄 · 바꾼 선택 평균 ${(runs.reduce((a, r) => a + r.turning, 0) / N).toFixed(1)}개`)
console.log('\n엔딩:')
for (const e of D.endings) console.log(`  ${String(endings[e.id] ?? 0).padStart(4)}  ${e.title}`)
console.log('\n성향 조합:')
for (const [k, v] of Object.entries(D.leanings.combos)) console.log(`  ${String(combos[k] ?? 0).padStart(4)}  ${v.name} (${k})`)
const never = D.storylets.filter((s) => !s.manual && !storyCount[s.id]).map((s) => s.id)
console.log(`\n한 번도 안 나온 이야기 (${never.length}): ${never.join(', ') || '없음'}`)
console.log(`조건/효과 경고: ${errors}`)
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)] }
console.log('성향 축 중앙값:', Object.fromEntries(Object.entries(leanVals).map(([k, v]) => [k, med(v)])))
