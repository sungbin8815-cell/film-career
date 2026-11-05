// 1대1 턴제 전투 (포켓몬식). DOM 없음.
// 로그는 { t: 문장, fx: 'foe'|'me'|null, foeHp, meHp, meMp } — 화면이 한 줄씩 재생하며 HP 바를 움직입니다.
import D from '../data/index.js'
import * as St from './state.js'
import { weightedPick } from './util.js'

const CC = D.config.combat

export function scaledEnemy(s, enemyId) {
  const e = St.getEnemy(enemyId)
  const scale = 1 + CC.enemyScale * s.projectNo
  const af = s.project ? St.getAffix(s.project.affix) : null
  let hp = e.hp * scale * (af?.enemyHp ?? 1)
  if (e.kind === 'boss') hp *= af?.bossHp ?? 1
  return {
    id: e.id, name: e.name, emoji: e.emoji, kind: e.kind,
    hp: Math.round(hp), max: Math.round(hp),
    atk: Math.round(e.atk * scale * (af?.enemyAtk ?? 1)), def: Math.round(e.def * scale),
    weak: e.weak ?? [], resist: e.resist ?? [],
    level: s.level + (e.kind === 'boss' ? 2 : e.kind === 'elite' ? 1 : 0),
  }
}

export function startCombat(s, enemyId, opts = {}) {
  const enemy = scaledEnemy(s, enemyId)
  s.combat = {
    enemy, turn: 1, log: [],
    dmgBuff: 0, dmgTurns: 0, guard: 0, foeWeak: 0, foeWeakTurns: 0, stunned: false, charging: false,
    source: opts.source ?? 'node', result: null, canFlee: enemy.kind !== 'boss',
  }
  say(s, `앗! ${enemy.kind === 'boss' ? '크랭크업의 ' : '야생의 '}${enemy.name}이(가) 나타났다!`)
}

function say(s, t, fx = null) {
  const cb = s.combat
  cb.log.push({ t, fx, foeHp: Math.max(0, cb.enemy.hp), meHp: Math.max(0, s.hp), meMp: s.mp })
}

// 기술 편성: 기본기 + 고른 기술 최대 3개
export function moveList(s) {
  const cls = St.getClass(s.cls)
  const basic = cls?.basicSkill ?? 'slate_hit'
  const ids = [basic, ...(s.moves ?? []).filter((id) => s.skills[id])].slice(0, 4)
  return ids.map((id) => ({ ...St.getSkill(id), lv: s.skills[id] ?? 1 })).filter((x) => x.id)
}
// 배운 전체 스킬(정보 화면용)
export function skillList(s) {
  const cls = St.getClass(s.cls)
  const ids = [cls?.basicSkill ?? 'slate_hit', ...Object.keys(s.skills).filter((id) => !St.getSkill(id)?.basic)]
  return ids.map((id) => ({ ...St.getSkill(id), lv: s.skills[id] ?? 1 })).filter((x) => x.id)
}

const lvMul = (lv) => 1 + 0.2 * (lv - 1)
const rand = (a, b) => a + Math.random() * (b - a)

export function previewPower(s, sk) {
  let base = sk.power
  for (const [k, w] of Object.entries(sk.scale ?? {})) base += St.stat(s, k) * w
  return Math.round(base * lvMul(sk.lv ?? 1))
}

// 피해 계산 (액션 전투도 같이 씀)
export function hitDamage(s, sk, target, extraMul = 1) {
  let dmg = previewPower(s, sk) * (1 + St.boost(s, sk.route)) * extraMul
  let tag = null
  if (target.weak?.includes(sk.route)) { dmg *= CC.weakMul; tag = 'weak' }
  if (target.resist?.includes(sk.route)) { dmg *= CC.resistMul; tag = 'resist' }
  let crit = false
  if (Math.random() * 100 < CC.critBase + St.stat(s, 'sen') * CC.critPerSen) { dmg *= CC.critMul; crit = true }
  dmg = Math.max(1, Math.round(dmg * rand(0.9, 1.1)) - (target.def ?? 0))
  return { dmg, crit, tag }
}

export function useSkill(s, skillId) {
  const cb = s.combat
  if (!cb || cb.result) return
  const sk = moveList(s).find((x) => x.id === skillId)
  if (!sk || s.mp < (sk.mp ?? 0)) return
  s.mp -= sk.mp ?? 0
  const e = cb.enemy
  const mul = lvMul(sk.lv)
  say(s, `${St.jobOf(s).name}의 ${sk.name}!`)

  if (['attack', 'gold', 'stun'].includes(sk.type)) {
    const hits = sk.hits ?? 1
    let tag = null
    for (let h = 0; h < hits; h++) {
      const r = hitDamage(s, sk, e, 1 + cb.dmgBuff)
      e.hp -= r.dmg
      tag = r.tag
      say(s, hits > 1 ? `${h + 1}타! ${r.dmg}${r.crit ? ' 급소에 맞았다!' : ''}` : `${r.dmg}의 피해!${r.crit ? ' 급소에 맞았다!' : ''}`, 'foe')
      if (e.hp <= 0) break
    }
    if (tag === 'weak') say(s, '효과가 굉장했다!')
    if (tag === 'resist') say(s, '효과가 별로인 듯하다…')
    if (sk.type === 'gold') { const g = Math.round((sk.gold ?? 20) * mul); s.money += g; say(s, `💰 ${g}만 원을 주웠다!`) }
    if (sk.type === 'stun' && e.hp > 0) { cb.stunned = true; cb.charging = false; say(s, `${e.name}은(는) 몸이 굳어 움직일 수 없다!`) }
  } else if (sk.type === 'heal') {
    const v = Math.round(sk.power * mul + St.stat(s, 'cha') * 0.5)
    s.hp = Math.min(St.maxHp(s), s.hp + v)
    say(s, `HP가 ${v} 회복되었다!`)
  } else if (sk.type === 'mana') {
    const v = Math.round(sk.power * mul)
    s.mp = Math.min(St.maxMp(s), s.mp + v)
    say(s, `멘탈이 ${v} 회복되었다!`)
  } else if (sk.type === 'guard') {
    cb.guard = Math.min(90, Math.round(sk.power * (0.85 + 0.15 * sk.lv)))
    say(s, `다음 공격을 ${cb.guard}% 막아낸다!`)
  } else if (sk.type === 'buff') {
    cb.dmgBuff = (sk.power * mul) / 100
    cb.dmgTurns = sk.turns ?? 2
    say(s, `공격력이 크게 올랐다! (${cb.dmgTurns}턴)`)
  } else if (sk.type === 'debuff') {
    cb.foeWeak = Math.min(0.7, (sk.power * mul) / 100)
    cb.foeWeakTurns = sk.turns ?? 2
    say(s, `${e.name}의 공격이 떨어졌다!`)
  }
  endOfMyTurn(s)
}

// 가방: 박카스
export function useBag(s) {
  const cb = s.combat
  if (!cb || cb.result || !(s.bag?.bacchus > 0)) return
  s.bag.bacchus -= 1
  const it = D.config.shop.potion
  s.hp = Math.min(St.maxHp(s), s.hp + Math.round(St.maxHp(s) * it.heal))
  s.mp = Math.min(St.maxMp(s), s.mp + Math.round(St.maxMp(s) * it.mana))
  say(s, `${it.name}을(를) 마셨다! 기운이 돌아온다.`)
  endOfMyTurn(s, true)
}

export function flee(s) {
  const cb = s.combat
  if (!cb || cb.result || !cb.canFlee) return
  if (Math.random() < 0.5 + St.stat(s, 'cha') * 0.02) { cb.result = 'flee'; say(s, '무사히 도망쳤다!'); return }
  say(s, '도망칠 수 없었다!')
  endOfMyTurn(s, true)
}

function endOfMyTurn(s, skipWinCheck = false) {
  const cb = s.combat
  const e = cb.enemy
  if (!skipWinCheck && e.hp <= 0) { e.hp = 0; cb.result = 'win'; say(s, `${e.name}은(는) 쓰러졌다!`); return }
  enemyTurn(s)
  if (cb.dmgTurns > 0 && --cb.dmgTurns === 0) cb.dmgBuff = 0
  s.mp = Math.min(St.maxMp(s), s.mp + CC.mpRegen)
  cb.turn += 1
}

function enemyTurn(s) {
  const cb = s.combat
  const e = cb.enemy
  const def = St.getEnemy(e.id)
  if (cb.stunned) { cb.stunned = false; say(s, `${e.name}은(는) 아무것도 할 수 없다!`); return }
  let mv
  if (cb.charging) { mv = { name: '모아둔 힘 폭발', type: 'heavy', power: 2.2 }; cb.charging = false }
  else mv = weightedPick(def.moves)
  say(s, `${e.name}의 ${mv.name}!`)
  if (mv.type === 'charge') { cb.charging = true; say(s, `⚠️ ${e.name}이(가) 힘을 모으고 있다…`); return }
  if (mv.type === 'heal') {
    const v = Math.round(mv.power * (1 + 0.16 * s.projectNo))
    e.hp = Math.min(e.max, e.hp + v)
    say(s, `${e.name}의 HP가 ${v} 회복되었다.`)
    return
  }
  let dmg = e.atk * (mv.power ?? 1) * (mv.type === 'heavy' ? 1.6 : 1) * rand(0.9, 1.1)
  if (cb.foeWeakTurns > 0) { dmg *= 1 - cb.foeWeak; if (--cb.foeWeakTurns === 0) cb.foeWeak = 0 }
  const guarded = cb.guard > 0
  if (guarded) { dmg *= 1 - cb.guard / 100; cb.guard = 0 }
  dmg = Math.max(1, Math.round(dmg) - St.defense(s))
  s.hp -= dmg
  if (mv.type === 'drain') { e.hp = Math.min(e.max, e.hp + Math.round(dmg / 2)); s.mp = Math.max(0, s.mp - 3) }
  say(s, `${guarded ? '막아냈지만 ' : ''}${dmg}의 피해를 입었다!${mv.type === 'drain' ? ' 기운을 빼앗겼다.' : ''}`, 'me')
  if (s.hp <= 0) { s.hp = 0; cb.result = 'lose'; say(s, '눈앞이 깜깜해졌다…') }
}
