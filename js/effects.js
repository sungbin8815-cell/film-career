// 효과 적용. 화면에 보여줄 변화 메모를 돌려줍니다.
//   routes, flags, removeFlags, money, exp, hp, mp, fame, grade, item, items, stats, learn
//   (fight는 엔진이 처리)
import D from '../data/index.js'
import * as St from './state.js'
import { asList, resolveNum, weightedPick } from './util.js'

const sign = (v) => (v > 0 ? `+${v}` : `${v}`)

export function gainExp(s, amount) {
  let v = Math.round(amount * (St.hasFlag(s, 'hungry') ? 1.15 : 1))
  s.exp += v
  while (s.level < D.config.maxLevel && s.exp >= St.expToNext(s)) {
    s.exp -= St.expToNext(s)
    s.level += 1
    s.pendingLevels += 1
  }
  return v
}

// 등급 이름이면 그 등급에서 랜덤, 아니면 id
export function rollItem(s, which) {
  if (St.getItem(which)) return which
  const tier = St.stageTier(s)
  const pool = D.items.filter((i) => i.rarity === which && i.tier <= tier + 1)
  const pick = weightedPick(pool.length ? pool : D.items.filter((i) => i.tier <= tier), () => 1)
  return pick?.id ?? null
}

const RANK = { common: 0, rare: 1, epic: 2, legend: 3 }
export function giveItem(s, id, notes) {
  const it = St.getItem(id)
  if (!it) return
  s.inventory.push(id)
  const cur = St.getItem(s.equip[it.slot])
  if (!cur || RANK[it.rarity] > RANK[cur.rarity]) {
    s.equip[it.slot] = id
    notes?.push({ text: `🎁 ${it.name} 획득 · 장착`, tone: 'key' })
  } else notes?.push({ text: `🎁 ${it.name} 획득`, tone: 'key' })
  St.clampVitals(s)
}

export function learnSkill(s, id, notes) {
  const sk = St.getSkill(id)
  if (!sk) return
  const lv = s.skills[id] ?? 0
  if (lv >= 3) return
  s.skills[id] = lv + 1
  if (!lv && !sk.basic) {
    s.moves ??= []
    if (s.moves.length < 3) s.moves.push(id)
    else notes?.push({ text: '📒에서 전투 기술을 바꿀 수 있다', tone: '' })
  }
  s.routes[sk.route] = (s.routes[sk.route] ?? 0) + 2
  notes?.push({ text: `✨ ${sk.name}${lv ? ` Lv${lv + 1}` : ' 습득'}`, tone: 'key' })
}

export function applyEffects(eff, s) {
  const notes = []
  if (!eff) return notes
  for (const [k, raw] of Object.entries(eff.routes ?? {})) {
    const v = resolveNum(raw)
    s.routes[k] = (s.routes[k] ?? 0) + v
    const r = St.getRoute(k)
    if (r && v) notes.push({ text: `${r.icon} ${r.name} ${sign(v)}`, tone: 'route' })
  }
  for (const [k, raw] of Object.entries(eff.stats ?? {})) {
    const v = resolveNum(raw)
    s.base[k] = (s.base[k] ?? 0) + v
    if (k === 'hp') s.hp += v
    if (k === 'mp') s.mp += v
    notes.push({ text: `${St.STAT_ICONS[k]} ${St.STAT_NAMES[k]} 최대 ${sign(v)}`, tone: 'good' })
  }
  for (const f of asList(eff.flags ?? [])) if (!St.hasFlag(s, f)) s.flags[f] = s.projectNo
  for (const f of asList(eff.removeFlags ?? [])) delete s.flags[f]
  if (eff.money) {
    const v = resolveNum(eff.money)
    s.money += v
    notes.push({ text: `💰 ${sign(v)}만`, tone: v > 0 ? 'good' : 'bad' })
  }
  if (eff.fame) {
    s.fame += eff.fame
    notes.push({ text: `⭐ 명성 ${sign(eff.fame)}`, tone: 'good' })
  }
  if (eff.hp) {
    s.hp += eff.hp
    notes.push({ text: `❤️ HP ${sign(eff.hp)}`, tone: eff.hp > 0 ? 'good' : 'bad' })
  }
  if (eff.mp) {
    s.mp += eff.mp
    notes.push({ text: `🧠 MP ${sign(eff.mp)}`, tone: eff.mp > 0 ? 'good' : 'bad' })
  }
  if (eff.grade && s.project) {
    s.project.score += eff.grade
    notes.push({ text: eff.grade > 0 ? '🎬 작품 평가 상승' : '🎬 작품 평가 하락', tone: eff.grade > 0 ? 'good' : 'bad' })
  }
  if (eff.exp) notes.push({ text: `📈 경험치 +${gainExp(s, eff.exp)}`, tone: 'good' })
  for (const it of [...asList(eff.items ?? []), ...(eff.item ? [eff.item] : [])]) giveItem(s, rollItem(s, it), notes)
  if (eff.learn) learnSkill(s, eff.learn, notes)
  St.clampVitals(s)
  return notes
}
