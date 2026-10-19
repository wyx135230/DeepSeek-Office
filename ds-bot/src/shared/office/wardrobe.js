import { hashOf } from '../office.js'

const SHIRTS = ['#548fb8', '#ded7c5', '#36897f', '#87465d', '#cb7b64', '#a997c4', '#bd9b49', '#91a58b', '#334d72', '#c291a0', '#667d89', '#3c6557', '#b3a081', '#6d527d', '#9c593d', '#505259']
const SKINS = ['#edc6aa', '#dca982', '#c6936e', '#ae7958', '#8b604a', '#684735']
const HAIR = ['#302b28', '#49382e', '#6a4b34', '#a37b4e', '#c5aa76', '#7a7771', '#8c5844', '#403d41']
const PANTS = ['#334353', '#494b51', '#636461', '#827465', '#3d514e', '#6b5962']
const SHOES = ['#302c2a', '#573e2d', '#705440', '#e0d8c9']
const KEYS = ['skin', 'hair', 'shirt', 'pants', 'shoes']
const PALETTES = [SKINS, HAIR, SHIRTS, PANTS, SHOES]
const fingerprint = look => KEYS.map(key => look[key]).join(':')
const valid = look => look && KEYS.every((key, i) => PALETTES[i].includes(look[key]))

function choose(id, attempt, usedShirts) {
  let seed = hashOf(`office-wardrobe-v1:${id}:${attempt}`) >>> 0
  const pick = values => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return values[(seed >>> 8) % values.length]
  }
  const look = Object.fromEntries(KEYS.map((key, i) => [key, pick(PALETTES[i])]))
  const start = SHIRTS.indexOf(look.shirt)
  for (let offset = 0; offset < SHIRTS.length; offset++) {
    const shirt = SHIRTS[(start + offset) % SHIRTS.length]
    if (!usedShirts.has(shirt)) { look.shirt = shirt; break }
  }
  return look
}

export function assignOfficeWardrobe(ids, saved = new Map()) {
  const sorted = [...new Set(ids)].sort(), result = new Map(), used = new Set(), shirts = new Set()
  const retain = (id, look) => {
    const copy = Object.fromEntries(KEYS.map(key => [key, look[key]]))
    result.set(id, copy); used.add(fingerprint(copy)); shirts.add(copy.shirt)
  }
  // Reserve existing identities before choosing clothes for any new coworker.
  for (const id of sorted) {
    const look = saved.get(id)
    if (valid(look) && !used.has(fingerprint(look))) retain(id, look)
  }
  for (const id of sorted) {
    if (result.has(id)) continue
    let look, attempt = 0
    do { look = choose(id, attempt++, shirts) } while (used.has(fingerprint(look)) && attempt < 4096)
    retain(id, look)
  }
  return result
}

export function customizeOfficeLook(look, appearance, avatar) {
  // Background portrait generation must not replace a saved 3D wardrobe.
  if (!appearance || avatar?.source === 'ai' && !avatar.prompt?.trim()) return { ...look }
  const skin = { peach: '#e9bea1', honey: '#c99a73', bronze: '#aa7859', coffee: '#795442' }[appearance.skin]
  return { skin: skin ?? look.skin, hair: appearance.hairColor ?? look.hair, shirt: appearance.shirtColor ?? look.shirt, pants: appearance.pantsColor ?? look.pants, shoes: appearance.shoesColor ?? look.shoes }
}
