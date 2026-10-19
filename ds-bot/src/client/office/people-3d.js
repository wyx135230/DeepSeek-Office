import { ARCH } from './model-kit.js'
import { characterPreset } from './cast.js'

const SKIN = { peach: '#e9bea1', honey: '#c99a73', bronze: '#aa7859', coffee: '#795442' }
const HAIR = { Brown: '#58483c', Black: '#2e3031', Blonde: '#bca574', Charcoal: '#454b4f', 'Ash Brown': '#7b7263' }
const SHIRT = { Fern: '#718b75', Coral: '#bd9085', Denim: '#557991', Mustard: '#b5a06b' }

export function makePerson(kit, scene, bot, visitor = false) {
  const preset = characterPreset(bot), appearance = preset.appearance ?? {}, skin = SKIN[preset.skin] ?? SKIN.peach
  const hair = appearance.hairColor ?? HAIR[preset.hairColor] ?? '#554a3f'
  const shirt = appearance.shirtColor ?? SHIRT[preset.clothingColor] ?? '#76918e'
  const pants = appearance.pantsColor ?? '#46515d', shoes = appearance.shoesColor ?? '#30383e'
  const root = kit.group(scene), body = kit.group(root)
  if (!visitor) root.userData.targetId = bot.id
  const ring = kit.cylinder(root, 0, .4, 0, 8, 8, .4, visitor ? '#6a9cba' : '#c5a568', 32)
  ring.visible = visitor
  const torso = kit.box(body, 0, 27, 0, 11, 16, 6.5, shirt, 2)
  kit.box(torso, 0, -3, 3.4, .7, 11, .15, '#cbd4cc')
  kit.box(body, -2.8, 34, 3, 3, 2, 1, ARCH.paper, .3).rotation.z = .4
  kit.box(body, 2.8, 34, 3, 3, 2, 1, ARCH.paper, .3).rotation.z = -.4
  kit.cylinder(body, 0, 36.5, 0, 2.3, 2.3, 3, skin)
  const head = kit.group(body, 0, 42, 0)
  kit.sphere(head, 0, 0, 0, 5.7, 6.8, 5.1, skin)
  kit.sphere(head, 0, 2.8, -.9, 6, 4.7, 5.2, hair)
  kit.sphere(head, -4.7, .3, -.2, 1.2, 3.9, 3.8, hair)
  if (['side-bob', 'bun', 'natural'].includes(preset.hair)) kit.sphere(head, 4.4, -1.5, -1.8, 2.1, 5, 3.6, hair)
  if (preset.hair === 'bun') kit.sphere(head, 0, 6.7, -2, 3.1, 2.8, 3, hair)
  for (const x of [-2, 2]) { kit.sphere(head, x, -.4, 4.6, .42, .55, .25, '#343c40'); kit.sphere(head, x * 2.9, -.6, .3, 1, 1.5, .8, skin) }
  kit.sphere(head, 0, -1.1, 4.9, .65, .9, .6, skin)
  kit.box(head, .1, -2.8, 4.6, 1.8, .25, .3, '#b17f68', .1)
  if (appearance.accessories?.includes('glasses') || preset.hair === 'parted') {
    for (const x of [-2.1, 2.1]) { kit.box(head, x, -.4, 5.1, 3.3, 2.4, .3, '#4f5a60', .5); kit.box(head, x, -.4, 5.3, 2.7, 1.8, .1, '#a1b8b0', .3) }
    kit.box(head, 0, -.3, 5.4, 1, .3, .3, '#4f5a60')
  }
  if (appearance.accessories?.includes('name-badge')) kit.box(body, -3, 29, 3.5, 3, 3.5, .3, ARCH.paper, .2)
  if (appearance.accessories?.includes('scarf')) kit.box(body, 0, 34, 1, 8, 2.5, 7, '#b9a47a', 1)
  if (appearance.accessories?.includes('hair-clip')) kit.box(head, 4, 3, 3.5, 2.5, 1, 1, '#c8aa6f', .3)
  const legs = [], knees = [], arms = []
  for (const side of [-1, 1]) {
    const leg = kit.group(body, side * 2.8, 20, 0)
    kit.box(leg, 0, -4, 0, 4.2, 8, 4.3, pants, .9)
    const knee = kit.group(leg, 0, -8, 0)
    kit.box(knee, 0, -4, 0, 3.8, 8, 4, pants, .8)
    kit.box(knee, 0, -9, 1.2, 4.5, 3, 7, shoes, .8)
    knees.push(knee)
    legs.push(leg)
    const arm = kit.group(body, side * 7, 33, 0)
    kit.box(arm, 0, -5, 0, 3.6, 10, 4, shirt, 1.3)
    kit.box(arm, 0, -11.5, 0, 2.8, 4.5, 3, skin, 1)
    arms.push(arm)
  }
  const item = kit.group(body, 0, 24, 9)
  kit.box(item, 0, 0, 0, 11, .9, 8, '#af9770', .3)
  kit.box(item, 0, .6, 0, 10, .25, 7, ARCH.paper)
  item.visible = false
  const badge = kit.sphere(root, 0, 54, 0, 2.2, 2.2, 2.2, '#e4b767')
  badge.visible = false
  return { root, presetId: preset.id,
    update(actor, time, quiet, selected) {
      root.position.set(actor.sprite.x, 0, actor.sprite.y)
      const speed = actor.sprite.body.enable ? actor.sprite.body.speed : 0
      const direction = { down: 0, up: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 }[actor.direction] ?? 0
      const velocity = actor.sprite.body.velocity
      body.rotation.y = speed > 2 ? Math.atan2(velocity.x, velocity.y) : direction
      const seated = Boolean(actor.exit)
      const walk = quiet || speed < 2 ? 0 : Math.sin(time * (speed > 110 ? .018 : .013)) * .46
      legs[0].rotation.x = seated ? -1.4 : walk; legs[1].rotation.x = seated ? -1.4 : -walk
      for (const knee of knees) knee.rotation.x = seated ? 1.4 : 0
      const using = ['working', 'typing', 'reading', 'coffee', 'drink', 'meal', 'arcade'].includes(actor.activity)
      const exercise = !quiet && actor.activity === 'exercise' ? .6 + Math.sin(time * .006) * .7 : 0
      arms[0].rotation.x = using ? -1.05 : exercise || -walk * .65
      arms[1].rotation.x = using ? -1.05 : exercise || walk * .65
      body.position.y = (seated ? -7 : 0) + (!quiet && speed > 2 ? Math.abs(walk) * 1.2 : 0)
      item.visible = ['reading', 'meal'].includes(actor.activity)
      ring.visible = visitor || selected
      badge.visible = actor.state === 'waiting'
    },
    dispose() { root.removeFromParent() },
  }
}

export function makeDog(kit, scene) {
  const root = kit.group(scene)
  kit.box(root, 0, 7, 0, 11, 8, 17, '#c4ab83', 3)
  kit.sphere(root, 0, 12, 7, 6, 6, 5, '#d0bb97')
  kit.sphere(root, 0, 11, 11, 3, 2.5, 3, '#ebe0c8')
  kit.sphere(root, 0, 12, 13, 1.4, 1, 1, '#384249')
  for (const x of [-4, 4]) { kit.sphere(root, x, 13, 2, 2, 4, 3, '#8f7558'); kit.sphere(root, x * .65, 14, 10, .7, .8, .5, '#28373d'); for (const z of [-5, 5]) kit.box(root, x, 3, z, 3, 6, 3, '#c2a882', 1) }
  const tail = kit.group(root, 0, 10, -8)
  kit.sphere(tail, 0, 3, -2, 1.6, 4, 1.6, '#b49b76')
  root.userData.targetId = 'dog'
  return { root, update(actor, time, quiet) { root.position.set(actor.sprite.x, 0, actor.sprite.y); tail.rotation.z = quiet ? 0 : Math.sin(time * .008) * .45 } }
}
