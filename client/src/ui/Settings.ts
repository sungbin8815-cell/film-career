// 설정 저장 (localStorage, 실패해도 동작)
import type { Difficulty } from '../core/AI'

export interface SettingsData {
  sound: boolean
  difficulty: Difficulty
  /** 이펙트 낮음: 파편·잔상·먼지를 줄여 휴대폰에서 가볍게 */
  fxLow: boolean
  /** 화면 흔들림 줄이기 */
  reduceShake: boolean
  /** 번쩍임 줄이기 (화면 전체 플래시를 옅게) */
  reduceFlash: boolean
  /** 첫 실행 튜토리얼을 봤는지 */
  tutorialDone: boolean
}
const KEY = 'rolling.settings.v1'
const DEFAULT: SettingsData = { sound: true, difficulty: 'normal', fxLow: false, reduceShake: false, reduceFlash: false, tutorialDone: false }

export function loadSettings(): SettingsData {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return { ...DEFAULT } }
}
export function saveSettings(s: SettingsData) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* 저장 실패해도 게임은 계속 */ }
}
export const settings: SettingsData = loadSettings()
