// 1대1 격투(맞짱) 준비와 시뮬레이터용 자동 판정. DOM 없음.
import D from '../data/index.js'
import * as St from './state.js'
import { scaledEnemy, moveList, previewPower } from './combat.js'

const CC = D.config.combat
const BR = D.config.brawl

export function buildBrawl(s, enemyId) {
  const e = scaledEnemy(s, enemyId)
  const moves = moveList(s)
  const basic = moves.find((m) => m.basic)
  const attacks = moves.filter((m) => !m.basic && ['attack', 'gold', 'stun'].includes(m.type))
  const sp = attacks.sort((a, b) => previewPower(s, b) - previewPower(s, a))[0] ?? basic
  const base = (m) => Math.round(previewPower(s, m) * (1 + St.boost(s, m.route)))
  const foeHp = Math.round(e.max * (e.kind === 'boss' ? BR.bossHp : BR.foeHp))
  return {
    enemyId, name: e.name, kind: e.kind, level: e.level,
    foe: { hp: foeHp, max: foeHp, atk: e.atk, def: e.def, weak: e.weak, resist: e.resist, think: Math.max(0.28, 0.55 - 0.04 * s.projectNo) },
    player: { job: s.job, name: St.jobOf(s).name, level: s.level, hp: s.hp, maxHp: St.maxHp(s), def: St.defense(s),
      crit: (CC.critBase + St.stat(s, 'sen') * CC.critPerSen) / 100, critMul: CC.critMul, weakMul: CC.weakMul, resistMul: CC.resistMul },
    punch: { route: basic.route, base: Math.round(base(basic) * BR.punchMul) },
    kick: { route: 'muscle', base: Math.round(base(basic) * BR.kickMul + St.stat(s, 'str') * 0.6) },
    special: { name: sp.name, emoji: sp.emoji, route: sp.route, base: Math.round(base(sp) * BR.specialMul) },
    timeLimit: BR.timeLimit,
  }
}

// 피해 계산 (격투 화면·자동 판정 공용)
export function brawlHit(setup, atk, guarded = false) {
  const f = setup.foe
  let d = atk.base
  let tag = null
  if (f.weak?.includes(atk.route)) { d *= setup.player.weakMul; tag = 'weak' }
  if (f.resist?.includes(atk.route)) { d *= setup.player.resistMul; tag = 'resist' }
  const crit = Math.random() < setup.player.crit
  if (crit) d *= setup.player.critMul
  if (guarded) d *= 0.2
  return { dmg: Math.max(1, Math.round(d * (0.9 + Math.random() * 0.2)) - (guarded ? 0 : f.def)), crit, tag }
}

export function foeHit(setup, mul, guarded = false) {
  let d = setup.foe.atk * mul * (0.9 + Math.random() * 0.2)
  if (guarded) d *= 0.2
  return Math.max(1, Math.round(d) - setup.player.def)
}

export function autoResolve(setup) {
  let ph = setup.player.hp, fh = setup.foe.hp, meter = 0, t = 0
  while (t < setup.timeLimit && ph > 0 && fh > 0) {
    t += 0.5
    if (meter >= 100) { meter = 0; fh -= brawlHit(setup, setup.special).dmg }
    else if (Math.random() < 0.45) { const r = brawlHit(setup, Math.random() < 0.6 ? setup.punch : setup.kick, Math.random() < 0.2); fh -= r.dmg; meter += 14 }
    if (Math.random() < 0.3) { ph -= foeHit(setup, Math.random() < 0.6 ? 0.9 : 1.3, Math.random() < 0.25); meter += 6 }
  }
  const win = fh <= 0 || (ph > 0 && ph / setup.player.maxHp > fh / setup.foe.max)
  return { result: win ? 'win' : 'lose', hp: Math.max(win ? 1 : 0, Math.round(ph)) }
}
