// 1대1 격투 화면 (옆 시점, canvas). runBrawl(root, setup, onDone) → onDone({ result, hp })
import { brawlHit, foeHit } from './brawl-core.js'
import { getSprite } from './pixel.js'
import { h } from './dom.js'

const ATK = {
  punch:   { dur: 0.3, hitAt: 0.1, reach: 10, mul: 0.9, push: 3 },
  kick:    { dur: 0.48, hitAt: 0.22, reach: 12, mul: 1.3, push: 6 },
  special: { dur: 0.55, hitAt: 0.2, reach: 0, mul: 1, push: 9 },
}

export function runBrawl(root, setup, onDone) {
  const canvas = h('canvas', { class: 'arena', 'aria-label': '격투 화면' })
  const btns = {}
  const hold = {}
  const mk = (id, label, sub, { press, release } = {}) => {
    const b = h('button', { class: `abtn b-${id}`, 'aria-label': sub || label }, h('span', {}, label), sub ? h('small', {}, sub) : null)
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); hold[id] = true; press?.() })
    const up = () => { hold[id] = false; release?.() }
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up)
    btns[id] = b
    return b
  }
  const intro = h('div', { class: 'act-intro' },
    h('b', {}, `🥊 맞짱! vs ${setup.name}`),
    h('p', {}, '◀ ▶ 이동 · ⤒ 점프 · 🛡 누르는 동안 가드'),
    h('p', {}, '👊 펀치 · 🦵 킥 · 때리면 필살 게이지가 찬다'),
    h('p', { class: 'muted' }, `필살기: ${setup.special.emoji} ${setup.special.name}`),
    h('button', { class: 'btn primary', onclick: () => { intro.remove(); started = true; flash('ROUND 1 · FIGHT!') } }, '싸운다!'))
  const banner = h('div', { class: 'act-banner' })
  const stage = h('div', { class: 'act-stage' }, canvas, banner, intro)
  const pad = h('div', { class: 'br-pad' },
    h('div', { class: 'br-l' }, mk('left', '◀'), mk('jump', '⤒', '', { press: () => doJump() }), mk('right', '▶'), mk('guard', '🛡', '가드')),
    h('div', { class: 'br-r' }, mk('punch', '👊', '펀치', { press: () => doAtk('punch') }), mk('kick', '🦵', '킥', { press: () => doAtk('kick') }),
      mk('special', setup.special.emoji, '필살', { press: () => doSpecial() })))
  root.replaceChildren(h('div', { class: 'act br' }, stage, pad))

  const ctx = canvas.getContext('2d')
  let W = 0, H = 0, sc = 6, ground = 0
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    W = canvas.clientWidth; H = canvas.clientHeight
    canvas.width = W * dpr; canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    sc = Math.max(3, Math.floor(Math.min(H * 0.4 / 25, W / 60)))
    ground = Math.round(H * 0.86)
  }
  resize()
  window.addEventListener('resize', resize)

  const mkF = (x, face, hp, max) => ({ x, y: 0, vy: 0, face, hp, max, act: 'idle', actT: 0, hit: false, hurtT: 0, guard: false, walkT: 0, cd: 0 })
  const P = mkF(W * 0.28, 1, setup.player.hp, setup.player.maxHp)
  const F = mkF(W * 0.72, -1, setup.foe.hp, setup.foe.max)
  P.meter = 0
  const shots = []
  const floats = []
  let time = 0, started = false, ended = false, endT = 0, result = null, aiT = 0.6, shake = 0
  const keys = {}

  const kd = (e) => {
    const k = e.key.toLowerCase(); const down = e.type === 'keydown'
    if (k === 'a' || k === 'arrowleft') hold.left = down
    if (k === 'd' || k === 'arrowright') hold.right = down
    if (k === 's' || k === 'arrowdown') hold.guard = down
    if (!down || e.repeat) return
    if (k === 'w' || k === 'arrowup') doJump()
    if (k === 'j') doAtk('punch')
    if (k === 'k') doAtk('kick')
    if (k === 'l') doSpecial()
  }
  window.addEventListener('keydown', kd); window.addEventListener('keyup', kd)

  function flash(t, cls = '') { banner.textContent = t; banner.className = `act-banner show ${cls}`; setTimeout(() => { if (!ended) banner.className = 'act-banner' }, 900) }
  const float = (x, y, text, color) => floats.push({ x, y, text, color, t: 0 })
  const busy = (f) => f.act !== 'idle' && f.act !== 'walk' && f.act !== 'guard'
  const dist = () => Math.abs(F.x - P.x)

  function doAtk(kind, f = P) {
    if (!started || ended || busy(f) || f.hurtT > 0) return
    f.act = kind; f.actT = 0; f.hit = false
  }
  function doSpecial() {
    if (!started || ended || busy(P) || P.hurtT > 0 || P.meter < 100) return
    P.meter = 0; P.act = 'special'; P.actT = 0; P.hit = false
    flash(`${setup.special.emoji} ${setup.special.name}!`, 'sp'); shake = 0.25
  }
  function doJump(f = P) {
    if (!started || ended || f.y < 0 || busy(f)) return
    f.vy = -sc * 62; f.act = 'jump'; f.actT = 0
  }

  function land(atk, attacker, target, isPlayer) {
    const facing = Math.sign(attacker.x - target.x) === target.face
    const guarded = target.guard && facing && target.y === 0
    let dmg
    if (isPlayer) {
      const r = brawlHit(setup, atk === 'kick' ? setup.kick : atk === 'special' ? setup.special : setup.punch, guarded)
      dmg = r.dmg
      float(target.x, ground - sc * 26 + target.y, `${dmg}${r.crit ? '!' : ''}`, r.tag === 'weak' ? '#ffd84d' : '#fff')
      if (r.tag === 'weak' && Math.random() < 0.5) float(target.x, ground - sc * 30, '약점!', '#ffd84d')
      P.meter = Math.min(100, P.meter + (guarded ? 5 : 15))
    } else {
      dmg = foeHit(setup, ATK[atk].mul, guarded)
      float(target.x, ground - sc * 26 + target.y, `-${dmg}`, '#ff6b6b')
      P.meter = Math.min(100, P.meter + 7)
    }
    target.hp -= dmg
    if (guarded) { float(target.x, ground - sc * 20, '가드', '#74c0fc'); target.x += attacker.face * sc * 1.5 }
    else {
      target.hurtT = atk === 'special' ? 0.6 : 0.32; target.act = 'idle'
      target.x += attacker.face * sc * ATK[atk].push
      shake = Math.max(shake, atk === 'punch' ? 0.06 : 0.12)
    }
  }

  function stepFighter(f, dt, other, isPlayer) {
    f.cd = Math.max(0, f.cd - dt)
    if (f.y < 0 || f.vy < 0) { f.vy += sc * 190 * dt; f.y += f.vy * dt; if (f.y >= 0) { f.y = 0; f.vy = 0; if (f.act === 'jump') f.act = 'idle' } }
    if (f.hurtT > 0) { f.hurtT -= dt; return }
    if (f.y === 0) f.face = other.x > f.x ? 1 : -1
    if (['punch', 'kick', 'special'].includes(f.act)) {
      f.actT += dt
      const a = ATK[f.act]
      if (!f.hit && f.actT >= a.hitAt) {
        f.hit = true
        if (f.act === 'special') shots.push({ x: f.x + f.face * sc * 8, y: ground - sc * 14, dir: f.face, from: isPlayer ? 'P' : 'F' })
        else if (Math.abs(other.x - f.x) <= sc * (8 + a.reach) && Math.abs(other.y - f.y) < sc * 10) land(f.act, f, other, isPlayer)
      }
      if (f.actT >= a.dur) f.act = 'idle'
    }
  }

  function ai(dt) {
    aiT -= dt
    F.guard = false
    if (F.hurtT > 0 || busy(F)) return
    const d = dist()
    const pAtk = ['punch', 'kick', 'special'].includes(P.act)
    if (pAtk && d < sc * 22 && Math.random() < 0.5) { F.guard = true; return }
    if (aiT > 0) { if (d > sc * 17) { F.x += F.face * sc * 18 * dt; F.act = 'walk'; F.walkT += dt } else if (F.act === 'walk') F.act = 'idle'; return }
    aiT = setup.foe.think * (0.6 + Math.random() * 0.8)
    const r = Math.random()
    if (d < sc * 19) {
      if (r < 0.42) doAtk('punch', F)
      else if (r < 0.68) doAtk('kick', F)
      else if (r < 0.8) { F.x -= F.face * sc * 6 }
      else if (r < 0.88) doJump(F)
    } else if (r < 0.08) doJump(F)
  }

  function update(dt) {
    time += dt
    // 플레이어 이동·가드
    P.guard = !!hold.guard && !busy(P) && P.hurtT <= 0
    if (!busy(P) && P.hurtT <= 0 && !P.guard) {
      const mv = (hold.right ? 1 : 0) - (hold.left ? 1 : 0)
      if (mv) { P.x += mv * sc * 24 * dt; if (P.y === 0) { P.act = 'walk'; P.walkT += dt } }
      else if (P.act === 'walk') P.act = 'idle'
    }
    stepFighter(P, dt, F, true)
    ai(dt)
    stepFighter(F, dt, P, false)
    // 겹침 방지·경계
    const minGap = sc * 8
    if (Math.abs(F.x - P.x) < minGap && P.y === 0 && F.y === 0) { const push = (minGap - Math.abs(F.x - P.x)) / 2; const s = F.x > P.x ? 1 : -1; F.x += s * push; P.x -= s * push }
    for (const f of [P, F]) f.x = Math.max(sc * 6, Math.min(W - sc * 6, f.x))
    for (const s of shots) {
      s.x += s.dir * W * 0.9 * dt
      const tgt = s.from === 'P' ? F : P
      if (!s.done && Math.abs(s.x - tgt.x) < sc * 6 && tgt.y > -sc * 8) { s.done = true; land('special', s.from === 'P' ? P : F, tgt, s.from === 'P') }
      if (s.x < 0 || s.x > W) s.done = true
    }
    for (let i = shots.length - 1; i >= 0; i--) if (shots[i].done) shots.splice(i, 1)
    for (const f of floats) f.t += dt
    for (let i = floats.length - 1; i >= 0; i--) if (floats[i].t > 0.9) floats.splice(i, 1)
    shake = Math.max(0, shake - dt)
    if (!ended) {
      if (F.hp <= 0 || P.hp <= 0) finish(F.hp <= 0 ? 'win' : 'lose', 'K.O.!')
      else if (time >= setup.timeLimit) finish(P.hp / P.max >= F.hp / F.max ? 'win' : 'lose', 'TIME!')
    }
  }

  function finish(r, word) {
    ended = true; result = r
    banner.textContent = `${word} ${r === 'win' ? 'YOU WIN' : 'YOU LOSE'}`
    banner.className = `act-banner show ${r}`
    if (r === 'win') { P.act = 'win'; F.act = 'hurt' } else { F.act = 'win'; P.act = 'hurt' }
  }

  // ── 그리기 ──
  function poseOf(f) {
    if (ended) return f.act === 'win' ? 'win' : 'hurt'
    if (f.hurtT > 0) return 'hurt'
    if (f.guard) return 'guard'
    if (f.y < 0) return 'jump'
    if (f.act === 'punch' || f.act === 'special') return f.actT < ATK[f.act].dur * 0.7 ? 'punch' : 'idle'
    if (f.act === 'kick') return f.actT > 0.1 && f.actT < 0.4 ? 'kick' : 'idle'
    if (f.act === 'walk') return Math.floor(f.walkT * 8) % 2 ? 'walk1' : 'walk2'
    return 'idle'
  }
  function drawFighter(f, key) {
    const img = getSprite(key, poseOf(f))
    const w = img.width * sc, hh = img.height * sc
    ctx.save()
    ctx.translate(Math.round(f.x), Math.round(ground + f.y))
    if (f.face < 0) ctx.scale(-1, 1)
    if (f.hurtT > 0 && Math.floor(f.hurtT * 20) % 2) ctx.filter = 'brightness(2.4)'
    ctx.drawImage(img, Math.round(-w / 2), -hh + sc, w, hh)
    ctx.restore()
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath(); ctx.ellipse(f.x, ground + 2, sc * 6, sc * 1.4, 0, 0, Math.PI * 2); ctx.fill()
  }
  function bar(x, y, w, frac, color, rtl) {
    ctx.fillStyle = '#0a0912'; ctx.fillRect(x - 2, y - 2, w + 4, 14)
    ctx.fillStyle = '#5a2a2a'; ctx.fillRect(x, y, w, 10)
    ctx.fillStyle = color
    const fw = Math.max(0, w * frac)
    ctx.fillRect(rtl ? x + w - fw : x, y, fw, 10)
  }
  function draw() {
    ctx.imageSmoothingEnabled = false
    const ox = shake > 0 ? (Math.random() - 0.5) * 8 : 0
    ctx.save(); ctx.translate(ox, 0)
    const g = ctx.createLinearGradient(0, 0, 0, ground)
    g.addColorStop(0, '#2a2445'); g.addColorStop(1, '#4a3a6a')
    ctx.fillStyle = g; ctx.fillRect(-10, 0, W + 20, ground)
    // 스튜디오 뒷벽 조명·장비
    for (let i = 0; i < 4; i++) { const p = getSprite(`prop:${['lamp', 'camera', 'box', 'lamp'][i]}`); const s2 = Math.max(2, sc - 2); ctx.drawImage(p, W * (0.1 + i * 0.27), ground - p.height * s2 - sc * 4, p.width * s2, p.height * s2) }
    ctx.fillStyle = '#3b2f2a'; ctx.fillRect(-10, ground, W + 20, H - ground)
    ctx.fillStyle = '#4a3b33'
    for (let x = 0; x < W + 20; x += sc * 6) ctx.fillRect(x - ((Math.floor(x / (sc * 6)) % 2) ? 0 : sc * 3), ground + sc * 2, sc * 3, sc)
    drawFighter(F, `enemy:${setup.enemyId}`)
    drawFighter(P, `job:${setup.player.job}`)
    ctx.font = `${sc * 5}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    for (const s of shots) ctx.fillText(setup.special.emoji, s.x, s.y)
    ctx.font = `bold ${Math.max(14, sc * 3)}px Galmuri11, sans-serif`
    for (const f of floats) { ctx.globalAlpha = 1 - f.t / 0.9; ctx.fillStyle = '#000'; ctx.fillText(f.text, f.x + 1, f.y - f.t * 30 + 1); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y - f.t * 30); ctx.globalAlpha = 1 }
    ctx.restore()
    // HUD
    const bw = W * 0.38
    bar(10, 12, bw, P.hp / P.max, '#ffd43b', false)
    bar(W - 10 - bw, 12, bw, F.hp / F.max, '#ffd43b', true)
    ctx.fillStyle = '#6bb6ff'; ctx.fillRect(10, 28, bw * (P.meter / 100), 5)
    ctx.strokeStyle = '#0a0912'; ctx.strokeRect(10, 28, bw, 5)
    ctx.font = 'bold 11px Galmuri11, sans-serif'; ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'
    ctx.textAlign = 'left'; ctx.fillText(`${setup.player.name} Lv${setup.player.level}`, 10, 38)
    ctx.textAlign = 'right'; ctx.fillText(`${setup.name} Lv${setup.level}`, W - 10, 30)
    ctx.textAlign = 'center'; ctx.font = 'bold 18px Galmuri11, sans-serif'; ctx.fillStyle = '#ffd43b'
    ctx.fillText(String(Math.max(0, Math.ceil(setup.timeLimit - time))), W / 2, 8)
    if (P.meter >= 100) { ctx.font = 'bold 10px Galmuri11, sans-serif'; ctx.fillStyle = '#74c0fc'; ctx.textAlign = 'left'; ctx.fillText('필살 OK!', 10 + bw * 0.62, 28) }
    btns.special.disabled = P.meter < 100
  }

  let last = performance.now(), raf = 0
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now
    if (started && !ended) update(dt)
    draw()
    if (ended) { endT += dt; if (endT > 1.6) return cleanup() }
    raf = requestAnimationFrame(frame)
  }
  function cleanup() {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    window.removeEventListener('keydown', kd); window.removeEventListener('keyup', kd)
    onDone({ result, hp: Math.max(result === 'win' ? 1 : 0, Math.round(P.hp)) })
  }
  raf = requestAnimationFrame(frame)
}
