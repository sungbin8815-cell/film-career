// 텍스트 렌더링: 조건부 조각 + {변수} 치환
//   text: '문자열' 또는 ['문자열', { when: {...}, text: '조건이 맞을 때만' }, ...]
//   변수: {peer} {senior} {director} {ceo} {actor} (인연 이름), {job} {field} {track} {title} {age}
import D from '../data/index.js'
import { test } from './conditions.js'
import { getJob, getField, getTrack } from './state.js'

export function render(text, s) {
  if (text == null) return ''
  if (Array.isArray(text)) {
    text = text.map((seg) => (typeof seg === 'string' ? seg : test(seg.when, s) ? seg.text ?? '' : '')).join('')
  }
  return String(text).replace(/\{(\w+)\}/g, (m, k) => {
    const npc = D.npcs.find((n) => n.id === k)
    if (npc) return npc.name
    switch (k) {
      case 'job': return getJob(s.job)?.name ?? '학생'
      case 'field': return getField(s.field)?.name ?? '영상'
      case 'track': return getTrack(s.track)?.name ?? '현장'
      case 'title': return s.seasonTitle ?? '이름 없는 작품'
      case 'age': return String(s.age)
      default: return m
    }
  })
}
