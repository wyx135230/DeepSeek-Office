import dog from '../assets/ninja/character-dog.png'
import campusProps from '../assets/custom/campus-props.png'
import { CAST_ASSETS, characterLayers } from './cast.js'
import { hashOf } from '../../shared/office.js'
import { CHARACTER, DIRECTIONS, POSES } from '../../shared/office/character.js'
export { DIRECTIONS }
import a_desk from '../assets/lpc/desk.png'
import a_shelf from '../assets/lpc/shelf.png'
import a_counter from '../assets/lpc/counter.png'
import a_armchair from '../assets/lpc/armchair.png'
import a_sofa from '../assets/lpc/sofa.png'
import a_planter from '../assets/lpc/planter.png'
import a_coffee from '../assets/lpc/coffee.png'
import a_laptop from '../assets/lpc/laptop.png'
import a_dishes from '../assets/lpc/dishes.png'
import a_lamps from '../assets/lpc/lamps.png'
import a_clutter from '../assets/lpc/clutter.png'
import a_paper from '../assets/lpc/paper.png'
import a_wood from '../assets/lpc/wood.png'
import a_window from '../assets/lpc/window.png'
export const GAME_ART = { dog, ...CAST_ASSETS,
  'campus-props': campusProps,
  'desk': a_desk,
  'shelf': a_shelf,
  'counter': a_counter,
  'armchair': a_armchair,
  'sofa': a_sofa,
  'planter': a_planter,
  'coffee': a_coffee,
  'laptop': a_laptop,
  'dishes': a_dishes,
  'lamps': a_lamps,
  'clutter': a_clutter,
  'paper': a_paper,
  'wood': a_wood,
  'window': a_window,
}

const canvas = (w, h) => { const image = document.createElement('canvas'); image.width = w; image.height = h; image.getContext('2d').imageSmoothingEnabled = false; return image }
export function makeCharacterSheet(images, bot) {
  const result = canvas(512, 768), c = result.getContext('2d')
  for (const [pose, { row }] of Object.entries(POSES)) {
    for (const layer of characterLayers(bot, pose)) {
      const source = images[layer]
      if (layer.includes('-shirt-')) {
        const colored = canvas(source.width, source.height), ctx = colored.getContext('2d')
        ctx.drawImage(source, 0, 0)
        const color = bot.officeAvatar?.palette?.[4] ?? ['#779b86', '#8099b5', '#b17b67', '#9c89a5'][hashOf(bot.id) % 4]
        // A light tint preserves the artist's folds, seams and highlights.
        ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = .4; ctx.fillStyle = color; ctx.fillRect(0, 0, colored.width, colored.height)
        c.drawImage(colored, 0, row * CHARACTER.height)
      } else c.drawImage(source, 0, row * CHARACTER.height)
    }
  }
  return result
}
