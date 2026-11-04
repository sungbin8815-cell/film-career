// 화면 렌더링. 엔진의 step 하나 = 화면 하나. 확률·판정 수치는 어디에도 보여주지 않습니다.
import D from '../data/index.js'
import * as E from './engine.js'
import * as St from './state.js'
import { keysOf } from './conditions.js'
import { render } from './text.js'
import { comboKeys } from './memoir.js'
import * as Save from './save.js'
import { runMinigame } from './minigames/registry.js'
import { h, art } from './dom.js'

const C = D.config
let app
let lastStep = null

export function mount(root) {
  app = root
  E.setListener((step, s) => { lastStep = step; render_(step, s) })
}

function screen(...children) {
  app.replaceChildren(...children)
  window.scrollTo(0, 0)
  const main = app.querySelector('h2, h1')
  if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }) }
}

const btn = (label, onclick, cls = '') => h('button', { class: `btn ${cls}`, onclick }, label)
const notesView = (notes) => (notes?.length
  ? h('div', { class: 'chips' }, notes.map((n) => h('span', { class: `chip ${n.tone ?? ''}` }, n.text)))
  : null)
const para = (text) => h('p', { class: 'story' }, text)

// ───────── 상단 ─────────
function hud(s) {
  const job = St.jobOf(s)
  const track = St.getTrack(s.track)
  const where = s.stage === 'career'
    ? [job?.name, track ? `${track.emoji}${track.name}` : null].filter(Boolean).join(' · ')
    : s.stage === 'student' ? `🎓 ${St.getSchool(s.school)?.name ?? ''} · ${St.getField(s.field)?.name ?? ''}` : '진로 고민 중'
  return h('header', { class: 'hud' },
    h('div', { class: 'hud-top' },
      h('b', {}, `${s.age}살`),
      h('span', { class: 'hud-season' }, St.seasonLabel(s)),
      h('button', { class: 'hud-rec', onclick: () => showRecord(s), 'aria-label': '내 기록 보기' }, '📒 기록')),
    h('div', { class: 'hud-bottom' },
      h('span', { class: 'hud-where' }, where),
      h('span', { class: `hud-money ${s.money < 0 ? 'bad' : ''}` }, `💰 ${s.money.toLocaleString()}만`)))
}

// ───────── 기록 화면 (자질·경험·꼬리표·인연·필모) ─────────
function showRecord(s) {
  const traits = D.traits.map((t) => h('li', {}, h('b', {}, `${t.icon} ${t.name}`), ' ', t[St.traitBand(s, t.id)]))
  const exp = D.fields.filter((f) => s.exp[f.id] > 0)
    .map((f) => h('li', {}, `${f.emoji} ${f.name}: `, h('b', {}, St.levelName(C.expLevels, s.exp[f.id]))))
  const tags = s.tags.map((id) => St.getTag(id)).filter(Boolean)
  const npcs = D.npcs.filter((n) => s.npcs[n.id]?.met)
  screen(hud(s), h('main', { class: 'record' },
    h('h2', {}, '📒 내 기록'),
    h('section', { class: 'panel' }, h('h3', {}, '타고난 것'), h('ul', {}, traits)),
    h('section', { class: 'panel' }, h('h3', {}, '경험'), exp.length ? h('ul', {}, exp) : h('p', { class: 'muted' }, '아직 없음')),
    h('section', { class: 'panel' }, h('h3', {}, '꼬리표'),
      tags.length ? h('ul', {}, tags.map((t) => h('li', {}, h('b', {}, `🏷️ ${t.name}`), ' — ', t.desc))) : h('p', { class: 'muted' }, '아직 붙은 꼬리표가 없다.')),
    h('section', { class: 'panel' }, h('h3', {}, '인연'),
      npcs.length ? h('ul', {}, npcs.map((n) => h('li', {}, h('b', {}, `${n.emoji} ${n.name}`), ` (${n.role}) — ${St.levelName(C.bondLevels, s.npcs[n.id].bond)}`)))
        : h('p', { class: 'muted' }, '아직 아는 사람이 없다.')),
    h('section', { class: 'panel' }, h('h3', {}, `필모그래피 (${s.film.length})`), filmList(s.film)),
    btn('← 돌아가기', () => render_(lastStep, s), 'primary')))
}

function filmList(film) {
  if (!film.length) return h('p', { class: 'muted' }, '아직 한 줄도 없다.')
  return h('ol', { class: 'film' }, film.map((f) => h('li', {},
    h('span', { class: 'film-age' }, `${f.age}`),
    h('span', {}, h('b', {}, f.title), ` — ${f.role}`, f.note ? h('em', {}, ` (${f.note})`) : null))))
}

function recapView(recap) {
  if (!recap) return null
  return h('section', { class: 'panel recap' },
    h('h3', {}, '시즌 정리'),
    recap.lines.map((l) => h('div', { class: 'row' }, h('span', {}, l.label), h('b', { class: l.tone ?? '' }, l.value))),
    notesView(recap.notes),
    recap.birthday ? h('p', { class: 'note' }, `🎂 해가 바뀌었다. ${recap.birthday}살.`) : null)
}

// ───────── 화면별 ─────────
const VIEWS = {
  title: () => {
    const saved = Save.loadRun()
    const dex = Save.loadDex()
    const total = D.endings.length * comboKeys().length
    screen(h('main', { class: 'title-screen' },
      art('title', 'art-hero'),
      h('h1', {}, C.title),
      h('p', { class: 'sub' }, C.subtitle),
      h('div', { class: 'stack' },
        saved ? btn('▶ 이어하기', () => E.resume(saved), 'primary') : null,
        btn(saved ? '새 인생 시작 (기존 판 삭제)' : '▶ 새 인생 시작', () => {
          if (saved && !confirm('진행 중인 인생이 사라집니다. 새로 시작할까요?')) return
          E.newGame()
        }, saved ? '' : 'primary'),
        btn(`📖 엔딩 도감 (${Object.keys(dex).length}/${total})`, () => VIEWS.dex())),
      h('p', { class: 'foot' }, '게임오버는 없습니다. 마흔이 되면, 그게 당신의 엔딩입니다.')))
  },

  dex: () => {
    const dex = Save.loadDex()
    const keys = comboKeys()
    screen(h('main', {},
      h('h2', {}, '📖 엔딩 도감'),
      h('p', { class: 'muted' }, '최종 직업 × 성향 8가지. 같은 직업이라도 어떻게 살았는지에 따라 다른 칸이 채워집니다.'),
      h('div', { class: 'dex' }, D.endings.map((e) => {
        const got = keys.filter((k) => dex[`${e.id}|${k}`])
        return h('div', { class: `dex-card ${got.length ? '' : 'locked'}` },
          h('div', { class: 'dex-head' }, h('span', { class: 'dex-emoji' }, got.length ? e.emoji : '❔'), h('b', {}, got.length ? e.title : '???')),
          h('div', { class: 'dex-cells' }, keys.map((k) => h('i', { class: dex[`${e.id}|${k}`] ? 'on' : '', title: dex[`${e.id}|${k}`] ? D.leanings.combos[k].name : '' }))),
          h('small', {}, got.length ? got.map((k) => D.leanings.combos[k].name).join(', ') : `${got.length}/${keys.length}`))
      })),
      btn('← 처음으로', () => VIEWS.title())))
  },

  story: (step, s) => {
    const st = E.storyById(step.id)
    const vis = E.visibleChoices(st)
    screen(s.stage === 'intro' ? null : hud(s), h('main', {},
      s.stage === 'intro' ? h('p', { class: 'muted' }, `${s.age}살 · ${St.seasonLabel(s)}`) : null,
      art(st.image ?? 'set_day', 'art-scene'),
      h('h2', {}, render(st.title, s)),
      para(render(st.text, s)),
      h('div', { class: 'stack' }, vis.map(({ c, i }) => {
        const keys = keysOf(c.when, s)
        return h('button', { class: 'btn choice', onclick: () => E.choose(i) },
          h('span', {}, render(c.label, s)),
          keys.length ? h('small', { class: 'keys' }, keys.map((k) => h('em', {}, k))) : null)
      }))))
  },

  result: (step, s) => {
    const st = E.storyById(step.id)
    const ch = st.choices[step.choice]
    screen(hud(s), h('main', {},
      h('h2', {}, render(st.title, s)),
      h('p', { class: 'muted' }, `▶ ${render(ch.label, s)}`),
      para(step.text),
      notesView(step.notes),
      recapView(step.recap),
      btn('계속', () => E.proceed(), 'primary')))
  },

  season: (step, s) => {
    const acts = E.availableActions()
    screen(hud(s), h('main', {},
      h('h2', {}, `${St.seasonLabel(s)}, 무엇을 할까?`),
      h('div', { class: 'stack' }, acts.map((a) => h('button', { class: 'card', onclick: () => E.chooseAction(a.id) },
        h('b', {}, `${a.emoji ?? ''} ${a.name}`), h('span', { class: 'muted' }, a.desc ?? ''))))))
  },

  recap: (step, s) => {
    screen(hud(s), h('main', {},
      h('h2', {}, '조용한 시즌'),
      step.text ? para(step.text) : null,
      recapView(step.recap),
      btn('계속', () => E.proceed(), 'primary')))
  },

  minigame: (step, s) => {
    const st = E.storyById(step.id)
    const mg = st.choices[step.choice].minigame
    const root = h('div', { class: 'mg-root' })
    screen(h('main', {}, h('h2', { class: 'sr-only' }, '미니게임'), root))
    runMinigame(mg.id, root, mg.params, { state: s, art }).then((res) => E.minigameDone(res))
  },

  ending: (step) => {
    const e = step.ending
    const dex = Save.loadDex()
    screen(h('main', { class: 'ending' },
      h('p', { class: 'muted center' }, `ENDING · ${e.age}살`),
      art(e.image ?? 'ending_field', 'art-hero'),
      h('h1', {}, `${e.emoji} ${e.title}`),
      h('p', { class: 'center combo' }, `성향: ${e.combo.name}`),
      step.isNew ? h('div', { class: 'tier' }, '✨ 도감에 새로 기록됨') : null,
      h('section', { class: 'panel memoir' }, h('h3', {}, '회고록'), e.memoir.map((p) => para(p))),
      e.turning.length ? h('section', { class: 'panel' }, h('h3', {}, '당신을 바꾼 선택'),
        h('ol', { class: 'turning' }, e.turning.map((t) => h('li', {},
          h('b', {}, `${t.age}살 · ${t.title}`), h('div', {}, /^["“]/.test(t.label) ? t.label : `“${t.label}”`), t.after ? h('small', {}, t.after) : null)))) : null,
      e.jobs.length ? h('section', { class: 'panel' }, h('h3', {}, '걸어온 자리'),
        h('p', {}, e.jobs.map((j) => `${j.name}(${j.age})`).join(' → '))) : null,
      h('section', { class: 'panel' }, h('h3', {}, `필모그래피 (${e.film.length})`), filmList(e.film)),
      h('p', { class: 'center muted' }, `도감 ${Object.keys(dex).length}/${D.endings.length * comboKeys().length}`),
      h('div', { class: 'stack' },
        btn('▶ 다른 인생 살아보기', () => E.newGame(), 'primary'),
        btn('📖 엔딩 도감', () => VIEWS.dex()),
        btn('처음으로', () => VIEWS.title()))))
  },
}

function render_(step, s) {
  const v = VIEWS[step?.type]
  if (!v) return VIEWS.title()
  v(step, s)
}

export const showTitle = () => VIEWS.title()
