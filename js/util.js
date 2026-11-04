export const rnd = () => Math.random()
export const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
export const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)]
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const round1 = (v) => Math.round(v * 10) / 10

// 숫자 또는 [최소, 최대] 범위
export const resolveNum = (v) => (Array.isArray(v) ? randInt(v[0], v[1]) : v)

export function weightedPick(items, weightOf = (x) => x.weight ?? 1) {
  const total = items.reduce((a, x) => a + Math.max(0, weightOf(x)), 0)
  if (total <= 0) return null
  let r = Math.random() * total
  for (const x of items) {
    r -= Math.max(0, weightOf(x))
    if (r < 0) return x
  }
  return items[items.length - 1]
}

export const asList = (v) => (Array.isArray(v) ? v : [v])
