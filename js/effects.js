// 효과(effects) 적용. 화면에 보여줄 "변화 메모"를 돌려줍니다(성향은 숨김).
//   money, exp, mark, lean, npc, flags, removeFlags, setJob, setTrack, setSchool, setField,
//   startStage, film, filmNote, age
import D from '../data/index.js'
import { getJob, getField, getTrack, getNpc, hasFlag } from './state.js'
import { test } from './conditions.js'
import { render } from './text.js'
import { resolveNum, asList } from './util.js'

function resolveField(s, f) {
  if (f === '@job') return getJob(s.job)?.field ?? s.field
  if (f === '@field') return s.field
  return f
}

export function updateTags(s, logIdx, notes) {
  for (const t of D.tags) {
    if (s.tags.includes(t.id)) continue
    if (t.mark && (s.marks[t.mark.id] ?? 0) < t.mark.count) continue
    if (t.when && !test(t.when, s)) continue
    if (!t.mark && !t.when) continue
    s.tags.push(t.id)
    if (logIdx != null) s.origins[`tag:${t.id}`] = logIdx
    notes.push({ text: `🏷️ 꼬리표가 붙었다: ${t.name}`, tone: 'key' })
  }
}

function leanApply(s, o) {
  for (const [k, v] of Object.entries(o)) {
    const ax = D.leanings.axes.find((a) => a.pos === k || a.neg === k)
    if (!ax) { console.warn('[효과] 알 수 없는 성향:', k); continue }
    s.lean[ax.id] += ax.pos === k ? v : -v
  }
}

export function setJob(s, id, notes) {
  const target = id === '@entry' ? getField(s.field)?.entryJob : id
  if (!target || target === s.job) return
  s.job = target
  s.jobHistory.push({ job: target, age: s.age })
  notes?.push({ text: `💼 ${getJob(target)?.name}`, tone: 'key' })
}

export function setTrack(s, id, notes) {
  if (!id || id === s.track) return
  s.track = id
  s.trackHistory.push({ track: id, age: s.age })
  notes?.push({ text: `🧭 ${getTrack(id)?.name} 쪽으로`, tone: '' })
}

export function applyEffects(eff, s, logIdx = null) {
  const notes = []
  if (!eff) return notes

  if (eff.money) {
    const v = resolveNum(eff.money)
    s.money += v
    if (v) notes.push({ text: `💰 ${v > 0 ? '+' : ''}${v.toLocaleString()}만`, tone: v > 0 ? 'good' : 'bad' })
  }
  if (eff.setSchool) s.school = eff.setSchool
  if (eff.setField) s.field = eff.setField
  if (eff.age) s.age += eff.age

  const grown = []
  for (const [f, raw] of Object.entries(eff.exp ?? {})) {
    const id = resolveField(s, f)
    const v = resolveNum(raw)
    if (!id || !v) continue
    s.exp[id] = (s.exp[id] ?? 0) + v
    if (v > 0) grown.push(getField(id)?.name ?? id)
  }
  if (grown.length) notes.push({ text: `📈 ${[...new Set(grown)].join('·')} 경험이 쌓였다`, tone: 'good' })

  for (const m of asList(eff.mark ?? [])) s.marks[m] = (s.marks[m] ?? 0) + 1
  if (eff.lean) leanApply(s, eff.lean)

  for (const [id, c] of Object.entries(eff.npc ?? {})) {
    const n = s.npcs[id]
    const def = getNpc(id)
    if (!n || !def) continue
    if (!n.met && (c.meet || c.bond || c.remember)) {
      n.met = true
      notes.push({ text: `🤝 ${def.name}(${def.role})을(를) 알게 되었다`, tone: 'key' })
    }
    if (c.bond) {
      n.bond += c.bond
      notes.push({ text: c.bond > 0 ? `🤝 ${def.name}과(와) 가까워졌다` : `🥶 ${def.name}과(와) 서먹해졌다`, tone: c.bond > 0 ? 'good' : 'bad' })
    }
    for (const m of asList(c.remember ?? [])) {
      n.mem[m] = s.t
      if (logIdx != null) s.origins[`mem:${id}:${m}`] = logIdx
    }
    if (c.remember) notes.push({ text: `💭 ${def.name}은(는) 이 일을 기억할 것이다`, tone: 'key' })
    for (const m of asList(c.forget ?? [])) delete n.mem[m]
  }

  for (const f of asList(eff.flags ?? [])) {
    if (!hasFlag(s, f)) s.flags[f] = s.t
    if (logIdx != null) s.origins[`flag:${f}`] ??= logIdx
  }
  for (const f of asList(eff.removeFlags ?? [])) delete s.flags[f]

  if (eff.setJob) setJob(s, eff.setJob, notes)
  if (eff.setTrack) setTrack(s, eff.setTrack, notes)

  if (eff.film) {
    s.film.push({ age: s.age, title: render(eff.film.title ?? s.seasonTitle ?? '무제', s), role: render(eff.film.role ?? '{job}', s), note: render(eff.film.note ?? '', s) })
    notes.push({ text: '🎞️ 필모그래피에 한 줄이 남았다', tone: '' })
  }
  if (eff.filmNote && s.seasonFilm != null && s.film[s.seasonFilm]) {
    const f = s.film[s.seasonFilm]
    const note = render(eff.filmNote, s)
    f.note = f.note ? `${f.note}, ${note}` : note
  }
  if (eff.startStage) s.pendingStage = eff.startStage

  updateTags(s, logIdx, notes)
  return notes
}
