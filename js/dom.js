// 아주 작은 DOM 헬퍼 + 그래픽 자리 표시
import D from '../data/index.js'

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v)
    else if (k === 'class') el.className = v
    else if (k === 'html') el.innerHTML = v
    else el.setAttribute(k, v === true ? '' : v)
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue
    el.append(c instanceof Node ? c : document.createTextNode(String(c)))
  }
  return el
}

// data/assets.js의 키로 그림 박스를 만듭니다. img가 있으면 이미지, 없거나 실패하면 이모지.
export function art(key, cls = '') {
  const a = D.assets[key] ?? { emoji: '❔', bg: '#333' }
  const box = h('div', { class: `art ${cls}`, style: `background:${a.bg ?? '#333'}`, 'aria-hidden': 'true' })
  const fallback = () => box.replaceChildren(h('span', { class: 'art-emoji' }, a.emoji ?? '❔'))
  if (a.img) {
    const img = h('img', { src: a.img, alt: '' })
    img.addEventListener('error', fallback, { once: true })
    box.append(img)
  } else fallback()
  return box
}
