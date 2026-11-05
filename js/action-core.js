// 1대다수 액션 전투: 준비(setup)와 시뮬레이터용 자동 판정. DOM 없음.
import D from '../data/index.js'
import * as St from './state.js'
import { scaledEnemy, moveList, previewPower } from './combat.js'
import { pickOne } from './util.js'
import SP from '../data/sprites.js'

const A = D.config.action
const CC = D.config.combat

// 무리 구성: 주 적 60% + 같은 단계의 다른 일반 적
export function buildAction(s, enemyId) {
  const main = St.getEnemy(enemyId)
  const tier = St.stageTier(s)
  const others = D.enemies.filter((e) => e.kind === 'normal' && e.tier <= tier && e.id !== enemyId)
  const count = Math.min(A.max ?? A.count.max, Math.round(A.count.base + A.count.perProject * s.projectNo))
  const mobs = []
  for (let i = 0; i < count; i++) {
    const src = i === 0 || Math.random() < 0.6 || !others.length ? main : pickOne(others)
    const e = scaledEnemy(s, src.id)
    const hp = Math.max(6, Math.round(e.max * A.mobHp))
    mobs.push({ human: !!SP.enemies[e.id]?.human, id: e.id, name: e.name, emoji: e.emoji, hp, max: hp, atk: Math.max(2, Math.round(e.atk * A.mobAtk)), def: e.def, weak: e.weak, resist: e.resist, speed: 1.1 + Math.random() * 0.9 })
  }
  const moves = moveList(s).map((m) => ({
    id: m.id, name: m.name, emoji: m.emoji, type: m.type, route: m.route, mp: m.mp ?? 0, hits: m.hits ?? 1, turns: m.turns ?? 2, lv: m.lv,
    base: Math.round(previewPower(s, m) * (1 + St.boost(s, m.route))),
    heal: Math.round(m.power * (1 + 0.2 * (m.lv - 1)) + St.stat(s, 'cha') * 0.5),
    pct: m.power * (1 + 0.2 * (m.lv - 1)) / 100,
    gold: Math.round((m.gold ?? 0) * (1 + 0.2 * (m.lv - 1))),
    basic: !!m.basic,
  }))
  return {
    enemyId, name: main.name, emoji: main.emoji,
    mobs,
    player: { job: s.job, hp: s.hp, maxHp: St.maxHp(s), mp: s.mp, maxMp: St.maxMp(s), def: St.defense(s), emoji: St.jobOf(s).emoji,
      crit: (CC.critBase + St.stat(s, 'sen') * CC.critPerSen) / 100, critMul: CC.critMul, weakMul: CC.weakMul, resistMul: CC.resistMul },
    moves, bag: s.bag?.bacchus ?? 0,
    potion: D.config.shop.potion, timeLimit: A.timeLimit, mpRegen: A.mpRegen,
  }
}

// 한 번 때린 피해 (액션 화면·자동 판정 공용)
export function strike(setup, move, mob, mul = 1) {
  let d = move.base * mul
  let tag = null
  if (mob.weak?.includes(move.route)) { d *= setup.player.weakMul; tag = 'weak' }
  if (mob.resist?.includes(move.route)) { d *= setup.player.resistMul; tag = 'resist' }
  const crit = Math.random() < setup.player.crit
  if (crit) d *= setup.player.critMul
  return { dmg: Math.max(1, Math.round(d * (0.9 + Math.random() * 0.2)) - (mob.def ?? 0)), crit, tag }
}

// 시뮬레이터용: 0.5초 단위로 대략 굴려 결과만 계산
export function autoResolve(setup) {
  const p = { ...setup.player }
  const mobs = setup.mobs.map((m) => ({ ...m }))
  let bag = setup.bag
  let money = 0
  const basic = setup.moves.find((m) => m.basic)
  const attacks = setup.moves.filter((m) => !m.basic && ['attack', 'gold', 'stun'].includes(m.type))
  let t = 0
  while (t < setup.timeLimit) {
    t += 0.5
    const alive = mobs.filter((m) => m.hp > 0)
    if (!alive.length) break
    const sk = attacks.find((m) => p.mp >= m.mp)
    if (sk && Math.random() < 0.35) {
      p.mp -= sk.mp
      for (const m of alive.slice(0, 3)) m.hp -= strike(setup, sk, m, sk.hits > 1 ? 1 : 0.9).dmg
      money += sk.gold
    } else alive[0].hp -= strike(setup, basic, alive[0]).dmg
    const engaged = Math.min(alive.length, 3)
    for (let i = 0; i < engaged; i++) if (Math.random() < 0.35) p.hp -= Math.max(1, alive[i].atk - p.def)
    p.mp = Math.min(p.maxMp, p.mp + setup.mpRegen * 0.5)
    if (p.hp < p.maxHp * 0.3 && bag > 0) { bag--; p.hp += p.maxHp * setup.potion.heal }
    if (p.hp <= 0) return { result: 'lose', hp: 0, mp: Math.round(p.mp), bag, kills: mobs.filter((m) => m.hp <= 0).length, money }
  }
  const win = mobs.every((m) => m.hp <= 0)
  return { result: win ? 'win' : 'lose', hp: Math.max(1, Math.round(p.hp)), mp: Math.round(p.mp), bag, kills: mobs.filter((m) => m.hp <= 0).length, money }
}
