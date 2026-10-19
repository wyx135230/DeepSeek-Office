export const GAME_APPEARANCE_OPTIONS = Object.freeze({
  body: Object.freeze(['m', 'f']),
  skin: Object.freeze(['peach', 'honey', 'bronze', 'coffee']),
  hair: Object.freeze(['parted', 'side-bob', 'short-curls', 'natural', 'bun', 'cornrows', 'cowlick', 'flat-top']),
  outfit: Object.freeze(['buttoned', 't-shirt', 'polo', 'v-neck']),
  accessories: Object.freeze(['glasses', 'name-badge', 'hair-clip', 'scarf']),
})

const invalid = message => Object.assign(new Error(message), { code: 'bot/invalid' })

export function cleanGameAppearance(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid('Game appearance must be an object')
  const result = {}
  for (const key of ['body', 'skin', 'hair', 'outfit']) {
    if (!GAME_APPEARANCE_OPTIONS[key].includes(value[key])) throw invalid(`Unknown character appearance ${key}`)
    result[key] = value[key]
  }
  for (const key of ['hairColor', 'shirtColor', 'pantsColor', 'shoesColor']) {
    if (value[key] === undefined) continue
    if (typeof value[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(value[key])) throw invalid('Character colors must be #rrggbb colors')
    result[key] = value[key]
  }
  if (value.accessories !== undefined) {
    if (!Array.isArray(value.accessories) || value.accessories.length > 4 || value.accessories.some(item => !GAME_APPEARANCE_OPTIONS.accessories.includes(item))) throw invalid('Unknown character accessory')
    result.accessories = [...new Set(value.accessories)]
  }
  return result
}

export function seededGameAppearance(seed) {
  const index = (seed >>> 0) % 96, hair = Math.floor(index % 48 / 6), variant = index % 6
  return { body: GAME_APPEARANCE_OPTIONS.body[Math.floor(index / 48)], skin: GAME_APPEARANCE_OPTIONS.skin[(hair + variant) % 4], hair: GAME_APPEARANCE_OPTIONS.hair[hair], outfit: GAME_APPEARANCE_OPTIONS.outfit[(hair + Math.floor(variant / 2)) % 4] }
}
