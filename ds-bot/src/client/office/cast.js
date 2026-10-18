import { hashOf } from '../../shared/office.js'
import asset0 from '../assets/lpc/m-body-walk.png'
import asset1 from '../assets/lpc/m-head-walk.png'
import asset2 from '../assets/lpc/m-body-idle.png'
import asset3 from '../assets/lpc/m-head-idle.png'
import asset4 from '../assets/lpc/m-body-sitting.png'
import asset5 from '../assets/lpc/m-head-sitting.png'
import asset6 from '../assets/lpc-cast/m-body-honey-walk.png'
import asset7 from '../assets/lpc-cast/m-head-honey-walk.png'
import asset8 from '../assets/lpc-cast/m-body-honey-idle.png'
import asset9 from '../assets/lpc-cast/m-head-honey-idle.png'
import asset10 from '../assets/lpc-cast/m-body-honey-sitting.png'
import asset11 from '../assets/lpc-cast/m-head-honey-sitting.png'
import asset12 from '../assets/lpc-cast/m-body-bronze-walk.png'
import asset13 from '../assets/lpc-cast/m-head-bronze-walk.png'
import asset14 from '../assets/lpc-cast/m-body-bronze-idle.png'
import asset15 from '../assets/lpc-cast/m-head-bronze-idle.png'
import asset16 from '../assets/lpc-cast/m-body-bronze-sitting.png'
import asset17 from '../assets/lpc-cast/m-head-bronze-sitting.png'
import asset18 from '../assets/lpc-cast/m-body-coffee-walk.png'
import asset19 from '../assets/lpc-cast/m-head-coffee-walk.png'
import asset20 from '../assets/lpc-cast/m-body-coffee-idle.png'
import asset21 from '../assets/lpc-cast/m-head-coffee-idle.png'
import asset22 from '../assets/lpc-cast/m-body-coffee-sitting.png'
import asset23 from '../assets/lpc-cast/m-head-coffee-sitting.png'
import asset24 from '../assets/lpc/m-pants-walk.png'
import asset25 from '../assets/lpc/m-pants-idle.png'
import asset26 from '../assets/lpc/m-pants-sitting.png'
import asset27 from '../assets/lpc/m-shoes-walk.png'
import asset28 from '../assets/lpc/m-shoes-idle.png'
import asset29 from '../assets/lpc/m-shoes-sitting.png'
import asset30 from '../assets/lpc/m-shirt-walk.png'
import asset31 from '../assets/lpc/m-shirt-idle.png'
import asset32 from '../assets/lpc/m-shirt-sitting.png'
import asset33 from '../assets/lpc-cast/m-shirt-t-shirt-walk.png'
import asset34 from '../assets/lpc-cast/m-shirt-t-shirt-idle.png'
import asset35 from '../assets/lpc-cast/m-shirt-t-shirt-sitting.png'
import asset36 from '../assets/lpc-cast/m-shirt-polo-walk.png'
import asset37 from '../assets/lpc-cast/m-shirt-polo-idle.png'
import asset38 from '../assets/lpc-cast/m-shirt-polo-sitting.png'
import asset39 from '../assets/lpc-cast/m-shirt-v-neck-walk.png'
import asset40 from '../assets/lpc-cast/m-shirt-v-neck-idle.png'
import asset41 from '../assets/lpc-cast/m-shirt-v-neck-sitting.png'
import asset42 from '../assets/lpc-cast/f-body-peach-walk.png'
import asset43 from '../assets/lpc-cast/f-head-peach-walk.png'
import asset44 from '../assets/lpc-cast/f-body-peach-idle.png'
import asset45 from '../assets/lpc-cast/f-head-peach-idle.png'
import asset46 from '../assets/lpc-cast/f-body-peach-sitting.png'
import asset47 from '../assets/lpc-cast/f-head-peach-sitting.png'
import asset48 from '../assets/lpc/f-body-walk.png'
import asset49 from '../assets/lpc/f-head-walk.png'
import asset50 from '../assets/lpc/f-body-idle.png'
import asset51 from '../assets/lpc/f-head-idle.png'
import asset52 from '../assets/lpc/f-body-sitting.png'
import asset53 from '../assets/lpc/f-head-sitting.png'
import asset54 from '../assets/lpc-cast/f-body-bronze-walk.png'
import asset55 from '../assets/lpc-cast/f-head-bronze-walk.png'
import asset56 from '../assets/lpc-cast/f-body-bronze-idle.png'
import asset57 from '../assets/lpc-cast/f-head-bronze-idle.png'
import asset58 from '../assets/lpc-cast/f-body-bronze-sitting.png'
import asset59 from '../assets/lpc-cast/f-head-bronze-sitting.png'
import asset60 from '../assets/lpc-cast/f-body-coffee-walk.png'
import asset61 from '../assets/lpc-cast/f-head-coffee-walk.png'
import asset62 from '../assets/lpc-cast/f-body-coffee-idle.png'
import asset63 from '../assets/lpc-cast/f-head-coffee-idle.png'
import asset64 from '../assets/lpc-cast/f-body-coffee-sitting.png'
import asset65 from '../assets/lpc-cast/f-head-coffee-sitting.png'
import asset66 from '../assets/lpc/f-pants-walk.png'
import asset67 from '../assets/lpc/f-pants-idle.png'
import asset68 from '../assets/lpc/f-pants-sitting.png'
import asset69 from '../assets/lpc/f-shoes-walk.png'
import asset70 from '../assets/lpc/f-shoes-idle.png'
import asset71 from '../assets/lpc/f-shoes-sitting.png'
import asset72 from '../assets/lpc/f-shirt-walk.png'
import asset73 from '../assets/lpc/f-shirt-idle.png'
import asset74 from '../assets/lpc/f-shirt-sitting.png'
import asset75 from '../assets/lpc-cast/f-shirt-t-shirt-walk.png'
import asset76 from '../assets/lpc-cast/f-shirt-t-shirt-idle.png'
import asset77 from '../assets/lpc-cast/f-shirt-t-shirt-sitting.png'
import asset78 from '../assets/lpc-cast/f-shirt-polo-walk.png'
import asset79 from '../assets/lpc-cast/f-shirt-polo-idle.png'
import asset80 from '../assets/lpc-cast/f-shirt-polo-sitting.png'
import asset81 from '../assets/lpc-cast/f-shirt-v-neck-walk.png'
import asset82 from '../assets/lpc-cast/f-shirt-v-neck-idle.png'
import asset83 from '../assets/lpc-cast/f-shirt-v-neck-sitting.png'
import asset84 from '../assets/lpc/m-hair-walk.png'
import asset85 from '../assets/lpc/m-hair-idle.png'
import asset86 from '../assets/lpc/m-hair-sitting.png'
import asset87 from '../assets/lpc/f-hair-walk.png'
import asset88 from '../assets/lpc/f-hair-idle.png'
import asset89 from '../assets/lpc/f-hair-sitting.png'
import asset90 from '../assets/lpc-cast/hair-short-curls-walk.png'
import asset91 from '../assets/lpc-cast/hair-short-curls-idle.png'
import asset92 from '../assets/lpc-cast/hair-short-curls-sitting.png'
import asset93 from '../assets/lpc-cast/hair-natural-walk.png'
import asset94 from '../assets/lpc-cast/hair-natural-idle.png'
import asset95 from '../assets/lpc-cast/hair-natural-sitting.png'
import asset96 from '../assets/lpc-cast/hair-bun-walk.png'
import asset97 from '../assets/lpc-cast/hair-bun-idle.png'
import asset98 from '../assets/lpc-cast/hair-bun-sitting.png'
import asset99 from '../assets/lpc-cast/hair-cornrows-walk.png'
import asset100 from '../assets/lpc-cast/hair-cornrows-idle.png'
import asset101 from '../assets/lpc-cast/hair-cornrows-sitting.png'
import asset102 from '../assets/lpc-cast/hair-cowlick-walk.png'
import asset103 from '../assets/lpc-cast/hair-cowlick-idle.png'
import asset104 from '../assets/lpc-cast/hair-cowlick-sitting.png'
import asset105 from '../assets/lpc-cast/hair-flat-top-walk.png'
import asset106 from '../assets/lpc-cast/hair-flat-top-idle.png'
import asset107 from '../assets/lpc-cast/hair-flat-top-sitting.png'

export const CAST_ASSETS = Object.freeze({
  'cast-m-body-peach-walk': asset0,
  'cast-m-head-peach-walk': asset1,
  'cast-m-body-peach-idle': asset2,
  'cast-m-head-peach-idle': asset3,
  'cast-m-body-peach-sitting': asset4,
  'cast-m-head-peach-sitting': asset5,
  'cast-m-body-honey-walk': asset6,
  'cast-m-head-honey-walk': asset7,
  'cast-m-body-honey-idle': asset8,
  'cast-m-head-honey-idle': asset9,
  'cast-m-body-honey-sitting': asset10,
  'cast-m-head-honey-sitting': asset11,
  'cast-m-body-bronze-walk': asset12,
  'cast-m-head-bronze-walk': asset13,
  'cast-m-body-bronze-idle': asset14,
  'cast-m-head-bronze-idle': asset15,
  'cast-m-body-bronze-sitting': asset16,
  'cast-m-head-bronze-sitting': asset17,
  'cast-m-body-coffee-walk': asset18,
  'cast-m-head-coffee-walk': asset19,
  'cast-m-body-coffee-idle': asset20,
  'cast-m-head-coffee-idle': asset21,
  'cast-m-body-coffee-sitting': asset22,
  'cast-m-head-coffee-sitting': asset23,
  'cast-m-pants-walk': asset24,
  'cast-m-pants-idle': asset25,
  'cast-m-pants-sitting': asset26,
  'cast-m-shoes-walk': asset27,
  'cast-m-shoes-idle': asset28,
  'cast-m-shoes-sitting': asset29,
  'cast-m-shirt-buttoned-walk': asset30,
  'cast-m-shirt-buttoned-idle': asset31,
  'cast-m-shirt-buttoned-sitting': asset32,
  'cast-m-shirt-t-shirt-walk': asset33,
  'cast-m-shirt-t-shirt-idle': asset34,
  'cast-m-shirt-t-shirt-sitting': asset35,
  'cast-m-shirt-polo-walk': asset36,
  'cast-m-shirt-polo-idle': asset37,
  'cast-m-shirt-polo-sitting': asset38,
  'cast-m-shirt-v-neck-walk': asset39,
  'cast-m-shirt-v-neck-idle': asset40,
  'cast-m-shirt-v-neck-sitting': asset41,
  'cast-f-body-peach-walk': asset42,
  'cast-f-head-peach-walk': asset43,
  'cast-f-body-peach-idle': asset44,
  'cast-f-head-peach-idle': asset45,
  'cast-f-body-peach-sitting': asset46,
  'cast-f-head-peach-sitting': asset47,
  'cast-f-body-honey-walk': asset48,
  'cast-f-head-honey-walk': asset49,
  'cast-f-body-honey-idle': asset50,
  'cast-f-head-honey-idle': asset51,
  'cast-f-body-honey-sitting': asset52,
  'cast-f-head-honey-sitting': asset53,
  'cast-f-body-bronze-walk': asset54,
  'cast-f-head-bronze-walk': asset55,
  'cast-f-body-bronze-idle': asset56,
  'cast-f-head-bronze-idle': asset57,
  'cast-f-body-bronze-sitting': asset58,
  'cast-f-head-bronze-sitting': asset59,
  'cast-f-body-coffee-walk': asset60,
  'cast-f-head-coffee-walk': asset61,
  'cast-f-body-coffee-idle': asset62,
  'cast-f-head-coffee-idle': asset63,
  'cast-f-body-coffee-sitting': asset64,
  'cast-f-head-coffee-sitting': asset65,
  'cast-f-pants-walk': asset66,
  'cast-f-pants-idle': asset67,
  'cast-f-pants-sitting': asset68,
  'cast-f-shoes-walk': asset69,
  'cast-f-shoes-idle': asset70,
  'cast-f-shoes-sitting': asset71,
  'cast-f-shirt-buttoned-walk': asset72,
  'cast-f-shirt-buttoned-idle': asset73,
  'cast-f-shirt-buttoned-sitting': asset74,
  'cast-f-shirt-t-shirt-walk': asset75,
  'cast-f-shirt-t-shirt-idle': asset76,
  'cast-f-shirt-t-shirt-sitting': asset77,
  'cast-f-shirt-polo-walk': asset78,
  'cast-f-shirt-polo-idle': asset79,
  'cast-f-shirt-polo-sitting': asset80,
  'cast-f-shirt-v-neck-walk': asset81,
  'cast-f-shirt-v-neck-idle': asset82,
  'cast-f-shirt-v-neck-sitting': asset83,
  'cast-hair-parted-walk': asset84,
  'cast-hair-parted-idle': asset85,
  'cast-hair-parted-sitting': asset86,
  'cast-hair-side-bob-walk': asset87,
  'cast-hair-side-bob-idle': asset88,
  'cast-hair-side-bob-sitting': asset89,
  'cast-hair-short-curls-walk': asset90,
  'cast-hair-short-curls-idle': asset91,
  'cast-hair-short-curls-sitting': asset92,
  'cast-hair-natural-walk': asset93,
  'cast-hair-natural-idle': asset94,
  'cast-hair-natural-sitting': asset95,
  'cast-hair-bun-walk': asset96,
  'cast-hair-bun-idle': asset97,
  'cast-hair-bun-sitting': asset98,
  'cast-hair-cornrows-walk': asset99,
  'cast-hair-cornrows-idle': asset100,
  'cast-hair-cornrows-sitting': asset101,
  'cast-hair-cowlick-walk': asset102,
  'cast-hair-cowlick-idle': asset103,
  'cast-hair-cowlick-sitting': asset104,
  'cast-hair-flat-top-walk': asset105,
  'cast-hair-flat-top-idle': asset106,
  'cast-hair-flat-top-sitting': asset107,
})

const SKINS = ["peach", "honey", "bronze", "coffee"]
const HAIRS = [{"id": "parted", "style": "Short 02 - Parted", "color": "Chestnut"}, {"id": "side-bob", "style": "Medium 07 - Bob, Side Part", "color": "Black"}, {"id": "short-curls", "style": "Short 03 - Curly", "color": "Brown"}, {"id": "natural", "style": "Short 05 - Natural", "color": "Black"}, {"id": "bun", "style": "Medium 04 - Bangs & Bun", "color": "Ash Brown"}, {"id": "cornrows", "style": "Medium 05 - Cornrows", "color": "Black"}, {"id": "cowlick", "style": "Short 04 - Cowlick", "color": "Blonde"}, {"id": "flat-top", "style": "Short 08 - Flat Top, Fade", "color": "Charcoal"}]
const OUTFITS = [{"id": "buttoned", "style": "Shirt 07 - Buttoned Longsleeve Shirt", "color": "Fern"}, {"id": "t-shirt", "style": "Shirt 04 - T-shirt", "color": "Coral"}, {"id": "polo", "style": "Shirt 09 - Polo", "color": "Denim"}, {"id": "v-neck", "style": "Shirt 02 - V-neck Longsleeve Shirt", "color": "Mustard"}]

// Keep this order stable: existing bot IDs must retain their authored identity.
export const CHARACTER_PRESETS = Object.freeze(
  ['m', 'f'].flatMap(body => HAIRS.flatMap((hair, index) => Array.from({ length: 6 }, (_, variant) => {
    const skin = SKINS[(index + variant) % SKINS.length]
    const outfit = OUTFITS[(index + Math.floor(variant / 2)) % OUTFITS.length]
    return Object.freeze({
      id: `${body}-${hair.id}-${skin}-${outfit.id}`, body, skin,
      hair: hair.id, hairStyle: hair.style, hairColor: hair.color,
      outfit: outfit.id, clothingStyle: outfit.style, clothingColor: outfit.color, tintLayer: 'shirt',
    })
  })))
)

export function characterPreset(bot) {
  return CHARACTER_PRESETS[hashOf(String(bot?.id ?? 'studio-visitor')) % CHARACTER_PRESETS.length]
}

export function characterLayers(bot, pose = 'walk') {
  const action = ['walk', 'idle', 'sitting'].includes(pose) ? pose : 'idle'
  const { body, skin, hair, outfit } = characterPreset(bot)
  return [
    `cast-${body}-body-${skin}-${action}`, `cast-${body}-pants-${action}`,
    `cast-${body}-shoes-${action}`, `cast-${body}-shirt-${outfit}-${action}`,
    `cast-${body}-head-${skin}-${action}`, `cast-hair-${hair}-${action}`,
  ]
}
