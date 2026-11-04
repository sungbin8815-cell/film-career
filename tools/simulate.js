// 밸런스 점검용: 무작위로 선택하는 플레이어로 N판을 돌려 엔딩 분포를 봅니다.
//   node tools/simulate.js 500
import * as E from '../js/engine.js'
import D from '../data/index.js'

const N = Number(process.argv[2] ?? 300)
const counts = {}
const stats = { projects: 0, years: 0, steps: 0, dop: 0, events: {} }
let step = null
E.setListener((s) => { step = s })

for (let n = 0; n < N; n++) {
  E.newGame()
  let guard = 0
  while (step.type !== 'ending' && guard++ < 2000) {
    const s = E.getState()
    switch (step.type) {
      case 'roll': E.acceptStats(); break
      case 'school': {
        const ok = D.schools.filter((x) => !E.schoolBlocked(x.id))
        E.chooseSchool(ok[Math.floor(Math.random() * ok.length)].id); break
      }
      case 'major': E.chooseMajor(D.majors[Math.floor(Math.random() * D.majors.length)].id); break
      case 'track': E.chooseTrack(D.tracks[Math.floor(Math.random() * D.tracks.length)].id); break
      case 'project': E.startShoot(); break
      case 'settle': E.afterSettle(); break
      case 'menu': {
        // 단순 정책: 체력·멘탈이 낮으면 쉬고, 가끔 은퇴
        if (s.stats.stamina < 4 || s.stats.mental < 3) E.menuRest()
        else if (E.canRetire() && Math.random() < 0.03) E.menuRetire()
        else E.menuNext()
        break
      }
      case 'event': {
        const ev = D.events.find((e) => e.id === step.id)
        stats.events[ev.id] = (stats.events[ev.id] ?? 0) + 1
        const opts = ev.choices.map((c, i) => i).filter((i) => E.choiceAvailable(ev.choices[i]))
        E.choose(opts[Math.floor(Math.random() * opts.length)]); break
      }
      case 'minigame': {
        const r = Math.random()
        E.minigameDone({ outcome: r < 0.5 ? 'win' : r < 0.85 ? 'lose' : 'flee' }); break
      }
      default: E.proceed()
    }
    stats.steps++
  }
  const s = E.getState()
  counts[step.id] = (counts[step.id] ?? 0) + 1
  stats.projects += s.projects
  stats.years += s.careerYears
  if (s.rankHistory.some((r) => r.rank === 'dop')) stats.dop++
}

console.log(`=== ${N}판 엔딩 분포 ===`)
for (const e of D.endings) {
  const c = counts[e.id] ?? 0
  console.log(`${String(c).padStart(5)}  ${(100 * c / N).toFixed(1).padStart(5)}%  ${e.title} (${e.id})`)
}
console.log(`평균 프로젝트 ${(stats.projects / N).toFixed(1)} · 평균 경력 ${(stats.years / N).toFixed(1)}년 · 평균 화면 수 ${(stats.steps / N).toFixed(0)} · DOP 도달 ${(100 * stats.dop / N).toFixed(1)}%`)
const unseen = D.events.filter((e) => !stats.events[e.id]).map((e) => e.id)
if (unseen.length) console.log('한 번도 안 나온 이벤트:', unseen.join(', '))
