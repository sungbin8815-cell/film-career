// 설정 저장 (localStorage, 실패해도 동작)
import type { Difficulty } from '../core/AI'

export interface SettingsData { sound: boolean; difficulty: Difficulty }
const KEY = 'rolling.settings.v1'
const DEFAULT: SettingsData = { sound: true, difficulty: 'normal' }

export function loadSettings(): SettingsData {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return { ...DEFAULT } }
}
export function saveSettings(s: SettingsData) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* 저장 실패해도 게임은 계속 */ }
}
export const settings: SettingsData = loadSettings()
