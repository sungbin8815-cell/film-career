// 진행 엔진 (storylet 방식). DOM을 모릅니다 — 화면은 setListener로 받은 함수가 그립니다.
// 흐름: 시즌 시작 → 행동 선택 → 조건이 맞는 이야기 1개 → 선택 → 결과 + 시즌 정리 → 다음 시즌 … 40세 엔딩
import D from '../data/index.js'
import * as St from './state.js'
import { test, referencedKeys } from './conditions.js'
import { applyEffects } from './effects.js'
import { render } from './text.js'
import { buildEnding } from './memoir.js'
import * as Save from './save.js'
import { randInt, pickOne, weightedPick, asList } from './util.js'

const C = D.config
let S = null
let listener = () => {}

export const getState = () => S
export function setListener(fn) { listener = fn }

function go(step) {
  S.step = step
  Save.saveRun(S)
  listener(step, S)
}

// ───────── 시작 ─────────
export function newGame() {
  S = St.newRun()
  play(C.introStorylet)
}
export function resume(saved) {
  S = saved
  listener(S.step, S)
}

// ───────── 이야기(storylet) ─────────
function offerStory(jobId) {
  const job = St.getJob(jobId)
  const o = job.offer
  return {
    id: `offer:${jobId}`, title: o.title ?? '제안', image: o.image ?? 'office', text: o.text,
    choices: [
      { id: 'accept', label: o.accept ?? `${job.name} 자리를 받아들인다`, text: o.acceptText ?? `${job.name}이(가) 되었다.`,
        effects: { setJob: jobId, ...(o.effects ?? {}) }, memo: o.memo, pivotal: 1 },
      { id: 'decline', label: o.decline ?? '아직은 지금 자리가 좋다', text: o.declineText ?? '정중히 거절했다. 지금 자리에서 더 배우고 싶었다.',
        effects: { flags: [`declined_${jobId}`], lean: { safe: 1 } } },
    ],
  }
}

export function storyById(id) {
  if (id?.startsWith('offer:')) return offerStory(id.slice(6))
  return D.storylets.find((s) => s.id === id) ?? null
}

export const visibleChoices = (st) => st.choices.map((c, i) => ({ c, i })).filter(({ c }) => test(c.when, S))

function actionMatches(st, actionId) {
  if (!st.action) return true
  const a = St.getAction(actionId)
  const list = asList(st.action)
  return list.includes(actionId) || (a && list.includes(a.group))
}

function eligible(st, actionId) {
  if (st.manual) return false
  if ((st.stage ?? 'career') !== S.stage) return false
  if (!st.repeat && S.seen[st.id] != null) return false
  if (!actionMatches(st, actionId)) return false
  if (!test(st.when, S)) return false
  return visibleChoices(st).length > 0
}

function pickStory(actionId) {
  const a = St.getAction(actionId)
  const cands = D.storylets.filter((st) => eligible(st, actionId))
  if (a?.work && S.stage === 'career') {
    for (const j of D.jobs) {
      const o = j.offer
      if (!o || !asList(o.from).includes(S.job) || !test(o.when, S)) continue
      const declined = S.flags[`declined_${j.id}`]
      if (declined != null && S.t - declined < C.offerCooldown) continue
      cands.push({ id: `offer:${j.id}`, priority: o.priority ?? 3, weight: 1 })
    }
  }
  if (!cands.length) return null
  const top = Math.max(...cands.map((c) => c.priority ?? 0))
  return weightedPick(cands.filter((c) => (c.priority ?? 0) === top))
}

function play(id) {
  const st = storyById(id)
  if (!st) {
    console.warn('[엔진] 없는 이야기:', id)
    return afterStory()
  }
  S.seen[st.id] = S.t
  // 이 이야기를 연 과거 선택에 "이어진 이야기" 점수
  for (const key of new Set(referencedKeys(st.when))) {
    const idx = S.origins[key]
    if (idx != null && S.log[idx]) S.log[idx].opened += 1
  }
  go({ type: 'story', id: st.id })
}

function pickResult(ch) {
  if (!ch.results) return { text: ch.text, effects: ch.effects, memo: ch.memo, next: ch.next }
  const ok = ch.results.filter((r) => test(r.when, S))
  return weightedPick(ok.length ? ok : ch.results)
}

export function choose(i) {
  const step = S.step
  if (step?.type !== 'story') return
  const st = storyById(step.id)
  const ch = st.choices[i]
  if (!ch || !test(ch.when, S)) return
  if (ch.minigame) return go({ type: 'minigame', id: st.id, choice: i })
  const res = pickResult(ch)
  finishChoice(st, i, ch, res)
}

export function minigameDone(result) {
  const step = S.step
  if (step?.type !== 'minigame') return
  const st = storyById(step.id)
  const ch = st.choices[step.choice]
  const res = ch.minigame.results?.[result.outcome] ?? { text: result.summary ?? '' }
  finishChoice(st, step.choice, ch, res)
}

function finishChoice(st, i, ch, res) {
  const logIdx = S.log.length
  S.log.push({
    t: S.t, age: S.age, story: st.id, title: render(st.title, S), label: render(ch.label, S),
    memo: res.memo ?? ch.memo ?? null, pivotal: (ch.pivotal ?? 0) + (res.pivotal ?? 0), opened: 0,
  })
  const key = `${st.id}.${ch.id ?? i}`
  S.chose[key] = S.t
  S.origins[`chose:${key}`] = logIdx
  const notes = []
  if (ch.results) notes.push(...applyEffects(ch.effects, S, logIdx))
  notes.push(...applyEffects(res.effects, S, logIdx))
  if (S.log[logIdx].memo) S.log[logIdx].memo = render(S.log[logIdx].memo, S)
  const text = render(res.text, S)
  const next = res.next ?? ch.next ?? null
  const recap = next || S.pendingStage ? null : finishSeason()
  go({ type: 'result', id: st.id, choice: i, text, notes, next, recap })
}

export function proceed() {
  const step = S.step
  if (step?.type === 'result' && step.next) return play(step.next)
  afterStory()
}

function afterStory() {
  if (S.pendingStage) return beginStage(S.pendingStage)
  if (S.stage === 'intro') return beginStage('student')
  if (S.action) {
    // 이야기 체인 도중 시즌이 끝나지 않은 경우 (next 뒤에 pendingStage 등)
    const recap = finishSeason()
    return go({ type: 'recap', text: '', recap })
  }
  startSeason()
}

function beginStage(stage) {
  S.pendingStage = null
  if (stage === 'student') {
    const sc = St.getSchool(S.school)
    S.stage = 'student'
    S.seasonIdx = 0
    S.studentLeft = (sc?.years ?? 0) * C.seasons.student.length
    if (S.studentLeft <= 0) return beginStage('career')
    return startSeason()
  }
  if (stage === 'career') {
    S.stage = 'career'
    S.seasonIdx = 0
    S.careerT = 0
    return play(C.careerStartStorylet)
  }
}

// ───────── 시즌 ─────────
function startSeason() {
  if (S.stage === 'career' && S.age >= C.endAge) return endRun()
  go({ type: 'season' })
}

export const availableActions = () => D.actions.filter((a) => a.stage === S.stage && test(a.when, S))

function makeTitle() {
  const t = pickOne(D.names.titles)
  const b = pickOne(D.names.brands)
  const track = St.getTrack(S.track)
  const tpl = track ? pickOne(track.projectNames) : '〈{t}〉'
  return { title: `〈${t}〉`, project: tpl.replace('{t}', t).replace('{b}', b) }
}

export function chooseAction(id) {
  if (S.step?.type !== 'season') return
  const a = availableActions().find((x) => x.id === id)
  if (!a) return
  S.action = id
  const job = St.jobOf(S)
  const names = makeTitle()
  S.seasonTitle = a.work && job?.kind !== 'own' ? names.project : names.title
  S.seasonFilm = null
  if (a.work && job && job.kind !== 'own') {
    S.film.push({ age: S.age, title: S.seasonTitle, role: job.name, note: '' })
    S.seasonFilm = S.film.length - 1
  }
  const st = pickStory(id)
  if (st) return play(st.id)
  const text = pickQuiet(a)
  const recap = finishSeason()
  go({ type: 'recap', text, recap })
}

function pickQuiet(a) {
  const used = (S.quietUsed[a.id] ??= [])
  const pool = (a.quiet ?? []).map((q, i) => i).filter((i) => !used.includes(i))
  if (!pool.length) return render('별다른 일 없이 한 시즌이 지나갔다.', S)
  const i = pickOne(pool)
  used.push(i)
  return render(a.quiet[i], S)
}

function finishSeason() {
  const a = St.getAction(S.action)
  if (!a) return null
  const lines = [{ label: '이번 시즌', value: `${a.emoji ?? ''} ${a.name}` }]
  const before = S.money
  const notes = applyEffects(a.effects, S, null).filter((n) => !n.text.startsWith('💰'))
  const job = St.jobOf(S)
  if (a.work && job) {
    const mul = job.kind === 'own' ? 1 : St.getTrack(S.track)?.payMul ?? 1
    const pay = Math.round((randInt(job.pay[0], job.pay[1]) * mul) / 10) * 10
    S.money += pay
    S.exp[job.field] = (S.exp[job.field] ?? 0) + 1
    lines.push({ label: job.kind === 'own' ? '수입' : '페이', value: `+${pay.toLocaleString()}만`, tone: 'good' })
  }
  if (a.film) {
    const title = render(a.film.format, S).replace('{t}', S.seasonTitle.replace(/[〈〉]/g, ''))
    S.film.push({ age: S.age, title, role: render(a.film.role, S), note: '' })
  }
  if (S.stage === 'career') {
    const cost = St.hasFlag(S, 'at_home') ? C.homeLivingCost : C.livingCost
    S.money -= cost
    lines.push({ label: St.hasFlag(S, 'at_home') ? '생활비(본가)' : '생활비', value: `-${cost}만`, tone: 'bad' })
  } else if (S.stage === 'student') {
    const v = C.studentAllowance[St.traitBand(S, 'wealth')]
    S.money += v
    lines.push({ label: v >= 0 ? '용돈' : '생활비', value: `${v >= 0 ? '+' : ''}${v}만`, tone: v >= 0 ? 'good' : 'bad' })
  }
  const delta = S.money - before
  if (S.seasonFilm != null) lines.push({ label: '필모', value: S.film[S.seasonFilm].title })
  lines.push({ label: '통장', value: `${S.money.toLocaleString()}만 (${delta >= 0 ? '+' : ''}${delta.toLocaleString()})`, tone: S.money < 0 ? 'bad' : '' })

  const ageBefore = S.age
  advanceTime()
  S.action = null
  S.seasonFilm = null
  return { lines, notes, birthday: S.age > ageBefore ? S.age : null }
}

function advanceTime() {
  S.t += 1
  const per = S.stage === 'student' ? C.seasons.student.length : C.seasons.career.length
  S.seasonIdx += 1
  if (S.stage === 'career') S.careerT += 1
  if (S.seasonIdx >= per) { S.seasonIdx = 0; S.age += 1 }
  if (S.stage === 'student') {
    S.studentLeft -= 1
    if (S.studentLeft <= 0) S.pendingStage = 'career'
  }
}

// ───────── 엔딩 ─────────
function endRun() {
  S.stage = 'ended'
  const ending = buildEnding(S)
  const { isNew } = Save.recordEnding(ending.dexKey, S.age)
  Save.clearRun()
  S.step = { type: 'ending', ending, isNew }
  listener(S.step, S)
}
