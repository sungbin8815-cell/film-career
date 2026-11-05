// 1대다수 액션 전투 화면 (3인칭 등 뒤 시점, canvas). 외부 라이브러리 없음.
// runAction(root, setup, onDone) — 끝나면 onDone({ result, hp, mp, bag, kills, money })
import { strike } from './action-core.js'
import { h } from './dom.js'
import { getSprite } from './pixel.js'

const ARENA = { minX: -7, maxX: 7, minZ: 0, maxZ: 30 }
const CAM = { back: 5.6, height: 3.3 }
const PROPS = [
  { x: -7.6, z: 4, p: 'lamp' }, { x: 7.6, z: 7, p: 'camera' }, { x: -7.6, z: 12, p: 'chair' }, { x: 7.6, z: 15, p: 'lamp' },
  { x: -7.6, z: 20, p: 'box' }, { x: 7.6, z: 23, p: 'box' }, { x: -7.6, z: 27, p: 'camera' }, { x: 7.6, z: 29, p: 'lamp' },
]

export function runAction(root, setup, onDone) {
  const P = { x: 0, z: 2.5, fx: 0, fz: 1, atkT: 0, moving: false, walkT: 0, hp: setup.player.hp, mp: setup.player.mp, rollT: 0, shieldT: 0, buffT: 0, buff: 0, hurtT: 0 }
  const mobs = setup.mobs.map((m, i) => ({ ...m, x: -5 + (10 * i) / Math.max(1, setup.mobs.length - 1) + (Math.random() - 0.5), z: 10 + Math.random() * 8, hitT: 0, stunT: 0, slowT: 0, weakT: 0, weakPct: 0, atkCd: 1 + Math.random() }))
  const floats = []
  const rings = []
  const shots = []
  const cd = {}
  const moves = setup.moves
  const basic = moves.find((m) => m.basic)
  const skills = moves.filter((m) => !m.basic).slice(0, 3)
  let bag = setup.bag
  let money = 0
  let time = 0
  let ended = false
  let endT = 0
  let result = null
  let started = false
  const joy = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 }
  const keys = {}

  // ── DOM ──
  const canvas = h('canvas', { class: 'arena', 'aria-label': '액션 전투 화면' })
  const hpBar = h('i'); const mpBar = h('i')
  const info = h('div', { class: 'act-info' })
  const timer = h('b', { class: 'act-time' })
  const stick = h('div', { class: 'stick' }, h('i'))
  const btns = {}
  const mkBtn = (id, label, sub, onPress) => {
    const b = h('button', { class: `abtn a-${id}`, 'aria-label': label }, h('span', {}, label), sub ? h('small', {}, sub) : null, h('em', { class: 'cdv' }))
    b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); onPress() })
    btns[id] = b
    return b
  }
  const pad = h('div', { class: 'act-pad' },
    mkBtn('atk', `${basic.emoji}`, '공격', () => doBasic()),
    ...skills.map((m, i) => mkBtn(`s${i}`, m.emoji, `${m.name.slice(0, 6)} ${m.mp}`, () => doSkill(m, `s${i}`))),
    mkBtn('roll', '🌀', '구르기', () => doRoll()),
    mkBtn('bag', '🧃', `박카스 ${bag}`, () => doPotion()))
  const intro = h('div', { class: 'act-intro' },
    h('b', {}, `⚔️ 현장 난전! ${setup.emoji} ${setup.name} 등 ×${mobs.length}`),
    h('p', {}, '왼쪽: 끌어서 이동 · 오른쪽: 공격·스킬'),
    h('p', { class: 'muted' }, '약점 속성 스킬은 1.5배! 구르기 중엔 무적.'),
    h('button', { class: 'btn primary', onclick: () => { intro.remove(); started = true } }, '액션!'))
  const wrap = h('div', { class: 'act' },
    h('div', { class: 'act-top' },
      h('div', { class: 'bar hp' }, hpBar, h('span', { class: 'hpv' })),
      h('div', { class: 'bar mp' }, mpBar, h('span', { class: 'mpv' })),
      info, timer),
    h('div', { class: 'act-stage' }, canvas, stick, intro),
    pad)
  root.replaceChildren(wrap)

  const ctx = canvas.getContext('2d')
  let W = 0, H = 0, dpr = 1
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1)
    W = canvas.clientWidth; H = canvas.clientHeight
    canvas.width = W * dpr; canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  window.addEventListener('resize', resize)

  // ── 입력 ──
  const stage = wrap.querySelector('.act-stage')
  stage.addEventListener('pointerdown', (e) => {
    if (joy.id != null || e.target.closest('.act-intro')) return
    joy.id = e.pointerId; const r = stage.getBoundingClientRect(); joy.ox = e.clientX - r.left; joy.oy = e.clientY - r.top; joy.dx = joy.dy = 0
    stage.setPointerCapture(e.pointerId)
    stick.style.left = `${joy.ox}px`; stick.style.top = `${joy.oy}px`; stick.classList.add('on')
  })
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joy.id) return
    const r = stage.getBoundingClientRect()
    let dx = e.clientX - r.left - joy.ox, dy = e.clientY - r.top - joy.oy
    const len = Math.hypot(dx, dy), max = 46
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max }
    joy.dx = dx / max; joy.dy = dy / max
    stick.firstChild.style.transform = `translate(${dx}px, ${dy}px)`
  })
  const release = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.dx = joy.dy = 0; stick.classList.remove('on'); stick.firstChild.style.transform = '' }
  stage.addEventListener('pointerup', release); stage.addEventListener('pointercancel', release)
  const kd = (e) => {
    keys[e.key.toLowerCase()] = e.type === 'keydown'
    if (e.type !== 'keydown' || !started) return
    if (e.key === ' ' || e.key === 'j') doBasic()
    if (e.key === 'k' && skills[0]) doSkill(skills[0], 's0')
    if (e.key === 'l' && skills[1]) doSkill(skills[1], 's1')
    if (e.key === ';' && skills[2]) doSkill(skills[2], 's2')
    if (e.key === 'shift') doRoll()
  }
  window.addEventListener('keydown', kd); window.addEventListener('keyup', kd)

  // ── 행동 ──
  const alive = () => mobs.filter((m) => m.hp > 0)
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
  const nearest = () => alive().sort((a, b) => dist(a, P) - dist(b, P))[0]
  const float = (x, z, text, color) => floats.push({ x, z, text, color, t: 0 })
  function damage(mob, move, mul = 1) {
    const r = strike(setup, move, mob, mul * (1 + P.buff))
    mob.hp -= r.dmg; mob.hitT = 0.18
    float(mob.x, mob.z, `${r.dmg}${r.crit ? '!' : ''}`, r.tag === 'weak' ? '#ffd84d' : r.tag === 'resist' ? '#a9a3bd' : '#fff')
    if (r.tag === 'weak' && Math.random() < 0.4) float(mob.x, mob.z + 0.3, '약점!', '#ffd84d')
  }
  function doBasic() {
    if (!started || ended || (cd.atk ?? 0) > 0) return
    cd.atk = 0.42; P.atkT = 0.18
    const n = nearest()
    if (n && dist(n, P) < 3) { P.fx = (n.x - P.x) / dist(n, P); P.fz = (n.z - P.z) / dist(n, P) }
    let hit = 0
    for (const m of alive()) {
      const d = dist(m, P)
      if (d > 2.2) continue
      const dot = ((m.x - P.x) * P.fx + (m.z - P.z) * P.fz) / Math.max(0.01, d)
      if (dot > 0.3 || d < 1) { damage(m, basic); hit++ }
    }
    rings.push({ x: P.x + P.fx * 1.1, z: P.z + P.fz * 1.1, r: 0.2, max: 1.3, t: 0, color: '255,255,255' })
    if (!hit && n && dist(n, P) < 2.8) damage(n, basic)
  }
  function doSkill(m, key) {
    if (!started || ended || (cd[key] ?? 0) > 0 || P.mp < m.mp) return
    P.mp -= m.mp; cd[key] = 2.4; P.atkT = 0.25
    if (['attack', 'gold', 'stun'].includes(m.type)) {
      if (m.hits > 1) {
        const targets = alive().sort((a, b) => dist(a, P) - dist(b, P))
        for (let i = 0; i < m.hits; i++) {
          const t = targets[i % Math.max(1, targets.length)]
          if (t) shots.push({ x: P.x, z: P.z, target: t, move: m, emoji: m.emoji, delay: i * 0.12 })
        }
      } else {
        rings.push({ x: P.x, z: P.z, r: 0.3, max: 3.4, t: 0, color: m.type === 'stun' ? '107,182,255' : '255,204,77' })
        for (const t of alive()) if (dist(t, P) < 3.4) {
          damage(t, m)
          if (m.type === 'stun') t.stunT = 2
        }
        if (m.type === 'gold') { money += m.gold; float(P.x, P.z + 0.5, `💰+${m.gold}`, '#ffd84d') }
      }
    } else if (m.type === 'heal') { P.hp = Math.min(setup.player.maxHp, P.hp + m.heal); float(P.x, P.z, `+${m.heal}`, '#7ee08a') }
    else if (m.type === 'mana') { P.mp = Math.min(setup.player.maxMp, P.mp + m.heal); float(P.x, P.z, `MP+${m.heal}`, '#6bb6ff') }
    else if (m.type === 'guard') { P.shieldT = 3.5; float(P.x, P.z, '🛡️ 막기', '#6bb6ff') }
    else if (m.type === 'buff') { P.buff = m.pct; P.buffT = 5; float(P.x, P.z, '🔥 강화', '#ff9f43') }
    else if (m.type === 'debuff') { for (const t of alive()) { t.slowT = 4; t.weakT = 4; t.weakPct = Math.min(0.7, m.pct) } rings.push({ x: P.x, z: P.z, r: 0.3, max: 6, t: 0, color: '197,155,255' }) }
  }
  function doRoll() {
    if (!started || ended || (cd.roll ?? 0) > 0) return
    cd.roll = 1.1; P.rollT = 0.35
  }
  function doPotion() {
    if (!started || ended || bag <= 0) return
    bag--; P.hp = Math.min(setup.player.maxHp, P.hp + setup.player.maxHp * setup.potion.heal); P.mp = Math.min(setup.player.maxMp, P.mp + setup.player.maxMp * setup.potion.mana)
    float(P.x, P.z, '🧃 회복', '#7ee08a')
  }

  // ── 갱신 ──
  function update(dt) {
    time += dt
    for (const k in cd) cd[k] = Math.max(0, cd[k] - dt)
    let mx = joy.dx, mz = -joy.dy
    if (keys.a || keys.arrowleft) mx = -1; if (keys.d || keys.arrowright) mx = 1
    if (keys.w || keys.arrowup) mz = 1; if (keys.s || keys.arrowdown) mz = -1
    const ml = Math.hypot(mx, mz)
    let speed = 3.6
    if (P.rollT > 0) { P.rollT -= dt; speed = 10 }
    if (ml > 0.15) { P.fx = mx / ml; P.fz = mz / ml }
    P.moving = ml > 0.15
    if (P.moving) P.walkT += dt
    if (P.atkT > 0) P.atkT -= dt
    if (ml > 0.15 || P.rollT > 0) {
      const k = P.rollT > 0 ? 1 : Math.min(1, ml)
      P.x += P.fx * speed * k * dt; P.z += P.fz * speed * k * dt
    }
    P.x = Math.max(ARENA.minX, Math.min(ARENA.maxX, P.x)); P.z = Math.max(ARENA.minZ, Math.min(ARENA.maxZ, P.z))
    if (P.shieldT > 0) P.shieldT -= dt
    if (P.buffT > 0 && (P.buffT -= dt) <= 0) P.buff = 0
    if (P.hurtT > 0) P.hurtT -= dt
    P.mp = Math.min(setup.player.maxMp, P.mp + setup.mpRegen * dt)

    for (const m of alive()) {
      m.hitT = Math.max(0, m.hitT - dt)
      if (m.stunT > 0) { m.stunT -= dt; continue }
      if (m.slowT > 0) m.slowT -= dt
      if (m.weakT > 0) m.weakT -= dt
      const d = dist(m, P)
      if (d > 0.95) {
        const sp = m.speed * (m.slowT > 0 ? 0.45 : 1) * dt
        m.x += ((P.x - m.x) / d) * sp; m.z += ((P.z - m.z) / d) * sp
      }
      for (const o of alive()) if (o !== m) {
        const dd = dist(m, o)
        if (dd < 0.8 && dd > 0.001) { m.x += ((m.x - o.x) / dd) * 0.5 * dt; m.z += ((m.z - o.z) / dd) * 0.5 * dt }
      }
      m.atkCd -= dt
      if (d < 1.1 && m.atkCd <= 0) {
        m.atkCd = 1.45
        if (P.rollT > 0) { float(P.x, P.z, '회피!', '#a9a3bd'); continue }
        let dmg = m.atk * (m.weakT > 0 ? 1 - m.weakPct : 1)
        if (P.shieldT > 0) dmg *= 0.35
        dmg = Math.max(1, Math.round(dmg) - setup.player.def)
        P.hp -= dmg; P.hurtT = 0.2
        float(P.x, P.z - 0.2, `-${dmg}`, '#ff6b6b')
      }
    }
    for (const s of shots) {
      if (s.delay > 0) { s.delay -= dt; continue }
      const t = s.target
      const d = Math.hypot(t.x - s.x, t.z - s.z)
      if (d < 0.4 || t.hp <= 0) { if (t.hp > 0) damage(t, s.move); s.done = true; continue }
      s.x += ((t.x - s.x) / d) * 14 * dt; s.z += ((t.z - s.z) / d) * 14 * dt
    }
    for (let i = shots.length - 1; i >= 0; i--) if (shots[i].done) shots.splice(i, 1)
    for (const r of rings) r.t += dt
    for (let i = rings.length - 1; i >= 0; i--) if (rings[i].t > 0.35) rings.splice(i, 1)
    for (const f of floats) f.t += dt
    for (let i = floats.length - 1; i >= 0; i--) if (floats[i].t > 0.9) floats.splice(i, 1)

    if (!ended) {
      if (!alive().length) finish('win')
      else if (P.hp <= 0) { P.hp = 0; finish('lose') }
      else if (time > setup.timeLimit) finish('lose')
    }
  }

  function finish(r) {
    ended = true; result = r; endT = 0
    const banner = h('div', { class: `act-banner ${r}` }, r === 'win' ? '컷! 오케이!' : time > setup.timeLimit ? '시간 초과…' : '촬영 지연…')
    stage.appendChild(banner)
  }

  // ── 그리기 ──
  function draw() {
    const camX = P.x * 0.85, camZ = P.z - CAM.back
    const horizon = H * 0.2, F = H * 0.85
    const proj = (x, z) => { const rz = z - camZ; if (rz < 0.5) return null; const sc = F / rz; return { x: W / 2 + (x - camX) * sc, y: horizon + CAM.height * sc, sc } }
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#1a1730'); g.addColorStop(0.2, '#2a2445'); g.addColorStop(0.21, '#3b3550'); g.addColorStop(1, '#4a4060')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1
    for (let z = Math.ceil(camZ + 0.6); z < camZ + 32; z++) {
      const a = proj(ARENA.minX, z), b = proj(ARENA.maxX, z)
      if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke() }
    }
    for (let x = ARENA.minX; x <= ARENA.maxX; x++) {
      const a = proj(x, camZ + 0.6), b = proj(x, camZ + 32)
      if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke() }
    }
    for (const r of rings) {
      const c = proj(r.x, r.z); if (!c) continue
      const rad = (r.r + (r.max - r.r) * (r.t / 0.35)) * c.sc
      ctx.strokeStyle = `rgba(${r.color},${1 - r.t / 0.35})`; ctx.lineWidth = 3
      ctx.beginPath(); ctx.ellipse(c.x, c.y, rad, rad * 0.32, 0, 0, Math.PI * 2); ctx.stroke()
    }
    const pose = P.hurtT > 0 ? 'hurt' : P.atkT > 0 ? 'punch' : P.rollT > 0 ? 'jump' : P.moving ? (Math.floor(P.walkT * 8) % 2 ? 'walk1' : 'walk2') : 'idle'
    const sprites = [
      ...PROPS.map((p) => ({ x: p.x, z: p.z, img: getSprite(`prop:${p.p}`), hgt: 1.6, prop: true })),
      ...alive().map((m) => ({ x: m.x, z: m.z, img: getSprite(`enemy:${m.id}`, m.hitT > 0 ? 'hurt' : 'idle'), hgt: m.human ? 1.7 : 1.05, mob: m, flip: m.x > P.x })),
      { x: P.x, z: P.z, img: getSprite(`job:${setup.player.job}`, pose), hgt: 1.7, me: true, flip: P.fx < -0.2 },
      ...shots.filter((s) => s.delay <= 0).map((s) => ({ x: s.x, z: s.z, emoji: s.emoji, hgt: 0.5, lift: 0.8 })),
    ].sort((a, b) => b.z - a.z)
    ctx.imageSmoothingEnabled = false
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    for (const s of sprites) {
      const c = proj(s.x, s.z); if (!c) continue
      const size = s.hgt * c.sc
      if (!s.prop) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(c.x, c.y, size * 0.3, size * 0.08, 0, 0, Math.PI * 2); ctx.fill() }
      const y = c.y - (s.lift ?? 0) * c.sc
      if (s.img) {
        const hh = size, ww = (s.img.width / s.img.height) * hh
        ctx.save()
        ctx.globalAlpha = s.me && P.rollT > 0 ? 0.55 : 1
        ctx.translate(Math.round(c.x + ((s.mob?.hitT > 0 || (s.me && P.hurtT > 0)) ? (Math.random() - 0.5) * 4 : 0)), Math.round(y))
        if (s.flip) ctx.scale(-1, 1)
        if (s.mob?.hitT > 0 || (s.me && P.hurtT > 0)) ctx.filter = 'brightness(2.2)'
        ctx.drawImage(s.img, Math.round(-ww / 2), Math.round(-hh), Math.round(ww), Math.round(hh))
        ctx.restore()
      } else {
        ctx.font = `${Math.max(8, size)}px sans-serif`
        ctx.fillText(s.emoji, c.x, y)
      }
      if (s.mob) {
        const w = Math.max(18, size * 0.8), yy = c.y - size * 1.08
        ctx.fillStyle = '#0a0912'; ctx.fillRect(c.x - w / 2, yy, w, 4)
        ctx.fillStyle = '#ff6b6b'; ctx.fillRect(c.x - w / 2, yy, w * Math.max(0, s.mob.hp / s.mob.max), 4)
        if (s.mob.stunT > 0) { ctx.font = `${Math.max(10, size * 0.3)}px sans-serif`; ctx.fillText('💫', c.x, yy - 2) }
      }
      if (s.me && P.shieldT > 0) { ctx.strokeStyle = 'rgba(107,182,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y - size * 0.5, size * 0.55, 0, Math.PI * 2); ctx.stroke() }
    }
    for (const f of floats) {
      const c = proj(f.x, f.z); if (!c) continue
      ctx.globalAlpha = 1 - f.t / 0.9
      ctx.font = `bold ${Math.max(12, c.sc * 0.4)}px Galmuri11, sans-serif`
      ctx.fillStyle = '#000'; ctx.fillText(f.text, c.x + 1, c.y - c.sc * (1.1 + f.t) + 1)
      ctx.fillStyle = f.color; ctx.fillText(f.text, c.x, c.y - c.sc * (1.1 + f.t))
      ctx.globalAlpha = 1
    }
  }

  function syncUi() {
    const mh = setup.player.maxHp, mm = setup.player.maxMp
    hpBar.style.width = `${(100 * Math.max(0, P.hp)) / mh}%`; mpBar.style.width = `${(100 * P.mp) / mm}%`
    wrap.querySelector('.hpv').textContent = `${Math.max(0, Math.round(P.hp))}/${mh}`
    wrap.querySelector('.mpv').textContent = `${Math.round(P.mp)}/${mm}`
    info.textContent = `남은 적 ${alive().length}`
    timer.textContent = `${Math.max(0, Math.ceil(setup.timeLimit - time))}s`
    const set = (id, c, dis) => { const b = btns[id]; if (!b) return; b.disabled = dis; b.querySelector('.cdv').style.height = `${Math.min(100, c * 100)}%` }
    set('atk', (cd.atk ?? 0) / 0.42, false)
    skills.forEach((m, i) => set(`s${i}`, (cd[`s${i}`] ?? 0) / 2.4, P.mp < m.mp))
    set('roll', (cd.roll ?? 0) / 1.1, false)
    set('bag', 0, bag <= 0)
    if (btns.bag) btns.bag.querySelector('small').textContent = `박카스 ${bag}`
  }

  let last = performance.now()
  let raf = 0
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now
    if (started) update(dt)
    draw(); syncUi()
    if (ended) {
      endT += dt
      if (endT > 1.2) return cleanup()
    }
    raf = requestAnimationFrame(frame)
  }
  function cleanup() {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    window.removeEventListener('keydown', kd); window.removeEventListener('keyup', kd)
    onDone({ result, hp: Math.max(result === 'win' ? 1 : 0, Math.round(P.hp)), mp: Math.round(P.mp), bag, kills: mobs.filter((m) => m.hp <= 0).length, money })
  }
  raf = requestAnimationFrame(frame)
}
