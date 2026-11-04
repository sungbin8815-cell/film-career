// 게임 진행 엔진. DOM을 모릅니다 — 화면은 setListener로 받은 함수가 그립니다.
// 상태 S.step이 "지금 보여줄 화면"이고, 바뀔 때마다 저장됩니다(이어하기).
import D from '../data/index.js'
import * as St from './state.js'
import { test } from './conditions.js'
import { rollCheck } from './check.js'
import { applyEffects } from './effects.js'
import { findInstantEnding, findFinalEnding, buildSummary, dexId } from './endings.js'
import * as Save from './save.js'
import { randInt, rnd, pickOne, weightedPick, round1 } from './util.js'

const C = D.config
let S = null
let listener = () => {}

export const getState = () => S
export function setListener(fn) {
  listener = fn
}

function go(step) {
  S.step = step
  Save.saveRun(S)
  listener(step, S)
}

// ───────── 시작 ─────────
export function newGame() {
  S = St.newRun()
  St.rollStats(S)
  go({ type: 'roll' })
}

export function resume(saved) {
  S = saved
  listener(S.step, S)
}

export function reroll() {
  if (S.rerollsLeft <= 0) return
  S.rerollsLeft -= 1
  St.rollStats(S)
  go({ type: 'roll' })
}

export function acceptStats() {
  S.phase = 'school'
  go({ type: 'school' })
}

// ───────── 학생 단계 ─────────
export const schoolBlocked = (id) => St.hasFlag(S, `entrance_fail_${id}`)

export function chooseSchool(id) {
  const sc = St.getSchool(id)
  if (!sc || schoolBlocked(id)) return
  if (sc.entrance) {
    const r = rollCheck(sc.entrance.check, S)
    if (r.tier === 'fail') {
      St.addFlag(S, `entrance_fail_${id}`)
      return go({ type: 'notice', title: `${sc.name} 입시`, text: sc.entrance.failText, check: r, image: 'classroom', next: 'school' })
    }
    S.school = id
    const changes = applyEffects(sc.effects, S)
    return go({ type: 'notice', title: `${sc.name} 입시`, text: sc.entrance.passText, check: r, changes, image: 'classroom', next: 'major' })
  }
  S.school = id
  const changes = applyEffects(sc.effects, S)
  go({ type: 'notice', title: sc.name, text: sc.desc, changes, image: sc.years ? 'classroom' : 'home', next: 'major' })
}

export function chooseMajor(id) {
  const m = St.getMajor(id)
  const sc = St.getSchool(S.school)
  S.major = id
  const changes = applyEffects(m.effects, S)
  const car = St.getCareer(m.career)
  let text = `${m.name}에 관심을 두고 공부를 시작했다.`
  if (car?.implemented) S.career = car.id
  else {
    S.career = C.defaultCareer
    text += `\n\n※ ${car?.name ?? m.name} 계열 커리어는 아직 준비 중이라, 이번 판은 ${St.getCareer(C.defaultCareer).name} 계열로 진행합니다.`
  }
  S.phase = 'student'
  S.student = { total: sc.studentEvents, done: 0, aged: 0 }
  go({ type: 'notice', title: `${m.emoji} ${m.name}`, text, changes, image: 'player_student', next: 'student' })
}

function nextStudent() {
  const sc = St.getSchool(S.school)
  const st = S.student
  if (st.done < st.total) {
    const ev = pickEvent('student')
    if (ev) {
      st.done += 1
      // 학교 연한을 이벤트 수로 나눠 나이를 올림
      const target = Math.floor((sc.years * st.done) / (st.total + 1))
      while (st.aged < target) { S.age += 1; st.aged += 1 }
      return go({ type: 'event', id: ev.id, after: 'student' })
    }
  }
  finishStudent()
}

function finishStudent() {
  const sc = St.getSchool(S.school)
  while (S.student.aged < sc.years) { S.age += 1; S.student.aged += 1 }
  if (sc.fixedTrack) return beginCareer(sc.fixedTrack)
  S.phase = 'track'
  go({ type: 'track' })
}

export function chooseTrack(id) {
  if (S.phase !== 'track') return
  beginCareer(id)
}

function beginCareer(trackId) {
  S.phase = 'career'
  St.setTrack(S, trackId)
  const car = St.getCareer(S.career)
  St.setRank(S, car.ranks[0].id)
  const r = St.getRank(S)
  const t = St.getTrack(trackId)
  go({
    type: 'notice', title: '첫 현장', image: r.image,
    text: `${S.age}살, ${t.name} 현장에 ${car.name}팀 ${r.name}(으)로 들어갔다.\n주 업무: ${r.duties}`,
    next: 'project',
  })
}

// ───────── 커리어 루프 ─────────
function makeProject() {
  const t = St.getTrack(S.track)
  const r = St.getRank(S)
  const tpl = pickOne(t.projectNames)
  const name = tpl.replace('{t}', pickOne(D.names.titles)).replace('{b}', pickOne(D.names.brands))
  const days = randInt(t.days[0], t.days[1])
  const payPerDay = Math.round(randInt(r.pay[0], r.pay[1]) * t.payMul)
  return { name, days, payPerDay }
}

function careerOver() {
  return S.careerYears >= C.career.maxYears || S.age >= C.career.maxAge
}

function nextProject() {
  if (careerOver()) return finalEnding()
  S.project = makeProject()
  go({ type: 'project', project: S.project })
}

export function startShoot() {
  if (rnd() < C.eventChance.project) {
    const ev = pickEvent('project')
    if (ev) return go({ type: 'event', id: ev.id, after: 'settle' })
  }
  settle()
}

function settle() {
  const t = St.getTrack(S.track)
  const r = St.getRank(S)
  const p = S.project ?? makeProject()
  const lines = []

  const pay = p.payPerDay * p.days
  const living = St.livingCost(S)
  let passive = 0
  for (const [flag, amt] of Object.entries(C.economy.passiveIncome)) if (St.hasFlag(S, flag)) passive += amt
  St.addStat(S, 'money', pay - living + passive)
  lines.push({ label: `페이 ${p.payPerDay}만 × ${p.days}회차`, value: `+${pay}만`, good: true })
  lines.push({ label: '생활비', value: `-${living}만`, good: false })
  if (passive) lines.push({ label: '부수입', value: `+${passive}만`, good: true })

  let drain = r.staminaCost * t.staminaMul
  if (S.age >= C.body.agingFrom) drain += C.body.agingExtraDrain
  if (St.hasFlag(S, 'back_pain')) drain += 0.5
  const dStamina = round1(C.body.recoverPerProject - drain)
  St.addStat(S, 'stamina', dStamina)
  lines.push({ label: '체력 (소모−회복)', value: `${dStamina > 0 ? '+' : ''}${dStamina}`, good: dStamina >= 0 })
  St.addStat(S, 'mental', -t.mentalCost)

  const rep = round1(r.repGain * t.repMul)
  St.addStat(S, 'rep', rep)
  lines.push({ label: '평판', value: `+${rep}`, good: true })
  St.addStat(S, 'favor', t.favorGain)

  const grown = []
  for (const [id, v] of Object.entries(r.growth ?? {})) {
    const before = St.stat(S, id)
    St.addStat(S, id, v)
    if (St.stat(S, id) > before) grown.push(`${St.statDef(id).name} +1`)
  }
  if (grown.length) lines.push({ label: '성장', value: grown.join(', '), good: true })

  S.projects += 1
  S.rankProjects += 1
  const ageBefore = S.age
  St.passTime(S, 1)
  S.debtStreak = S.stats.money < 0 ? S.debtStreak + 1 : 0

  let promoted = null
  if (r.promote && test(r.promote.when, S)) {
    const chance = r.promote.chance + Math.floor(S.favor / 10) * C.promote.favorBonusPer10
    if (rnd() * 100 < chance) {
      St.setRank(S, r.promote.to)
      promoted = St.getRank(S).name
      St.addStat(S, 'mental', C.promote.mentalBoost ?? 0)
      S.log.push({ age: S.age, title: `${promoted} 승진`, tier: 'success', phase: 'career' })
    }
  }

  S.project = null
  go({
    type: 'settle',
    report: {
      name: p.name, lines, promoted,
      birthday: S.age > ageBefore ? S.age : null,
      debtWarn: S.debtStreak > 0 ? S.debtStreak : 0,
    },
  })
}

export function afterSettle() {
  if (checkInstant()) return
  if (careerOver()) return finalEnding()
  const t = St.getTrack(S.track)
  if (rnd() < t.gapChance) {
    const ev = pickEvent('gap')
    if (ev) return go({ type: 'event', id: ev.id, after: 'menu' })
  }
  if (rnd() < C.eventChance.between) {
    const ev = pickEvent('between')
    if (ev) return go({ type: 'event', id: ev.id, after: 'menu' })
  }
  showMenu()
}

function showMenu() {
  if (careerOver()) return finalEnding()
  go({ type: 'menu' })
}
export const canRetire = () => S.careerYears >= C.career.retireAfterYears

export function menuNext() {
  nextProject()
}

export function menuRest() {
  const before = { stamina: St.stat(S, 'stamina'), mental: St.stat(S, 'mental') }
  const cost = St.restFor(S, 1, { stamina: C.body.rest.stamina, mental: C.body.rest.mental })
  S.debtStreak = S.stats.money < 0 ? S.debtStreak + 1 : 0
  if (checkInstant()) return
  go({
    type: 'notice', title: '한 작품 쉬어간다', image: 'home',
    text: '알람을 끄고 잤다. 밀린 영화도 보고, 병원도 다녀왔다.',
    changes: [
      { text: `❤️체력 +${St.stat(S, 'stamina') - before.stamina}`, good: true },
      { text: `🧠멘탈 +${St.stat(S, 'mental') - before.mental}`, good: true },
      { text: `💰생활비 -${cost}만`, good: false },
    ],
    next: 'project',
  })
}

export function menuRetire() {
  if (canRetire()) finalEnding()
}

// ───────── 이벤트 ─────────
function pickEvent(slot) {
  const pool = D.events.filter((e) =>
    e.slot === slot &&
    (!e.career || e.career.includes(S.career)) &&
    !(e.once && S.seen[e.id]) &&
    !(e.cooldown && S.lastSeen[e.id] != null && S.projects - S.lastSeen[e.id] < e.cooldown) &&
    test(e.when, S))
  const ev = weightedPick(pool)
  if (ev) {
    S.seen[ev.id] = (S.seen[ev.id] ?? 0) + 1
    S.lastSeen[ev.id] = S.projects
  }
  return ev
}

export const choiceAvailable = (ch) => test(ch.when, S)

export function choose(i) {
  const step = S.step
  if (step.type !== 'event') return
  const ev = St.getEvent(step.id)
  const ch = ev.choices[i]
  if (!ch || !choiceAvailable(ch)) return
  if (ch.minigame) return go({ type: 'minigame', id: ev.id, choice: i, after: step.after })
  let check = null
  let out
  if (ch.check) {
    check = rollCheck(ch.check, S)
    out = ch.outcomes[check.tier]
  } else out = { text: ch.text, effects: ch.effects }
  resolve(ev, i, out, check, null, step.after)
}

export function minigameDone(result) {
  const step = S.step
  if (step.type !== 'minigame') return
  const ev = St.getEvent(step.id)
  const ch = ev.choices[step.choice]
  const out = ch.minigame.results[result.outcome] ?? { text: '', effects: {} }
  resolve(ev, step.choice, out, null, result, step.after)
}

function resolve(ev, ci, out, check, mg, after) {
  const changes = applyEffects(out.effects, S)
  S.log.push({
    age: S.age, title: ev.title, choice: ev.choices[ci].label,
    tier: check?.tier ?? mg?.outcome ?? null, phase: S.phase,
  })
  go({ type: 'outcome', id: ev.id, choice: ci, text: out.text, check, minigame: mg, changes, after })
}

// ───────── 화면 넘김 ─────────
const NEXT = {
  school: () => go({ type: 'school' }),
  major: () => go({ type: 'major' }),
  student: nextStudent,
  project: nextProject,
  settle,
  menu: showMenu,
}

export function proceed() {
  const step = S.step
  if (step.type === 'outcome' && checkInstant()) return
  const key = step.type === 'outcome' ? step.after : step.next
  ;(NEXT[key] ?? showMenu)()
}

// ───────── 엔딩 ─────────
function checkInstant() {
  if (S.phase !== 'career' && !S.pendingEnding) return false
  if (S.pendingEnding) {
    showEnding(S.pendingEnding)
    return true
  }
  // 능력치가 처음 0이 되면 쓰러져서 쉬고(config.body.collapse), 두 번째부터는 엔딩 조건으로 넘어감
  for (const col of C.body.collapse ?? []) {
    if (St.stat(S, col.stat) > 0 || St.hasFlag(S, col.flag)) continue
    St.addFlag(S, col.flag)
    const cost = St.restFor(S, col.restProjects)
    St.addStat(S, col.stat, col.restore)
    S.debtStreak = S.stats.money < 0 ? S.debtStreak + 1 : 0
    S.project = null
    S.log.push({ age: S.age, title: col.title, tier: 'fail', phase: S.phase })
    const d = St.statDef(col.stat)
    go({
      type: 'notice', title: col.title, image: col.image, text: col.text,
      changes: [{ text: `${d.icon}${d.name} → ${St.stat(S, col.stat)}`, good: true }, { text: `💰생활비 -${cost}만`, good: false }],
      next: 'menu',
    })
    return true
  }
  const e = findInstantEnding(S)
  if (e) {
    showEnding(e.id)
    return true
  }
  return false
}

function finalEnding() {
  const e = findFinalEnding(S)
  showEnding(e.id)
}

function showEnding(id) {
  const e = St.getEnding(id)
  S.phase = 'ended'
  S.pendingEnding = null
  const { isNew } = Save.recordEnding(dexId(e), S.age)
  Save.clearRun()
  S.step = { type: 'ending', id, summary: buildSummary(S), isNew }
  listener(S.step, S)
}
