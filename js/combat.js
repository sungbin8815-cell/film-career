// 턴제 전투 (DOM 없음). 내 스킬 → 적 행동 → 승패 판정.
import D from '../data/index.js'
import * as St from './state.js'
import { weightedPick } from './util.js'

const CC = D.config.combat

export function startCombat(s, enemyId, opts = {}) {
  const e = St.getEnemy(enemyId)
  const scale = 1 + CC.enemyScale * s.projectNo
  const af = s.project ? St.getAffix(s.project.affix) : null
  let hp = e.hp * scale * (af?.enemyHp ?? 1)
  if (e.kind === 'boss') hp *= af?.bossHp ?? 1
  const enemy = {
    id: e.id, name: e.name, emoji: e.emoji, kind: e.kind,
    hp: Math.round(hp), max: Math.round(hp),
    atk: Math.round(e.atk * scale * (af?.enemyAtk ?? 1)), def: Math.round(e.def * scale),
    weak: e.weak ?? [], resist: e.resist ?? [],
  }
  s.combat = {
    enemy, turn: 1, log: [`${e.emoji} ${e.name} 등장!`],
    dmgBuff: 0, dmgTurns: 0, guard: 0, foeWeak: 0, foeWeakTurns: 0, stunned: false, charging: false,
    source: opts.source ?? 'node', result: null,
  }
}

export function skillList(s) {
  const cls = St.getClass(s.cls)
  const ids = [cls?.basicSkill ?? 'slate_hit', ...Object.keys(s.skills).filter((id) => !St.getSkill(id)?.basic)]
  return ids.map((id) => ({ ...St.getSkill(id), lv: s.skills[id] ?? 1 })).filter((x) => x.id)
}

function lvMul(lv) { return 1 + 0.2 * (lv - 1) }

export function previewPower(s, sk) {
  let base = sk.power
  for (const [k, w] of Object.entries(sk.scale ?? {})) base += St.stat(s, k) * w
  return Math.round(base * lvMul(sk.lv ?? 1))
}

function rand(a, b) { return a + Math.random() * (b - a) }

// 내 행동
export function useSkill(s, skillId) {
  const cb = s.combat
  if (!cb || cb.result) return
  const sk = skillList(s).find((x) => x.id === skillId)
  if (!sk || s.mp < (sk.mp ?? 0)) return
  s.mp -= sk.mp ?? 0
  const e = cb.enemy
  const mul = lvMul(sk.lv)
  const line = []

  if (sk.type === 'attack' || sk.type === 'gold' || sk.type === 'stun') {
    let total = 0
    let crit = false
    const hits = sk.hits ?? 1
    for (let h = 0; h < hits; h++) {
      let dmg = previewPower(s, sk) / (hits > 1 ? 1 : 1)
      dmg *= 1 + St.boost(s, sk.route) + cb.dmgBuff
      if (e.weak.includes(sk.route)) dmg *= CC.weakMul
      if (e.resist.includes(sk.route)) dmg *= CC.resistMul
      if (Math.random() * 100 < CC.critBase + St.stat(s, 'sen') * CC.critPerSen) { dmg *= CC.critMul; crit = true }
      dmg = Math.max(1, Math.round(dmg * rand(0.9, 1.1)) - e.def)
      total += dmg
    }
    e.hp -= total
    const tag = e.weak.includes(sk.route) ? ' 효과가 굉장하다!' : e.resist.includes(sk.route) ? ' 별로 안 통한다…' : ''
    line.push(`${sk.emoji} ${sk.name}! ${hits > 1 ? `${hits}연타 ` : ''}${total} 피해${crit ? ' (크리티컬!)' : ''}.${tag}`)
    if (sk.type === 'gold') {
      const g = Math.round((sk.gold ?? 20) * mul)
      s.money += g
      cb.goldGained = (cb.goldGained ?? 0) + g
      line.push(`💰 ${g}만 챙겼다.`)
    }
    if (sk.type === 'stun') { cb.stunned = true; cb.charging = false; line.push(`${e.name}의 움직임이 멈췄다!`) }
  } else if (sk.type === 'heal') {
    const v = Math.round(sk.power * mul + St.stat(s, 'cha') * 0.5)
    s.hp = Math.min(St.maxHp(s), s.hp + v)
    line.push(`${sk.emoji} ${sk.name}! HP ${v} 회복.`)
  } else if (sk.type === 'mana') {
    const v = Math.round(sk.power * mul)
    s.mp = Math.min(St.maxMp(s), s.mp + v)
    line.push(`${sk.emoji} ${sk.name}! MP ${v} 회복.`)
  } else if (sk.type === 'guard') {
    cb.guard = Math.min(90, Math.round(sk.power * (0.85 + 0.15 * sk.lv)))
    line.push(`${sk.emoji} ${sk.name}! 다음 피해 ${cb.guard}% 감소.`)
  } else if (sk.type === 'buff') {
    cb.dmgBuff = (sk.power * mul) / 100
    cb.dmgTurns = sk.turns ?? 2
    line.push(`${sk.emoji} ${sk.name}! ${cb.dmgTurns}턴 동안 피해 +${Math.round(cb.dmgBuff * 100)}%.`)
  } else if (sk.type === 'debuff') {
    cb.foeWeak = Math.min(0.7, (sk.power * mul) / 100)
    cb.foeWeakTurns = sk.turns ?? 2
    line.push(`${sk.emoji} ${sk.name}! ${e.name}의 공격 -${Math.round(cb.foeWeak * 100)}%.`)
  }
  cb.log.push(...line)

  if (e.hp <= 0) { e.hp = 0; cb.result = 'win'; cb.log.push(`${e.name}을(를) 쓰러뜨렸다!`); return }
  enemyTurn(s)
  if (cb.dmgTurns > 0 && --cb.dmgTurns === 0) cb.dmgBuff = 0
  s.mp = Math.min(St.maxMp(s), s.mp + CC.mpRegen)
  cb.turn += 1
}

function enemyTurn(s) {
  const cb = s.combat
  const e = cb.enemy
  const def = St.getEnemy(e.id)
  if (cb.stunned) { cb.stunned = false; cb.log.push(`${e.name}은(는) 아무것도 못 했다.`); return }
  let mv
  if (cb.charging) { mv = { name: '모아둔 힘 폭발', type: 'heavy', power: 2.2 }; cb.charging = false }
  else mv = weightedPick(def.moves)
  if (mv.type === 'charge') { cb.charging = true; cb.log.push(`⚠️ ${e.name}의 ${mv.name}! 다음 턴에 큰 공격이 온다.`); return }
  if (mv.type === 'heal') {
    const v = Math.round(mv.power * (1 + 0.16 * s.projectNo))
    e.hp = Math.min(e.max, e.hp + v)
    cb.log.push(`${e.name}의 ${mv.name}. HP ${v} 회복.`)
    return
  }
  let dmg = e.atk * (mv.power ?? 1) * (mv.type === 'heavy' ? 1.6 : 1) * rand(0.9, 1.1)
  if (cb.foeWeakTurns > 0) { dmg *= 1 - cb.foeWeak; if (--cb.foeWeakTurns === 0) cb.foeWeak = 0 }
  if (cb.guard) { dmg *= 1 - cb.guard / 100; cb.guard = 0 }
  dmg = Math.max(1, Math.round(dmg) - St.defense(s))
  s.hp -= dmg
  let extra = ''
  if (mv.type === 'drain') { e.hp = Math.min(e.max, e.hp + Math.round(dmg / 2)); s.mp = Math.max(0, s.mp - 3); extra = ' (흡수)' }
  cb.log.push(`${e.name}의 ${mv.name}! ${dmg} 피해${extra}.`)
  if (s.hp <= 0) { s.hp = 0; cb.result = 'lose'; cb.log.push('눈앞이 깜깜해졌다…') }
}
