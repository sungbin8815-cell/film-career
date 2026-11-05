// 진행 엔진 (DOM 없음). 화면은 setListener로 받은 함수가 그립니다.
// 흐름: 계열 → 시작 특성 → [작품 의뢰 선택 → 지도 칸 3개 + 보스 → 정산 → 레벨업·스킬 → 전직] × 10 → 엔딩
import D from '../data/index.js'
import * as St from './state.js'
import { test } from './conditions.js'
import { applyEffects, gainExp, giveItem, learnSkill, rollItem } from './effects.js'
import { startCombat, useSkill as combatUse, useBag as combatBag, flee as combatFlee } from './combat.js'
import { buildAction } from './action-core.js'
import { buildBrawl } from './brawl-core.js'
import SP from '../data/sprites.js'
import * as Save from './save.js'
import { pickOne, weightedPick, randInt, asList } from './util.js'

const C = D.config
let S = null
let listener = () => {}

export const getState = () => S
export function setListener(fn) { listener = fn }
function go(step) { S.step = step; Save.saveRun(S); listener(step, S); S.toast = null }

// ───────── 시작 ─────────
export function newGame() { S = St.newRun(); go({ type: 'class' }) }
export function resume(saved) { S = saved; listener(S.step, S) }

export function chooseClass(id) {
  const c = St.getClass(id)
  if (!c?.implemented) return
  S.cls = id
  for (const [k, v] of Object.entries(c.bonus ?? {})) S.base[k] += v
  S.job = c.startJob
  S.jobHistory.push({ job: c.startJob, level: 1, age: S.age })
  const dex = Save.loadDex()
  const pool = D.traits.filter((t) => !t.unlock || dex[t.unlock])
  const offered = []
  while (offered.length < 3 && offered.length < pool.length) {
    const t = pickOne(pool.filter((x) => !offered.includes(x.id)))
    offered.push(t.id)
  }
  go({ type: 'trait', offered })
}

export function chooseTrait(id) {
  if (S.step.type !== 'trait' || !S.step.offered.includes(id)) return
  const t = St.getTrait(id)
  S.trait = id
  applyEffects(t.effects, S)
  S.hp = St.maxHp(S); S.mp = St.maxMp(S)
  learnSkill(S, pickOne(['focus_snipe', 'tripod_stab', 'lens_bomb', 'coffee_32']))
  showOffers()
}

// ───────── 작품 의뢰 ─────────
function makeOffer(typeId) {
  const type = St.getType(typeId)
  const affixPool = D.projects.affixes.filter((a) => !a.types || a.types.includes(typeId))
  const affix = Math.random() < 0.65 ? pickOne(affixPool).id : null
  const tpl = pickOne(type.names)
  const name = tpl.replace('{t}', pickOne(D.names.titles)).replace('{b}', pickOne(D.names.brands))
  const af = St.getAffix(affix)
  const job = St.jobOf(S)
  const pay = Math.round(type.pay * (job?.payMul ?? 1) * (af?.pay ?? 1) * (1 + 0.12 * S.projectNo))
  const routes = { ...type.routes }
  for (const [k, v] of Object.entries(af?.routes ?? {})) routes[k] = (routes[k] ?? 0) + v
  return { type: typeId, affix, name, pay, routes }
}

function showOffers() {
  if (S.projectNo >= C.projectsPerRun) return endRun()
  const job = St.jobOf(S)
  const weights = Object.entries(job?.projects ?? { short: 1 })
    .filter(([id]) => (St.getType(id)?.minProject ?? 0) <= S.projectNo + 1)
  const types = []
  let guard = 0
  while (types.length < C.offersPerProject && guard++ < 50) {
    const pick = weightedPick(weights.map(([id, w]) => ({ id, weight: w })))
    if (pick && !types.includes(pick.id)) types.push(pick.id)
    if (types.length === weights.length) break
  }
  while (types.length < C.offersPerProject) {
    const extra = pickOne(D.projects.types.filter((t) => !types.includes(t.id) && (t.minProject ?? 0) <= S.projectNo + 1))
    if (!extra) break
    types.push(extra.id)
  }
  go({ type: 'offers', offers: types.map(makeOffer) })
}

export function chooseOffer(i) {
  const o = S.step.offers?.[i]
  if (!o) return
  const nodes = []
  for (let k = 0; k < C.nodesPerProject; k++) nodes.push(makeNodeChoices(k))
  S.project = { ...o, step: 0, nodes, score: 0, wins: 0, boss: pickBoss(o.type), log: [] }
  go({ type: 'map' })
}

function makeNodeChoices(k) {
  const W = C.nodeWeights
  const kinds = Object.entries(W).map(([id, w]) => ({ id, weight: id === 'elite' && S.projectNo < 1 ? 0 : w }))
  const out = []
  let guard = 0
  while (out.length < C.nodeChoices && guard++ < 30) {
    const kd = weightedPick(kinds).id
    if (out.includes(kd)) continue
    if (k === 0 && kd === 'rest') continue
    out.push(kd)
  }
  return out
}

function pickBoss(typeId) {
  const tier = St.stageTier(S)
  const pool = D.enemies.filter((e) => e.kind === 'boss' && e.tier <= tier && (!e.projects || e.projects.includes(typeId)))
  const fallback = D.enemies.filter((e) => e.kind === 'boss' && e.tier <= tier)
  return pickOne(pool.length ? pool : fallback).id
}

function pickEnemy(kind) {
  const tier = St.stageTier(S)
  const pool = D.enemies.filter((e) => e.kind === kind && e.tier <= tier)
  return weightedPick(pool.map((e) => ({ id: e.id, weight: e.tier === tier ? 3 : 1 }))).id
}

// ───────── 지도 ─────────
export function chooseNode(i) {
  const p = S.project
  if (S.step.type !== 'map' || !p) return
  if (p.step >= C.nodesPerProject) return startFight(p.boss, 'boss')
  const kind = p.nodes[p.step][i]
  if (!kind) return
  if (kind === 'fight') return startFight(pickEnemy('normal'), 'fight')
  if (kind === 'elite') return startFight(pickEnemy('elite'), 'elite')
  if (kind === 'brawl') return startFight(pickHuman(), 'brawl')
  if (kind === 'event') {
    const ev = pickEvent()
    if (ev) { S.seen[ev.id] = S.projectNo; return go({ type: 'event', id: ev.id }) }
    return startFight(pickEnemy('normal'), 'fight')
  }
  if (kind === 'shop') return go({ type: 'shop', stock: makeStock() })
  if (kind === 'rest') return go({ type: 'rest', options: makeRest() })
}

// 일반 적 = 1대다수 액션, 강적·보스 = 1대1 턴제
const isHuman = (id) => !!SP.enemies[id]?.human

function pickHuman() {
  const tier = St.stageTier(S)
  const pool = D.enemies.filter((e) => isHuman(e.id) && e.tier <= tier)
  return weightedPick(pool.map((e) => ({ id: e.id, weight: e.tier === tier ? 3 : 1 }))).id
}

function startFight(enemyId, source) {
  const e = St.getEnemy(enemyId)
  if (source === 'brawl' || (source === 'event' && isHuman(enemyId))) {
    S.brawlSetup = buildBrawl(S, enemyId)
    return go({ type: 'brawl', enemyId, source })
  }
  if (e.kind === 'normal') {
    S.actionSetup = buildAction(S, enemyId)
    return go({ type: 'action', enemyId, source })
  }
  startCombat(S, enemyId, { source })
  go({ type: 'combat' })
}

export function brawlDone(res) {
  if (S.step.type !== 'brawl') return
  const setup = S.brawlSetup
  S.hp = res.hp
  St.clampVitals(S)
  S.combat = { enemy: { id: setup.enemyId, name: setup.name, emoji: '🥊', kind: setup.kind }, result: res.result, source: S.step.source, mode: 'brawl' }
  S.brawlSetup = null
  finishCombat()
}

export function actionDone(res) {
  if (S.step.type !== 'action') return
  const setup = S.actionSetup
  S.hp = res.hp; S.mp = res.mp
  S.bag.bacchus = res.bag
  S.money += res.money ?? 0
  St.clampVitals(S)
  S.combat = { enemy: { id: setup.enemyId, name: `${setup.name} 무리`, emoji: setup.emoji, kind: 'normal' }, result: res.result, source: S.step.source, kills: res.kills, mode: 'action', total: setup.mobs.length }
  S.actionSetup = null
  finishCombat()
}

function nodeDone() {
  const p = S.project
  p.step += 1
  go({ type: 'map' })
}

// ───────── 사건 ─────────
function pickEvent() {
  const pool = D.events.filter((e) => S.seen[e.id] == null && test(e.when, S) && e.choices.some((c) => test(c.when, S)))
  if (!pool.length) return null
  const top = Math.max(...pool.map((e) => e.priority ?? 0))
  return weightedPick(pool.filter((e) => (e.priority ?? 0) === top), (e) => e.weight ?? 1)
}

export const visibleChoices = (ev) => ev.choices.map((c, i) => ({ c, i })).filter(({ c }) => test(c.when, S))

export function chooseEvent(i) {
  if (S.step.type !== 'event') return
  const ev = St.getEvent(S.step.id)
  const ch = ev.choices[i]
  if (!ch || !test(ch.when, S)) return
  let res = ch
  if (ch.results) {
    const ok = ch.results.filter((r) => test(r.when, S))
    res = weightedPick(ok.length ? ok : ch.results, (r) => r.weight ?? 1)
  }
  const notes = applyEffects(res.effects, S)
  const memo = res.memo ?? ch.memo
  if (memo) S.log.push({ age: S.age, title: ev.title, label: ch.label, memo })
  go({ type: 'event_result', id: ev.id, choice: i, text: res.text, notes, fight: res.effects?.fight ?? null })
}

// ───────── 상점·휴식 ─────────
function makeStock() {
  const tier = St.stageTier(S)
  const pool = D.items.filter((it) => it.tier <= tier && !S.inventory.includes(it.id))
  const stock = []
  while (stock.length < C.shop.items && pool.length) {
    const it = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
    stock.push(it.id)
  }
  return stock
}

export function buyItem(id) {
  if (S.step.type !== 'shop') return
  const it = St.getItem(id)
  if (!it || !S.step.stock.includes(id) || S.money < it.price) return
  S.money -= it.price
  const notes = []
  giveItem(S, id, notes)
  go({ ...S.step, stock: S.step.stock.filter((x) => x !== id), notes })
}

export function buyPotion() {
  if (S.step.type !== 'shop' || S.money < C.shop.potion.price) return
  S.money -= C.shop.potion.price
  S.bag.bacchus += 1
  go({ ...S.step, notes: [{ text: `🧃 ${C.shop.potion.name} +1 (가방 ${S.bag.bacchus})`, tone: 'good' }] })
}

// 전투 기술 편성 (기본기 외 최대 3개)
export function toggleMove(id) {
  if (!S.skills[id] || St.getSkill(id)?.basic) return
  S.moves ??= []
  if (S.moves.includes(id)) S.moves = S.moves.filter((x) => x !== id)
  else if (S.moves.length < 3) S.moves.push(id)
  Save.saveRun(S)
}

const REST_OPTIONS = [
  { id: 'eat', label: '🍱 밥 두 그릇 먹는다', desc: 'HP·MP 크게 회복', effects: {} , heal: 0.6 },
  { id: 'talk', label: '🗣️ 선배들과 수다', desc: '조금 회복 · 처세 +2 · 경험치', effects: { routes: { social: 2 }, exp: 20 }, heal: 0.25 },
  { id: 'gear', label: '🔧 장비를 손질한다', desc: '조금 회복 · 데이터 +2 · 경험치', effects: { routes: { data: 2 }, exp: 20 }, heal: 0.25 },
  { id: 'workout', label: '💪 짐 옮기기 내기', desc: '조금 회복 · 근력 +2 · 경험치', effects: { routes: { muscle: 2 }, exp: 20 }, heal: 0.25 },
  { id: 'monitor', label: '🎯 모니터 앞에서 공부', desc: '조금 회복 · 포커스 +2 · 경험치', effects: { routes: { focus: 2 }, exp: 20 }, heal: 0.25 },
  { id: 'sketch', label: '📝 몰래 시나리오 구상', desc: '조금 회복 · 작가주의 +2 · 경험치', effects: { routes: { indie: 2 }, exp: 20 }, heal: 0.25 },
  { id: 'sunset', label: '🌅 노을을 오래 본다', desc: '조금 회복 · 감각 +2 · 경험치', effects: { routes: { art: 2 }, exp: 20 }, heal: 0.25 },
]
function makeRest() {
  const others = REST_OPTIONS.slice(1).sort(() => Math.random() - 0.5).slice(0, 2)
  return ['eat', ...others.map((o) => o.id)]
}
export const restOption = (id) => REST_OPTIONS.find((o) => o.id === id)

export function chooseRest(id) {
  if (S.step.type !== 'rest' || !S.step.options.includes(id)) return
  const o = restOption(id)
  S.hp += St.maxHp(S) * o.heal
  S.mp += St.maxMp(S) * o.heal
  const notes = applyEffects(o.effects, S)
  St.clampVitals(S)
  notes.unshift({ text: '❤️ 회복', tone: 'good' })
  go({ type: 'rest_done', notes, label: o.label })
}

// ───────── 전투 ─────────
function afterTurn() {
  go({ type: 'combat', ended: !!S.combat.result })
}
export function useSkill(id) {
  if (S.step.type !== 'combat' || S.combat.result) return
  combatUse(S, id); afterTurn()
}
export function useBag() {
  if (S.step.type !== 'combat' || S.combat.result) return
  combatBag(S); afterTurn()
}
export function flee() {
  if (S.step.type !== 'combat' || S.combat.result) return
  combatFlee(S); afterTurn()
}
// 화면이 마지막 메시지까지 보여준 뒤 호출
export function combatFinish() {
  if (S.step.type === 'combat' && S.combat?.result) finishCombat()
}

function finishCombat() {
  const cb = S.combat
  const p = S.project
  const e = St.getEnemy(cb.enemy.id)
  const af = St.getAffix(p?.affix)
  const notes = []
  const scale = 1 + 0.25 * S.projectNo
  const groupMul = cb.mode === 'action' ? 0.3 * (cb.kills ?? 1) + 0.3 : cb.mode === 'brawl' && e.kind === 'boss' ? 0.65 : 1
  if (cb.result === 'flee') {
    notes.push({ text: '🏃 무사히 빠져나왔다', tone: '' })
  } else if (cb.result === 'win') {
    const exp = gainExp(S, e.exp * scale * groupMul * (af?.exp ?? 1))
    const gold = Math.round(e.gold * groupMul * (1 + 0.15 * S.projectNo))
    S.money += gold
    notes.push({ text: `📈 경험치 +${exp}`, tone: 'good' }, { text: `💰 +${gold}만`, tone: 'good' })
    const rank = cb.mode === 'brawl' ? 'elite' : e.kind
    if (p) { p.score += rank === 'boss' ? 3 : rank === 'elite' ? 2 : 1; p.wins += 1 }
    const drop = rank === 'boss' ? (Math.random() < 0.5 ? 'epic' : 'rare') : rank === 'elite' ? 'rare' : Math.random() < 0.15 ? 'common' : null
    if (drop) { const id = rollItem(S, drop); if (id) giveItem(S, id, notes) }
    // 이긴 방식도 성향으로 쌓임: 마지막에 쓴 스킬 속성
  } else {
    S.hp = Math.round(St.maxHp(S) * C.combat.lose.hp)
    const lost = Math.round(Math.max(0, S.money) * C.combat.lose.moneyPct)
    S.money -= lost
    if (p) p.score -= e.kind === 'boss' && cb.mode !== 'brawl' ? 2 : 1
    notes.push({ text: '🩹 촬영 지연… 그래도 현장은 계속된다', tone: 'bad' }, { text: `💰 -${lost}만`, tone: 'bad' })
  }
  S.combat.done = true
  go({ type: 'combat_end', result: cb.result, enemy: cb.enemy, notes, source: cb.source })
}

// ───────── 진행 이어가기 (레벨업 → 전직 → 다음) ─────────
export function proceed() {
  const t = S.step.type
  if (t === 'event_result' && S.step.fight) return startFight(S.step.fight, 'event')
  if (t === 'combat_end' && S.step.source === 'boss') return finishProject()
  if (t === 'result') return flush('offers')
  if (['event_result', 'combat_end', 'rest_done', 'shop'].includes(t)) return flush('node')
  if (t === 'levelup_done' || t === 'jobchange_done') return flush(S.step.cont)
}

function flush(cont) {
  if (S.pendingLevels > 0) return levelUp(cont)
  const jc = jobChangeCandidates()
  if (jc) return go({ type: 'jobchange', cont, ...jc })
  S.combat = null
  if (cont === 'node') return nodeDone()
  if (cont === 'offers') return showOffers()
}

function levelUp(cont) {
  S.pendingLevels -= 1
  const job = St.jobOf(S)
  const gains = { ...(job?.growth ?? {}) }
  for (const [k, v] of Object.entries(gains)) S.base[k] += v
  S.hp += St.maxHp(S) * C.levelUpHeal
  S.mp += St.maxMp(S) * C.levelUpHeal
  St.clampVitals(S)
  const lv = S.level - S.pendingLevels
  go({ type: 'levelup', cont, level: lv, gains, choices: skillChoices() })
}

function skillAllowed(sk) {
  if (sk.basic) return false
  if ((S.skills[sk.id] ?? 0) >= 3) return false
  const r = sk.req ?? {}
  if (r.level && S.level < r.level) return false
  if (r.tierMin && St.tierOf(S) < r.tierMin) return false
  if (r.jobs && !r.jobs.includes(S.job)) return false
  if (r.routes && !test({ routes: r.routes }, S)) return false
  return true
}

function skillChoices() {
  const pool = D.skills.filter(skillAllowed)
  const top = St.topRoutes(S, 2).map((r) => r.id)
  const picks = []
  while (picks.length < C.skillChoices && picks.length < pool.length) {
    const p = weightedPick(pool.filter((x) => !picks.includes(x.id)), (x) =>
      (x.req?.jobs ? 4 : 1) * (S.skills[x.id] ? 1.2 : 2) * (top.includes(x.route) ? 1.5 : 1))
    picks.push(p.id)
  }
  return picks
}

export function chooseSkill(id) {
  if (S.step.type !== 'levelup') return
  const notes = []
  if (id === '__stat') {
    const k = pickOne(['str', 'tec', 'sen', 'cha'])
    S.base[k] += 2
    notes.push({ text: `${St.STAT_ICONS[k]} ${St.STAT_NAMES[k]} +2`, tone: 'good' })
  } else {
    if (!S.step.choices.includes(id)) return
    learnSkill(S, id, notes)
    const r = St.getRoute(St.getSkill(id).route)
    notes.push({ text: `${r.icon} ${r.name} +2`, tone: 'route' })
  }
  S.toast = notes
  flush(S.step.cont)
}

// 전직
function jobScore(j) {
  return Object.entries(j.affinity ?? {}).reduce((a, [k, w]) => a + (S.routes[k] ?? 0) * w, 0)
}

export function jobChangeCandidates() {
  const cur = St.jobOf(S)
  const next = cur.tier + 1
  const need = C.jobTierLevels[next]
  if (!need || S.level < need) return null
  const fromOk = (j) => j.from === 'any' || asList(j.from).includes(cur.id)
  const all = D.jobs.filter((j) => j.tier === next && fromOk(j))
  const open = all.filter((j) => test(j.when, S)).sort((a, b) => jobScore(b) - jobScore(a))
  const locked = all.filter((j) => !test(j.when, S)).sort((a, b) => jobScore(b) - jobScore(a))
  if (!open.length) return null
  return { open: open.slice(0, 4).map((j) => j.id), locked: locked.slice(0, 3).map((j) => j.id), tier: next }
}

export function chooseJob(id) {
  if (S.step.type !== 'jobchange' || !S.step.open.includes(id)) return
  const prev = St.jobOf(S)
  S.job = id
  S.jobHistory.push({ job: id, level: S.level, age: S.age })
  const j = St.jobOf(S)
  S.log.push({ age: S.age, title: `Lv${S.level} 전직`, label: `${prev.name} → ${j.name}`, memo: null, job: true })
  S.hp = St.maxHp(S); S.mp = St.maxMp(S)
  go({ type: 'jobchange_done', cont: S.step.cont, job: id })
}

// ───────── 정산 ─────────
function finishProject() {
  const p = S.project
  const type = St.getType(p.type)
  const af = St.getAffix(p.affix)
  const grade = C.grades.find((g) => p.score >= g.min)
  const pay = Math.round(p.pay * grade.mul)
  const fame = Math.round(type.fame * grade.mul * (af?.fame ?? 1))
  const expGain = gainExp(S, (40 + 18 * S.projectNo) * grade.mul * (af?.exp ?? 1))
  S.money += pay
  S.fame += fame
  const notes = applyEffects({ routes: p.routes, flags: af?.flags }, S)
  S.film.push({ age: S.age, title: p.name, grade: grade.id, job: St.jobOf(S).name })
  S.projectNo += 1
  S.age += C.yearsPerProject
  S.hp = St.maxHp(S); S.mp = St.maxMp(S)
  const result = { name: p.name, grade: grade.id, pay, fame, exp: expGain, notes, score: p.score }
  S.project = null
  S.combat = null
  go({ type: 'result', result })
}

// ───────── 엔딩 ─────────
function endRun() {
  const job = St.jobOf(S)
  const final = job.tier === 4
  const { isNew } = final ? Save.recordEnding(job.id, S.age) : { isNew: false }
  Save.clearRun()
  S.step = {
    type: 'ending', job: job.id, final, isNew,
    routes: St.topRoutes(S, 3),
    memos: S.log.filter((l) => l.memo).slice(-6).slice(0, 3),
  }
  listener(S.step, S)
}

// 디버그·시뮬레이터용
export const _internal = { jobScore }
export const debugFight = (enemyId, source = 'fight') => startFight(enemyId, source)
