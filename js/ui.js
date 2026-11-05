// 화면 렌더링. 엔진의 step 하나 = 화면 하나.
import D from '../data/index.js'
import * as E from './engine.js'
import * as St from './state.js'
import { keysOf } from './conditions.js'
import { skillList, previewPower } from './combat.js'
import * as Save from './save.js'
import { h } from './dom.js'

const C = D.config
let app
let last = null

export function mount(root) {
  app = root
  E.setListener((step, s) => { last = step; draw(step, s) })
}

function screen(...children) {
  app.replaceChildren(...children)
  window.scrollTo(0, 0)
  const main = app.querySelector('h2, h1')
  if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }) }
}

const btn = (label, onclick, cls = '', disabled = false) => h('button', { class: `btn ${cls}`, onclick, disabled }, label)
const chips = (notes) => (notes?.length ? h('div', { class: 'chips' }, notes.map((n) => h('span', { class: `chip ${n.tone ?? ''}` }, n.text))) : null)
const bar = (cur, max, cls) => h('div', { class: `bar ${cls}` }, h('i', { style: `width:${Math.max(0, Math.min(100, (100 * cur) / Math.max(1, max)))}%` }), h('span', {}, `${Math.max(0, Math.round(cur))}/${Math.round(max)}`))
const routeChips = (routes) => h('span', { class: 'rchips' }, Object.entries(routes ?? {}).filter(([, v]) => v).map(([k, v]) => {
  const r = St.getRoute(k); return h('em', {}, `${r.icon}${r.name} +${v}`)
}))
const RARITY = { common: '일반', rare: '희귀', epic: '영웅', legend: '전설' }
const itemLine = (it) => [
  ...Object.entries(it.stats ?? {}).map(([k, v]) => `${St.STAT_NAMES[k]}+${v}`),
  ...(it.def ? [`방어+${it.def}`] : []),
  ...Object.entries(it.boost ?? {}).map(([k, v]) => `${St.getRoute(k).icon}+${Math.round(v * 100)}%`),
].join(' · ')

// ───────── 상단 ─────────
function hud(s) {
  const job = St.jobOf(s)
  return h('header', { class: 'hud' },
    h('div', { class: 'hud-top' },
      h('b', { class: 'lv' }, `Lv${s.level}`),
      h('span', { class: 'hud-job' }, `${job?.emoji ?? ''} ${job?.name ?? ''}`),
      h('button', { class: 'hud-rec', onclick: () => sheet(s), 'aria-label': '캐릭터 정보' }, '📒')),
    h('div', { class: 'hud-bars' }, bar(s.hp, St.maxHp(s), 'hp'), bar(s.mp, St.maxMp(s), 'mp')),
    h('div', { class: 'hud-bottom' },
      h('div', { class: 'bar exp' }, h('i', { style: `width:${(100 * s.exp) / St.expToNext(s)}%` }), h('span', {}, `EXP ${s.exp}/${St.expToNext(s)}`)),
      h('span', {}, `💰${s.money.toLocaleString()}`), h('span', {}, `⭐${s.fame}`),
      h('span', { class: 'muted' }, `${s.age}살 · 작품 ${Math.min(s.projectNo + 1, C.projectsPerRun)}/${C.projectsPerRun}`)),
    s.toast?.length ? chips(s.toast) : null)
}

// ───────── 캐릭터 정보 ─────────
function sheet(s) {
  const maxR = Math.max(10, ...Object.values(s.routes))
  const swap = (id) => { const it = St.getItem(id); s.equip[it.slot] = id; St.clampVitals(s); Save.saveRun(s); sheet(s) }
  screen(hud(s), h('main', { class: 'sheet' },
    h('h2', {}, '📒 캐릭터'),
    h('section', { class: 'panel' }, h('h3', {}, '능력치'),
      h('div', { class: 'statgrid' }, ['hp', 'mp', 'str', 'tec', 'sen', 'cha'].map((k) =>
        h('div', {}, h('span', {}, `${St.STAT_ICONS[k]} ${St.STAT_NAMES[k]}`), h('b', {}, St.stat(s, k)))))),
    h('section', { class: 'panel' }, h('h3', {}, '성향 (전직 루트를 가름)'),
      D.routes.map((r) => h('div', { class: 'rrow' }, h('span', {}, `${r.icon} ${r.name}`),
        h('div', { class: 'bar route' }, h('i', { style: `width:${(100 * s.routes[r.id]) / maxR}%` }), h('span', {}, s.routes[r.id]))))),
    h('section', { class: 'panel' }, h('h3', {}, '스킬'),
      h('ul', { class: 'skl' }, skillList(s).map((k) => h('li', {}, h('b', {}, `${k.emoji} ${k.name}`), ` Lv${k.lv} · MP ${k.mp}`, h('small', {}, k.desc))))),
    h('section', { class: 'panel' }, h('h3', {}, '장비'),
      ['tool', 'gear'].map((slot) => {
        const it = St.getItem(s.equip[slot])
        return h('div', { class: 'row' }, h('span', {}, slot === 'tool' ? '🛠️ 손' : '🦺 몸'), h('b', { class: it ? `r-${it.rarity}` : '' }, it ? it.name : '없음'))
      }),
      s.inventory.filter((id) => !Object.values(s.equip).includes(id)).map((id) => {
        const it = St.getItem(id)
        return h('div', { class: 'inv' }, h('span', { class: `r-${it.rarity}` }, `${it.name}`), h('small', {}, itemLine(it)), btn('장착', () => swap(id), 'mini'))
      })),
    h('section', { class: 'panel' }, h('h3', {}, '걸어온 길'), h('p', {}, s.jobHistory.map((j) => `${St.getJob(j.job).name}(Lv${j.level})`).join(' → '))),
    s.film.length ? h('section', { class: 'panel' }, h('h3', {}, `필모그래피`), filmList(s.film)) : null,
    btn('← 돌아가기', () => draw(last, s), 'primary')))
}

function filmList(film) {
  return h('ol', { class: 'film' }, film.map((f) => h('li', {}, h('span', { class: `grade g-${f.grade}` }, f.grade), h('span', {}, h('b', {}, f.title), ` — ${f.job}`))))
}

// ───────── 화면들 ─────────
const V = {
  title: () => {
    const saved = Save.loadRun()
    const dex = Save.loadDex()
    const finals = D.jobs.filter((j) => j.tier === 4)
    screen(h('main', { class: 'title-screen' },
      h('div', { class: 'hero' }, '🎥⚔️'),
      h('h1', {}, C.title),
      h('p', { class: 'sub' }, C.subtitle),
      h('div', { class: 'stack' },
        saved ? btn('▶ 이어하기', () => E.resume(saved), 'primary') : null,
        btn(saved ? '새로 시작 (기존 판 삭제)' : '▶ 새로 시작', () => { if (saved && !confirm('진행 중인 판이 사라집니다.')) return; E.newGame() }, saved ? '' : 'primary'),
        btn(`📖 최종 직업 도감 (${finals.filter((j) => dex[j.id]).length}/${finals.length})`, () => V.dex())),
      h('p', { class: 'foot' }, '게임오버 없음 · 한 판 약 15분')))
  },

  dex: () => {
    const dex = Save.loadDex()
    const finals = D.jobs.filter((j) => j.tier === 4)
    const unlockTraits = D.traits.filter((t) => t.unlock)
    screen(h('main', {},
      h('h2', {}, '📖 최종 직업 도감'),
      h('div', { class: 'dex' }, finals.map((j) => {
        const got = dex[j.id]
        return h('div', { class: `dex-card ${got ? '' : 'locked'}` },
          h('div', { class: 'dex-emoji' }, got ? j.emoji : '❔'),
          h('b', {}, got ? j.name : '???'),
          h('small', {}, got ? `${got.count}회 · 첫 달성 ${got.firstAge}살` : `이전 직업: ${j.from === 'any' ? '아무 3차 직업' : j.from.map((f) => St.getJob(f)?.name).join(', ')}`))
      })),
      h('section', { class: 'panel' }, h('h3', {}, '엔딩으로 열리는 시작 특성'),
        h('ul', {}, unlockTraits.map((t) => h('li', {}, dex[t.unlock] ? `${t.emoji} ${t.name} — 해금됨` : `🔒 ${St.getJob(t.unlock)?.name} 엔딩을 보면 해금`)))),
      btn('← 처음으로', () => V.title())))
  },

  class: () => {
    screen(h('main', {},
      h('h2', {}, '어느 팀으로 시작할까?'),
      h('div', { class: 'stack' }, D.classes.map((c) => h('button', { class: 'card', disabled: !c.implemented, onclick: () => E.chooseClass(c.id) },
        h('b', {}, `${c.emoji} ${c.name}`, c.implemented ? null : h('em', { class: 'tag' }, '준비 중')), h('span', { class: 'muted' }, c.desc))))))
  },

  trait: (step) => {
    screen(h('main', {},
      h('h2', {}, '시작 특성을 하나 고르세요'),
      h('p', { class: 'muted' }, '판마다 다른 특성 3개가 나온다. 엔딩을 보면 새 특성이 열린다.'),
      h('div', { class: 'stack' }, step.offered.map((id) => {
        const t = St.getTrait(id)
        return h('button', { class: 'card', onclick: () => E.chooseTrait(id) },
          h('b', {}, `${t.emoji} ${t.name}`), h('span', { class: 'muted' }, t.desc), routeChips(t.effects.routes))
      }))))
  },

  offers: (step, s) => {
    screen(hud(s), h('main', {},
      h('h2', {}, `🎬 작품 ${s.projectNo + 1} — 의뢰가 들어왔다`),
      h('div', { class: 'stack' }, step.offers.map((o, i) => {
        const t = St.getType(o.type)
        const af = St.getAffix(o.affix)
        return h('button', { class: 'card offer', onclick: () => E.chooseOffer(i) },
          h('b', {}, `${t.emoji} ${o.name}`),
          h('span', { class: 'muted' }, `${t.name} · 기본 페이 ${o.pay.toLocaleString()}만`),
          af ? h('span', { class: 'affix' }, `${af.emoji} ${af.name} — ${af.desc}`) : null,
          routeChips(o.routes))
      }))))
  },

  map: (step, s) => {
    const p = s.project
    const t = St.getType(p.type)
    const af = St.getAffix(p.affix)
    const boss = St.getEnemy(p.boss)
    const atBoss = p.step >= C.nodesPerProject
    const NODE = { fight: ['⚔️', '현장 문제', '전투'], elite: ['💀', '대형 사고', '강한 전투 · 좋은 보상'], event: ['❓', '사건', '선택에 따라 루트가 갈린다'],
      shop: ['🛒', '렌탈샵', '장비 구매'], rest: ['🍱', '밥차', '회복 · 수련'] }
    const dots = [...Array(C.nodesPerProject).keys()].map((k) => h('i', { class: k < p.step ? 'done' : k === p.step ? 'cur' : '' }))
    dots.push(h('i', { class: `boss ${atBoss ? 'cur' : ''}` }, '👑'))
    screen(hud(s), h('main', {},
      h('h2', {}, `${t.emoji} ${p.name}`),
      af ? h('p', { class: 'affix' }, `${af.emoji} ${af.name} — ${af.desc}`) : null,
      h('div', { class: 'path' }, dots),
      atBoss
        ? h('div', { class: 'stack' }, h('p', {}, '크랭크업 날. 마지막 관문이 기다린다.'),
          btn(h('span', {}, `👑 ${boss.emoji} ${boss.name}`), () => E.chooseNode(0), 'primary big'))
        : h('div', { class: 'stack' }, h('p', { class: 'muted' }, '어느 쪽으로 갈까?'),
          p.nodes[p.step].map((kind, i) => { const [ic, nm, ds] = NODE[kind]; return h('button', { class: `card node n-${kind}`, onclick: () => E.chooseNode(i) }, h('b', {}, `${ic} ${nm}`), h('span', { class: 'muted' }, ds)) })),
      h('p', { class: 'muted center' }, `현재 작품 평가: ${'★'.repeat(Math.max(0, Math.min(5, p.score)))}${'☆'.repeat(Math.max(0, 5 - Math.max(0, p.score)))}`)))
  },

  combat: (step, s) => {
    const cb = s.combat
    const e = cb.enemy
    const weakIcons = e.weak.map((r) => St.getRoute(r).icon).join('')
    screen(h('main', { class: 'combat' },
      h('h2', { class: 'sr-only' }, '전투'),
      h('div', { class: `foe k-${e.kind}` },
        h('div', { class: 'foe-emoji' }, e.emoji),
        h('div', { class: 'foe-info' }, h('b', {}, `${e.kind === 'boss' ? '👑 ' : e.kind === 'elite' ? '💀 ' : ''}${e.name}`), bar(e.hp, e.max, 'foe-hp'),
          h('small', {}, `약점 ${weakIcons || '-'}${cb.charging ? ' · ⚠️ 큰 공격 준비 중' : ''}${cb.foeWeakTurns ? ' · 약화됨' : ''}`))),
      h('div', { class: 'clog', 'aria-live': 'polite' }, cb.log.slice(-4).map((l) => h('p', {}, l))),
      h('div', { class: 'me' }, h('b', {}, `${St.jobOf(s).emoji} Lv${s.level} ${St.jobOf(s).name}`), bar(s.hp, St.maxHp(s), 'hp'), bar(s.mp, St.maxMp(s), 'mp'),
        cb.dmgTurns ? h('small', {}, `🔥 피해 +${Math.round(cb.dmgBuff * 100)}% (${cb.dmgTurns}턴)`) : null, cb.guard ? h('small', {}, `🛡️ 막기 ${cb.guard}%`) : null),
      h('div', { class: 'skills' }, skillList(s).map((k) => {
        const r = St.getRoute(k.route)
        const can = s.mp >= (k.mp ?? 0)
        const hint = ['attack', 'gold', 'stun'].includes(k.type) ? `위력 ${previewPower(s, k)}${k.hits ? `×${k.hits}` : ''}` : { heal: '회복', mana: 'MP 회복', guard: '막기', buff: '강화', debuff: '약화' }[k.type]
        return h('button', { class: `btn skill ${e.weak.includes(k.route) ? 'weak' : ''}`, disabled: !can, onclick: () => E.useSkill(k.id) },
          h('span', {}, `${k.emoji} ${k.name}${k.lv > 1 ? ` ${k.lv}` : ''}`), h('small', {}, `${r.icon} ${hint} · MP${k.mp}`))
      }))))
  },

  combat_end: (step, s) => {
    const win = step.result === 'win'
    screen(hud(s), h('main', {},
      h('div', { class: `banner ${win ? 'win' : 'lose'}` }, win ? '승리!' : '촬영 지연'),
      h('h2', {}, `${step.enemy.emoji} ${step.enemy.name}`),
      chips(step.notes),
      btn(step.source === 'boss' ? '🎬 크랭크업! 정산하러' : '계속', () => E.proceed(), 'primary')))
  },

  event: (step, s) => {
    const ev = St.getEvent(step.id)
    screen(hud(s), h('main', {},
      h('div', { class: 'evicon' }, ev.emoji ?? '❓'),
      h('h2', {}, ev.title),
      h('p', { class: 'story' }, ev.text),
      h('div', { class: 'stack' }, E.visibleChoices(ev).map(({ c, i }) => {
        const keys = keysOf(c.when)
        const fx = c.effects?.fight ? ' ⚔️' : ''
        return h('button', { class: 'btn choice', onclick: () => E.chooseEvent(i) }, h('span', {}, c.label + fx),
          keys.length ? h('small', { class: 'keys' }, keys.map((k) => h('em', {}, k))) : null)
      }))))
  },

  event_result: (step, s) => {
    const ev = St.getEvent(step.id)
    screen(hud(s), h('main', {},
      h('h2', {}, ev.title),
      h('p', { class: 'muted' }, `▶ ${ev.choices[step.choice].label}`),
      h('p', { class: 'story' }, step.text),
      chips(step.notes),
      btn(step.fight ? '⚔️ 전투 시작!' : '계속', () => E.proceed(), 'primary')))
  },

  shop: (step, s) => {
    screen(hud(s), h('main', {},
      h('h2', {}, '🛒 렌탈샵'),
      h('p', { class: 'muted' }, '"좋은 장비 들어왔어. 막내 시절부터 봤으니 싸게 줄게."'),
      chips(step.notes),
      h('div', { class: 'stack' }, step.stock.map((id) => {
        const it = St.getItem(id)
        return h('button', { class: 'card', disabled: s.money < it.price, onclick: () => E.buyItem(id) },
          h('b', { class: `r-${it.rarity}` }, `${it.slot === 'tool' ? '🛠️' : '🦺'} ${it.name} [${RARITY[it.rarity]}]`),
          h('span', { class: 'muted' }, itemLine(it)), h('span', {}, `💰 ${it.price}만`))
      }),
      step.potionBought ? null : btn(`🧃 ${C.shop.potion.name} — HP·MP 전부 회복 (${C.shop.potion.price}만)`, () => E.buyPotion(), '', s.money < C.shop.potion.price),
      btn('나간다', () => E.proceed(), 'primary'))))
  },

  rest: (step, s) => {
    screen(hud(s), h('main', {},
      h('h2', {}, '🍱 밥차'),
      h('p', { class: 'muted' }, '오늘 메뉴는 제육볶음. 30분 쉴 수 있다.'),
      h('div', { class: 'stack' }, step.options.map((id) => { const o = E.restOption(id); return h('button', { class: 'card', onclick: () => E.chooseRest(id) }, h('b', {}, o.label), h('span', { class: 'muted' }, o.desc)) }))))
  },

  rest_done: (step, s) => {
    screen(hud(s), h('main', {}, h('h2', {}, step.label), chips(step.notes), btn('계속', () => E.proceed(), 'primary')))
  },

  result: (step, s) => {
    const r = step.result
    screen(hud(s), h('main', { class: 'center-col' },
      h('p', { class: 'muted' }, '크랭크업! 작품 정산'),
      h('h2', {}, r.name),
      h('div', { class: `bigrade g-${r.grade}` }, r.grade),
      h('div', { class: 'panel' },
        h('div', { class: 'row' }, h('span', {}, '💰 페이'), h('b', { class: 'good' }, `+${r.pay.toLocaleString()}만`)),
        h('div', { class: 'row' }, h('span', {}, '⭐ 명성'), h('b', { class: 'good' }, `+${r.fame}`)),
        h('div', { class: 'row' }, h('span', {}, '📈 경험치'), h('b', { class: 'good' }, `+${r.exp}`))),
      chips(r.notes),
      btn(s.projectNo >= C.projectsPerRun ? '🏁 커리어 마무리' : '다음 작품으로', () => E.proceed(), 'primary')))
  },

  levelup: (step, s) => {
    const gains = Object.entries(step.gains).filter(([, v]) => v).map(([k, v]) => ({ text: `${St.STAT_ICONS[k]} ${St.STAT_NAMES[k]} +${v}`, tone: 'good' }))
    screen(hud(s), h('main', {},
      h('div', { class: 'banner win' }, `LEVEL UP! Lv${step.level}`),
      chips(gains),
      h('h2', {}, '스킬을 하나 찍으세요'),
      h('p', { class: 'muted' }, '찍은 스킬의 성향이 쌓여 다음 전직 루트가 바뀐다.'),
      h('div', { class: 'stack' },
        step.choices.map((id) => {
          const k = St.getSkill(id)
          const r = St.getRoute(k.route)
          const lv = s.skills[id] ?? 0
          return h('button', { class: 'card', onclick: () => E.chooseSkill(id) },
            h('b', {}, `${k.emoji} ${k.name} ${lv ? `Lv${lv} → ${lv + 1}` : 'NEW'}`),
            h('span', { class: 'muted' }, k.desc), h('span', { class: 'rchips' }, h('em', {}, `${r.icon}${r.name} +2`), h('em', {}, `MP ${k.mp}`)))
        }),
        step.choices.length ? null : btn('기본기 다지기 (랜덤 능력치 +2)', () => E.chooseSkill('__stat'), 'primary'))))
  },

  jobchange: (step, s) => {
    screen(hud(s), h('main', {},
      h('div', { class: 'banner job' }, `${step.tier}차 전직`),
      h('h2', {}, '어느 길로 갈까?'),
      h('p', { class: 'muted' }, '지금까지 찍은 스킬과 고른 선택이 열어준 길이다.'),
      h('div', { class: 'stack' },
        step.open.map((id) => {
          const j = St.getJob(id)
          return h('button', { class: 'card jobcard', onclick: () => E.chooseJob(id) },
            h('b', {}, `${j.emoji} ${j.name}${j.tier === 4 ? ' ★최종' : ''}`), h('span', { class: 'muted' }, j.desc ?? (j.ending ? j.ending.slice(0, 40) + '…' : '')),
            h('span', { class: 'rchips' }, Object.keys(j.affinity ?? {}).map((k) => h('em', {}, `${St.getRoute(k).icon}${St.getRoute(k).name}`))))
        }),
        step.locked.map((id) => {
          const j = St.getJob(id)
          return h('div', { class: 'card locked' }, h('b', {}, `🔒 ${j.name}`), h('span', { class: 'muted' }, j.hint ?? '조건이 부족하다'))
        }))))
  },

  jobchange_done: (step, s) => {
    const j = St.getJob(step.job)
    screen(hud(s), h('main', { class: 'center-col' },
      h('div', { class: 'banner job' }, '전직 완료!'),
      h('div', { class: 'hero' }, j.emoji),
      h('h2', {}, j.name),
      h('p', { class: 'story' }, j.desc ?? j.ending ?? ''),
      btn('계속', () => E.proceed(), 'primary')))
  },

  ending: (step, s) => {
    const j = St.getJob(step.job)
    const dex = Save.loadDex()
    const finals = D.jobs.filter((x) => x.tier === 4)
    screen(h('main', { class: 'ending' },
      h('p', { class: 'muted center' }, `ENDING · ${s.age}살 · Lv${s.level}`),
      h('div', { class: 'hero' }, j.emoji),
      h('h1', {}, step.final ? j.name : `아직 오르는 중: ${j.name}`),
      step.isNew ? h('div', { class: 'banner win' }, '✨ 도감에 새로 등록') : null,
      h('p', { class: 'story' }, step.final ? j.ending : `최종 전직까지는 닿지 못했지만, ${j.name}(으)로 현장을 지켰다. 다음 판엔 더 멀리.`),
      h('section', { class: 'panel' }, h('h3', {}, '전직 경로'), h('p', {}, s.jobHistory.map((x) => `${St.getJob(x.job).emoji}${St.getJob(x.job).name}`).join(' → '))),
      h('section', { class: 'panel' }, h('h3', {}, '나를 만든 성향'), routeChips(Object.fromEntries(step.routes.map((r) => [r.id, r.v])))),
      step.memos.length ? h('section', { class: 'panel' }, h('h3', {}, '기억에 남은 선택'), h('ul', {}, step.memos.map((m) => h('li', {}, `${m.age}살 · ${m.memo}`)))) : null,
      h('section', { class: 'panel' }, h('h3', {}, '대표 스킬'), h('p', {}, skillList(s).filter((k) => !k.basic).sort((a, b) => b.lv - a.lv).slice(0, 4).map((k) => `${k.emoji}${k.name} Lv${k.lv}`).join(' · '))),
      h('section', { class: 'panel' }, h('h3', {}, '필모그래피'), filmList(s.film)),
      h('p', { class: 'center muted' }, `도감 ${finals.filter((x) => dex[x.id]).length}/${finals.length}`),
      h('div', { class: 'stack' }, btn('▶ 다시 시작', () => E.newGame(), 'primary'), btn('📖 도감', () => V.dex()), btn('처음으로', () => V.title()))))
  },
}

function draw(step, s) {
  const v = V[step?.type]
  if (!v) return V.title()
  v(step, s)
}

export const showTitle = () => V.title()
