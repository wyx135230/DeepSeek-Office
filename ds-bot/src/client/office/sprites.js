import dog from '../assets/ninja/character-dog.png'
import { characterPreset } from './cast.js'
import { makeCharacterSheet as makeChibiSheet, CHIBI, CHIBI_DIRECTIONS, CHIBI_POSES } from './chibi.js'
import { CHARACTER } from '../../shared/office/character.js'
export { DIRECTIONS } from '../../shared/office/character.js'

// Preloaded textures. The chibi coworker sheets are composed at runtime from traits.
export const GAME_ART = { dog }

// A preset carries authored traits; AI designs additionally carry explicit colors.
export function appearanceOf(bot) {
  const preset = characterPreset(bot)
  if (preset.appearance) return { ...preset.appearance, body: preset.appearance.body ?? preset.body, skin: preset.appearance.skin ?? preset.skin, hair: preset.appearance.hair ?? preset.hair, outfit: preset.appearance.outfit ?? preset.outfit }
  return {
    body: preset.body, skin: preset.skin, hair: preset.hair, outfit: preset.outfit,
    hairColor: preset.hairColor, shirtColor: preset.clothingColor, accessories: [],
  }
}

export function makeCharacterSheet(_images, bot) {
  const preset = characterPreset(bot)
  return makeChibiSheet(appearanceOf(bot), preset)
}

export { CHIBI, CHIBI_DIRECTIONS, CHIBI_POSES, CHARACTER }
