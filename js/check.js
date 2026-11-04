// 능력치 판정: 대성공 / 성공 / 실패
import D from '../data/index.js'
import { stat, statDef } from './state.js'
import { test } from './conditions.js'
import { clamp, randInt } from './util.js'

const CC = D.config.check

export function chanceOf(check, s) {
  let p = check.base ?? 20
  const parts = []
  for (const [id, w] of Object.entries(check.stats ?? {})) {
    const v = stat(s, id)
    p += v * w * CC.perPoint
    const name = id === 'favor' ? D.config.favor.name : statDef(id)?.name ?? id
    parts.push(`${name} ${v}${w !== 1 ? `×${w}` : ''}`)
  }
  for (const b of check.bonus ?? []) {
    if (test(b.when, s)) {
      p += b.add
      parts.push(b.label ?? `보너스 ${b.add > 0 ? '+' : ''}${b.add}`)
    }
  }
  return { p: Math.round(clamp(p, CC.min, CC.max)), parts }
}

export function rollCheck(check, s) {
  const { p, parts } = chanceOf(check, s)
  const roll = randInt(1, 100)
  const tier = roll <= Math.max(1, Math.round(p * CC.greatRatio)) ? 'great' : roll <= p ? 'success' : 'fail'
  return { tier, p, roll, parts }
}

export const TIER_LABEL = { great: '대성공', success: '성공', fail: '실패', win: '승리', lose: '패배', flee: '도망' }
