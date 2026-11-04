// 화면 렌더링. 엔진의 step 하나 = 화면 하나.
import D from '../data/index.js'
import * as E from './engine.js'
import * as St from './state.js'
import { chanceOf, TIER_LABEL } from './check.js'
import { dexEntries, dexId } from './endings.js'
import * as Save from './save.js'
import { runMinigame } from './minigames/registry.js'
import { h, art } from './dom.js'

const C = D.config
let app

export function mount(root) {
  app = root
  E.setListener((step, s) => render(step, s))
}

function screen(...children) {
  app.replaceChildren(...children)
  window.scrollTo(0, 0)
  const main = app.querySelector('h2, h1')
  if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }) }
}

const btn = (label, onclick, cls = '') => h('button', { class: `btn ${cls}`, onclick }, label)
const changesView = (changes) => (changes?.length
  ? h('div', { class: 'chips' }, changes.map((c) => h('span', { class: `chip ${c.good === true ? 'good' : c.good === false ? 'bad' : ''}` }, c.text)))
  : null)
const checkView = (r) => r && h('p', { class: 'check-line' }, `🎲 ${r.parts.join(' + ')} → 성공률 ${r.p}% · 굴림 ${r.roll}`)

// ───────── HUD ─────────
function hud(s) {
  const rank = St.getRank(s)
  const track = St.getTrack(s.track)
  const where = s.phase === 'career'
    ? `${track?.emoji ?? ''} ${track?.name ?? ''} · ${rank?.name ?? ''}`
    : s.school ? `🎓 ${St.getSchool(s.school)?.name}` : '진로 고민 중'
  const statChip = (d) => {
    const v = St.stat(s, d.id)
    const low = (d.id === 'stamina' || d.id === 'mental') && v <= 3
    const neg = d.id === 'money' && v < 0
    return h('div', { class: `stat ${low || neg ? 'warn' : ''}`, title: d.name },
      h('span', { class: 'stat-icon' }, d.icon), h('span', { class: 'stat-name' }, d.name),
      h('b', {}, d.id === 'money' ? `${v.toLocaleString()}` : v))
  }
  return h('header', { class: 'hud' },
    h('div', { class: 'hud-top' },
      h('span', {}, `${s.age}살`),
      h('span', { class: 'hud-where' }, where),
      s.phase === 'career' ? h('span', {}, `${C.favor.icon}${St.stat(s, 'favor')}`) : null),
    h('div', { class: 'stats' }, C.stats.map(statChip)),
    s.phase === 'career' && s.debtStreak > 0
      ? h('div', { class: 'hud-alert' }, `⚠️ 통장 마이너스 ${s.debtStreak}회 연속`) : null)
}

// ───────── 화면별 ─────────
const VIEWS = {
  title: () => {
    const saved = Save.loadRun()
    const dex = Save.loadDex()
    const total = dexEntries().length
    const got = dexEntries().filter((e) => dex[e.id]).length
    screen(h('main', { class: 'title-screen' },
      art('title', 'art-hero'),
      h('h1', {}, C.title),
      h('p', { class: 'sub' }, C.subtitle),
      h('div', { class: 'stack' },
        saved ? btn('▶ 이어하기', () => E.resume(saved), 'primary') : null,
        btn(saved ? '새로 시작 (기존 판 삭제)' : '▶ 새로 시작', () => {
          if (saved && !confirm('진행 중인 판이 사라집니다. 새로 시작할까요?')) return
          E.newGame()
        }, saved ? '' : 'primary'),
        btn(`📖 엔딩 도감 (${got}/${total})`, () => VIEWS.dex())),
      h('p', { class: 'foot' }, '프로토타입 · 촬영 계열만 플레이 가능')))
  },

  dex: () => {
    const dex = Save.loadDex()
    screen(h('main', {},
      h('h2', {}, '📖 엔딩 도감'),
      h('div', { class: 'dex' }, dexEntries().map((e) => {
        const got = dex[e.id]
        return h('div', { class: `dex-card ${got ? '' : 'locked'}` },
          h('div', { class: 'dex-emoji' }, got ? e.emoji : '❔'),
          h('b', {}, got ? e.title : '???'),
          h('small', {}, got ? `${got.count}회 · 첫 달성 ${got.firstAge}살` : `힌트: ${e.hint ?? '???'}`))
      })),
      btn('← 처음으로', () => VIEWS.title())))
  },

  roll: (step, s) => {
    screen(h('main', {},
      h('h2', {}, '🎲 타고난 능력치'),
      h('p', {}, '열아홉, 영화를 업으로 삼기로 했다. 당신은 어떤 사람인가?'),
      h('div', { class: 'roll-grid' }, C.stats.map((d) => h('div', { class: 'roll-stat' },
        h('span', {}, `${d.icon} ${d.name}`), h('b', {}, d.id === 'money' ? `${St.stat(s, d.id)}만` : St.stat(s, d.id))))),
      h('div', { class: 'stack' },
        btn('이대로 시작', () => E.acceptStats(), 'primary'),
        h('button', { class: 'btn', disabled: !s.rerollsLeft, onclick: () => E.reroll() }, `다시 굴리기 (${s.rerollsLeft}회 남음)`))))
  },

  school: (step, s) => {
    screen(hud(s), h('main', {},
      h('h2', {}, '진로 선택'),
      h('p', {}, '어디서 시작할까? 학과는 "영상 관련 학과"로 통합.'),
      h('div', { class: 'stack' }, D.schools.map((sc) => {
        const blocked = E.schoolBlocked(sc.id)
        return h('button', { class: 'card', disabled: blocked, onclick: () => E.chooseSchool(sc.id) },
          h('b', {}, `${sc.emoji} ${sc.name}`),
          h('span', {}, blocked ? '이미 떨어졌다.' : sc.desc),
          sc.entrance && !blocked ? h('small', {}, `입시 판정 · 성공률 ${chanceOf(sc.entrance.check, s).p}%`) : null)
      }))))
  },

  major: (step, s) => {
    const sc = St.getSchool(s.school)
    screen(hud(s), h('main', {},
      h('h2', {}, sc.years ? '전공 분야' : '관심 분야'),
      h('p', {}, '분야마다 오르는 능력치가 다르다.'),
      h('div', { class: 'stack' }, D.majors.map((m) => {
        const car = St.getCareer(m.career)
        const bonus = Object.entries(m.effects?.stats ?? {}).map(([id, v]) => `${St.statDef(id).name}+${v}`).join(' ')
        return h('button', { class: 'card', onclick: () => E.chooseMajor(m.id) },
          h('b', {}, `${m.emoji} ${m.name}`, car?.implemented ? null : h('em', { class: 'tag' }, '커리어 준비 중')),
          h('span', {}, m.desc), h('small', {}, bonus))
      }))))
  },

  notice: (step, s) => {
    screen(s.phase === 'roll' ? null : hud(s), h('main', {},
      step.image ? art(step.image, 'art-scene') : null,
      h('h2', {}, step.title),
      h('p', { class: 'story' }, step.text),
      checkView(step.check),
      changesView(step.changes),
      btn('계속', () => E.proceed(), 'primary')))
  },

  track: (step, s) => {
    screen(hud(s), h('main', {},
      h('h2', {}, '어느 현장으로 갈까?'),
      h('p', {}, '학교를 마쳤다. 우열은 없다. 장단점만 다를 뿐.'),
      h('div', { class: 'stack' }, D.tracks.map((t) => h('button', { class: 'card', onclick: () => E.chooseTrack(t.id) },
        h('b', {}, `${t.emoji} ${t.name}`),
        h('span', { class: 'pro' }, `＋ ${t.pros}`),
        h('span', { class: 'con' }, `－ ${t.cons}`))))))
  },

  project: (step, s) => {
    const p = step.project
    const rank = St.getRank(s)
    screen(hud(s), h('main', {},
      art(rank.image, 'art-scene'),
      h('h2', {}, `🎬 ${p.name}`),
      h('div', { class: 'panel' },
        h('p', {}, `직급: ${rank.name}`),
        h('p', {}, `일정: ${p.days}회차 (1회차 = 12시간)`),
        h('p', {}, `페이: 회차당 ${p.payPerDay}만 원`),
        h('p', { class: 'muted' }, `할 일: ${rank.duties}`)),
      btn('촬영 들어간다', () => E.startShoot(), 'primary')))
  },

  event: (step, s) => {
    const ev = St.getEvent(step.id)
    screen(hud(s), h('main', {},
      art(ev.image ?? 'set_day', 'art-scene'),
      h('h2', {}, ev.title),
      h('p', { class: 'story' }, ev.text),
      h('div', { class: 'stack' }, ev.choices.map((ch, i) => {
        const ok = E.choiceAvailable(ch)
        if (!ok && !ch.lockedLabel) return null
        let hint = null
        if (ch.check) {
          const { p } = chanceOf(ch.check, s)
          const names = Object.keys(ch.check.stats ?? {}).map((id) => St.statDef(id)?.name ?? id).join('·')
          hint = `🎲 ${names} 판정 · 성공률 ${p}%`
        } else if (ch.minigame) hint = '⚔️ 미니게임'
        return h('button', { class: 'btn choice', disabled: !ok, onclick: () => E.choose(i) },
          h('span', {}, ok ? ch.label : ch.lockedLabel), hint ? h('small', {}, hint) : null)
      }))))
  },

  outcome: (step, s) => {
    const ev = St.getEvent(step.id)
    const tier = step.check?.tier ?? step.minigame?.outcome
    screen(hud(s), h('main', {},
      h('h2', {}, ev.title),
      h('p', { class: 'muted' }, `▶ ${ev.choices[step.choice].label}`),
      tier ? h('div', { class: `tier tier-${tier}` }, TIER_LABEL[tier] ?? tier) : null,
      checkView(step.check),
      step.minigame?.summary ? h('p', { class: 'check-line' }, `⚔️ ${step.minigame.summary}`) : null,
      h('p', { class: 'story' }, step.text),
      changesView(step.changes),
      btn('계속', () => E.proceed(), 'primary')))
  },

  minigame: (step, s) => {
    const ev = St.getEvent(step.id)
    const mg = ev.choices[step.choice].minigame
    const root = h('div', { class: 'mg-root' })
    screen(h('main', { class: 'mg' }, h('h2', { class: 'sr-only' }, '미니게임'), root))
    const rank = St.getRank(s)
    const ctx = {
      stat: (id) => St.stat(s, id),
      career: s.career,
      duelMoves: St.getCareer(s.career)?.duelMoves,
      rankName: rank?.name ?? '학생',
      playerImage: rank?.image ?? 'player_student',
      art,
    }
    runMinigame(mg.id, root, mg.params, ctx).then((res) => E.minigameDone(res))
  },

  settle: (step, s) => {
    const r = step.report
    screen(hud(s), h('main', {},
      h('h2', {}, '📋 정산'),
      h('p', { class: 'muted' }, `${r.name} 촬영 종료`),
      h('div', { class: 'panel' }, r.lines.map((l) => h('div', { class: 'row' },
        h('span', {}, l.label), h('b', { class: l.good ? 'good' : 'bad' }, l.value)))),
      r.birthday ? h('p', { class: 'note' }, `🎂 해가 바뀌었다. ${r.birthday}살.`) : null,
      r.promoted ? h('div', { class: 'tier tier-great' }, `🎉 ${r.promoted} 승진!`) : null,
      r.debtWarn ? h('p', { class: 'note bad' }, `⚠️ 통장 마이너스 ${r.debtWarn}회 연속. 계속되면 업계를 떠나야 한다.`) : null,
      btn('계속', () => E.afterSettle(), 'primary')))
  },

  menu: (step, s) => {
    const tired = St.stat(s, 'stamina') <= 4 || St.stat(s, 'mental') <= 4
    screen(hud(s), h('main', {},
      h('h2', {}, '다음 작품은?'),
      h('p', {}, `현장 ${s.careerYears}년차 · 작품 ${s.projects}개 · ${St.getRank(s).name}로 ${s.rankProjects}작품째`),
      tired ? h('p', { class: 'note bad' }, '몸과 마음이 지쳐 있다. 쉬어가는 것도 방법이다.') : null,
      h('div', { class: 'stack' },
        btn('🎬 다음 작품에 들어간다', () => E.menuNext(), 'primary'),
        btn(`🛌 한 작품 쉬어간다 (체력+${C.body.rest.stamina} 멘탈+${C.body.rest.mental}, 생활비 -${St.livingCost(s)}만)`, () => E.menuRest()),
        E.canRetire() ? btn('🌅 은퇴한다 (엔딩 보기)', () => { if (confirm('커리어를 마무리하고 엔딩을 볼까요?')) E.menuRetire() }) : null)))
  },

  ending: (step, s) => {
    const e = St.getEnding(step.id)
    const sum = step.summary
    const dex = Save.loadDex()
    const got = dexEntries().filter((x) => dex[x.id]).length
    screen(h('main', { class: 'ending' },
      h('p', { class: 'muted center' }, 'ENDING'),
      art(e.image ?? 'ending_field', 'art-hero'),
      h('h1', {}, `${e.emoji} ${e.title}`),
      step.isNew ? h('div', { class: 'tier tier-great' }, '✨ 새 엔딩 해금!') : null,
      h('p', { class: 'story' }, e.text),
      h('div', { class: 'panel' },
        h('h3', {}, '커리어 요약'),
        h('div', { class: 'row' }, h('span', {}, '나이'), h('b', {}, `${sum.age}살`)),
        h('div', { class: 'row' }, h('span', {}, '현장 경력'), h('b', {}, `${sum.careerYears}년 · 작품 ${sum.projects}개`)),
        h('div', { class: 'row' }, h('span', {}, '통장 · 평판'), h('b', {}, `${sum.money.toLocaleString()}만 · ⭐${sum.rep}`)),
        sum.ranks.length ? h('div', { class: 'timeline' }, h('small', {}, '거친 직급'),
          h('p', {}, sum.ranks.map((r) => `${r.name}(${r.age})`).join(' → '))) : null,
        sum.tracks.length ? h('div', { class: 'timeline' }, h('small', {}, '거친 현장'),
          h('p', {}, sum.tracks.map((t) => `${t.name}(${t.age})`).join(' → '))) : null,
        sum.highlights.length ? h('div', { class: 'timeline' }, h('small', {}, '대표 이벤트'),
          h('ul', {}, sum.highlights.map((x) => h('li', {}, `${x.age}살 · ${x.title} — ${TIER_LABEL[x.tier] ?? ''}`)))) : null),
      h('p', { class: 'center muted' }, `도감 ${got}/${dexEntries().length}`),
      h('div', { class: 'stack' },
        btn('▶ 한 판 더', () => E.newGame(), 'primary'),
        btn('📖 엔딩 도감', () => VIEWS.dex()),
        btn('처음으로', () => VIEWS.title()))))
  },
}

export function render(step, s) {
  const v = VIEWS[step?.type]
  if (!v) return VIEWS.title()
  v(step, s)
}

export const showTitle = () => VIEWS.title()
