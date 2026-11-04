// 포켓몬식 턴제 결투. 데이터: data/minigames/duel.js
import D from '../../data/index.js'
import { register } from './registry.js'
import { h } from '../dom.js'

const G = D.minigames.duel
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function formula(f, stat) {
  let v = f.base
  for (const [id, k] of Object.entries(f.per ?? {})) v += stat(id) * k
  return Math.round(v)
}

register('duel', {
  title: G.title,
  run(root, params, ctx) {
    return new Promise((resolve) => {
      const foeDef = G.enemies[params.enemy] ?? Object.values(G.enemies)[0]
      const moves = G.moves[ctx.duelMoves] ?? G.moves.camera
      const me = { name: `나 (${ctx.rankName})`, hp: formula(G.player.hp, ctx.stat), guard: 0, blind: 0 }
      me.max = me.hp
      const foe = { name: foeDef.name, hp: foeDef.hp, max: foeDef.hp, guard: 0, blind: 0 }
      const fleeP = Math.min(90, formula(G.player.fleeChance, ctx.stat))
      let turn = 1
      let busy = false
      const log = [foeDef.intro]

      const bar = (f) => h('div', { class: 'hpbar' }, h('i', { style: `width:${Math.max(0, (100 * f.hp) / f.max)}%` }))
      const foeBox = h('div', { class: 'duel-side foe' })
      const meBox = h('div', { class: 'duel-side me' })
      const logBox = h('div', { class: 'duel-log', 'aria-live': 'polite' })
      const btns = h('div', { class: 'duel-moves' })

      function draw() {
        foeBox.replaceChildren(
          h('div', { class: 'duel-info' }, h('b', {}, foe.name), bar(foe), h('small', {}, `HP ${Math.max(0, foe.hp)}/${foe.max}`)),
          ctx.art(foeDef.image, 'duel-sprite'))
        meBox.replaceChildren(
          ctx.art(ctx.playerImage, 'duel-sprite'),
          h('div', { class: 'duel-info' }, h('b', {}, me.name), bar(me), h('small', {}, `HP ${Math.max(0, me.hp)}/${me.max}${me.guard ? ' 🛡️' : ''}`)))
        logBox.replaceChildren(...log.slice(-3).map((t) => h('p', {}, t)))
        btns.replaceChildren(
          ...moves.map((m) => h('button', { class: 'btn move', disabled: busy, onclick: () => act(m) },
            h('span', {}, `${m.emoji ?? ''} ${m.name}`), h('small', {}, moveHint(m)))),
          h('button', { class: 'btn ghost move', disabled: busy, onclick: flee }, h('span', {}, '🏃 도망친다'), h('small', {}, `성공률 ${fleeP}%`)))
      }

      const statName = (id) => D.config.stats.find((s) => s.id === id)?.name ?? id
      const moveHint = (m) => ({ attack: `위력 ${m.power} · 명중 ${m.acc}%`, guard: '다음 피해 감소', blind: '상대 명중 ↓', heal: '회복' }[m.type] + ` · ${statName(m.stat)}`)

      // 공통 기술 처리. power 배율 = 1 + 능력치/statScale
      function useMove(user, target, m, mult) {
        const acc = (m.acc ?? 100) - user.blind
        if (m.type !== 'guard' && m.type !== 'heal' && Math.random() * 100 >= acc) return `${user.name}의 ${m.name}! …빗나갔다.`
        if (m.type === 'attack') {
          let dmg = Math.round(m.power * mult * (0.85 + Math.random() * 0.3))
          if (target.guard) { dmg = Math.round(dmg * (1 - target.guard / 100)); target.guard = 0 }
          target.hp -= dmg
          return `${user.name}의 ${m.name}! ${dmg} 피해!`
        }
        if (m.type === 'guard') { user.guard = Math.min(80, Math.round(m.power * mult * 0.8)); return `${user.name}은(는) ${m.name}으로 몸을 숨겼다.` }
        if (m.type === 'blind') { target.blind = Math.min(50, target.blind + Math.round(m.power * mult * 0.6)); return `${m.name}! ${target.name}의 명중률이 떨어졌다.` }
        if (m.type === 'heal') { const v = Math.round(m.power * mult); user.hp = Math.min(user.max, user.hp + v); return `${user.name}의 ${m.name}. HP ${v} 회복.` }
        return ''
      }

      async function shake(el) {
        el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit')
      }

      async function act(m) {
        if (busy) return
        busy = true
        const hp0 = foe.hp
        log.push(useMove(me, foe, m, 1 + ctx.stat(m.stat) / G.statScale))
        draw(); if (foe.hp < hp0) shake(foeBox)
        await wait(650)
        if (foe.hp <= 0) return finish('win')
        const em = pickFoeMove()
        const myHp0 = me.hp
        log.push(useMove(foe, me, em, 1 + foeDef.statPower / G.statScale))
        draw(); if (me.hp < myHp0) shake(meBox)
        await wait(500)
        if (me.hp <= 0) return finish('lose')
        turn += 1
        busy = false
        draw()
      }

      function pickFoeMove() {
        const total = foeDef.moves.reduce((a, m) => a + (m.weight ?? 1), 0)
        let r = Math.random() * total
        for (const m of foeDef.moves) { r -= m.weight ?? 1; if (r < 0) return m }
        return foeDef.moves[0]
      }

      async function flee() {
        if (busy) return
        busy = true
        if (Math.random() * 100 < fleeP) {
          log.push('재빨리 장비 차 뒤로 도망쳤다!'); draw(); await wait(600)
          return finish('flee')
        }
        log.push('도망치려다 케이블에 걸렸다!')
        const em = pickFoeMove()
        log.push(useMove(foe, me, em, 1 + foeDef.statPower / G.statScale))
        draw(); shake(meBox); await wait(600)
        if (me.hp <= 0) return finish('lose')
        busy = false; draw()
      }

      async function finish(outcome) {
        const text = { win: `${foe.name}이(가) 쓰러졌다! ${turn}턴 만에 승리.`, lose: '눈앞이 깜깜해졌다…', flee: '무사히 빠져나왔다.' }[outcome]
        log.push(text); busy = true; draw()
        await wait(900)
        resolve({ outcome, summary: text })
      }

      root.replaceChildren(
        h('div', { class: 'duel' },
          h('div', { class: 'duel-title' }, `⚡ ${G.title} ⚡`),
          h('div', { class: 'duel-field', style: `background:${D.assets.duel_bg?.bg ?? '#401f1f'}` }, foeBox, meBox),
          logBox, btns))
      draw()
    })
  },
})
