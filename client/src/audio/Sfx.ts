// 임시 효과음: WebAudio로 합성. 나중에 실제 파일로 바꿀 때는 play(key)만 유지하고
// public/sfx/<key>.mp3 를 불러오도록 이 파일만 고치면 됩니다.
import { settings } from '../ui/Settings'

let ctx: AudioContext | null = null
function ac() {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType, vol = 0.2, slide = 0) {
  const a = ac(); if (!a) return
  const o = a.createOscillator(), g = a.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, a.currentTime)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), a.currentTime + dur)
  g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur)
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur)
}
/** 낮은 '쿵' (주파수가 뚝 떨어지는 사인파) */
function thump(f0: number, f1: number, dur: number, vol = 0.4) {
  const a = ac(); if (!a) return
  const o = a.createOscillator(), g = a.createGain()
  o.type = 'sine'; o.frequency.setValueAtTime(f0, a.currentTime); o.frequency.exponentialRampToValueAtTime(f1, a.currentTime + dur)
  g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur)
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur)
}
function noise(dur: number, vol = 0.25, hp = 800) {
  const a = ac(); if (!a) return
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain()
  s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp
  g.gain.value = vol
  s.connect(f).connect(g).connect(a.destination); s.start()
}

const SOUNDS: Record<string, () => void> = {
  light: () => { noise(0.06, 0.2, 2000); tone(220, 0.06, 'square', 0.08, -100) },
  heavy: () => { noise(0.12, 0.3, 600); tone(110, 0.15, 'square', 0.15, -60) },
  // 타격음 = 짧은 '딱'(노이즈) + 몸에 울리는 '쿵'(사인파) 두 겹
  hit: () => { noise(0.05, 0.38, 1800); thump(220, 70, 0.09, 0.35); tone(160, 0.07, 'triangle', 0.15, -90) },
  hitHeavy: () => { noise(0.09, 0.5, 700); thump(160, 38, 0.2, 0.55); tone(90, 0.16, 'sawtooth', 0.18, -50) },
  hitFinish: () => { noise(0.14, 0.55, 400); thump(140, 30, 0.36, 0.65); tone(70, 0.3, 'sawtooth', 0.2, -30); setTimeout(() => noise(0.2, 0.18, 3000), 60) },
  counter: () => { tone(1320, 0.08, 'square', 0.1); setTimeout(() => tone(1760, 0.12, 'square', 0.1), 60) },
  shout: () => { tone(420, 0.18, 'sawtooth', 0.12, -120); noise(0.12, 0.15, 1500) },
  wave: () => { tone(1800, 0.35, 'sine', 0.08, 900); tone(600, 0.3, 'triangle', 0.08, -200) },
  whip: () => { noise(0.05, 0.35, 3500); tone(900, 0.08, 'square', 0.06, -600) },
  spray: () => noise(0.3, 0.15, 5000),
  block: () => { tone(1400, 0.05, 'square', 0.08); tone(900, 0.08, 'square', 0.06) },
  swing: () => noise(0.08, 0.12, 3000),
  dash: () => { noise(0.2, 0.15, 1500); tone(300, 0.2, 'sawtooth', 0.06, 200) },
  drop: () => { tone(900, 0.4, 'triangle', 0.08, -700) },
  super: () => { tone(200, 0.5, 'sawtooth', 0.1, 600); noise(0.4, 0.1, 2500) },
  slate: () => { noise(0.04, 0.5, 2500); tone(1800, 0.03, 'square', 0.15) },       // 슬레이트 "딱!"
  shutter: () => { noise(0.03, 0.3, 4000); setTimeout(() => noise(0.03, 0.25, 4000), 60) },
  jump: () => tone(300, 0.1, 'square', 0.05, 200),
  land: () => noise(0.05, 0.08, 400),
  ko: () => { tone(80, 0.8, 'sawtooth', 0.25, -40); noise(0.5, 0.2, 200) },
  select: () => tone(880, 0.06, 'square', 0.08),
  confirm: () => { tone(660, 0.07, 'square', 0.08); setTimeout(() => tone(990, 0.1, 'square', 0.08), 70) },
  win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'square', 0.08), i * 120)),
}

export function sfx(key: string) {
  if (!settings.sound) return
  try { SOUNDS[key]?.() } catch { /* 오디오 불가 환경 */ }
}
/** 브라우저 정책상 첫 터치 때 오디오를 깨움 */
export function unlockAudio() { if (settings.sound) ac() }
