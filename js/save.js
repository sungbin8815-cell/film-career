// localStorage 저장. 사생활 보호 모드 등에서 실패해도 게임은 계속 돌아갑니다.
const RUN_KEY = 'filmCareer.run.v2'
const DEX_KEY = 'filmCareer.dex.v2'

function read(key) {
  try {
    const raw = globalThis.localStorage?.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}
function write(key, value) {
  try {
    if (value == null) globalThis.localStorage?.removeItem(key)
    else globalThis.localStorage?.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    return false
  }
}

export function loadRun() {
  const r = read(RUN_KEY)
  return r && r.v === 2 && r.step ? r : null
}
export const saveRun = (s) => write(RUN_KEY, s)
export const clearRun = () => write(RUN_KEY, null)

// 도감: { '엔딩id|성향조합': { count, firstAge, lastAt } }
export const loadDex = () => read(DEX_KEY) ?? {}
export function recordEnding(key, age) {
  const dex = loadDex()
  const e = dex[key] ?? { count: 0, firstAge: age }
  e.count += 1
  e.lastAt = Date.now()
  dex[key] = e
  write(DEX_KEY, dex)
  return { dex, isNew: e.count === 1 }
}
