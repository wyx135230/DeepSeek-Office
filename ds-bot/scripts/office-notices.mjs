import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const plugin = new URL('../', import.meta.url)
const read = path => readFileSync(new URL(path, plugin), 'utf8').replace(/\r\n/g, '\n')
const phaser = read('node_modules/phaser/dist/phaser.esm.js')
const license = read('node_modules/phaser/LICENSE.md')
const mit = license.slice(license.indexOf('Permission is hereby granted'))
const block = pattern => {
  const value = phaser.match(pattern)?.[0]
  if (!value) throw new Error('A Phaser embedded license changed; inspect it before updating notices')
  return value.replace(/^\/\*\*?\s*|\s*\*\/$/g, '').replace(/^\s*\* ?/gm, '').trim()
}
const sections = [
  'DeepSeek Office 0.2.0 — bundled engine and game assets\n\nPhaser and the following embedded components are distributed inside client.js.\nAll assets are local; no runtime CDN is used.',
  `Phaser 4.2.1\nhttps://github.com/phaserjs/phaser\n\n${license}`,
  `Embedded MIT components\n\nEventEmitter3 — Copyright (c) 2014 Arnout Kazemier\nhttps://github.com/primus/eventemitter3\n\nMatter.js — Copyright (c) Liam Brummitt and contributors\nhttps://github.com/liabru/matter-js\n\ngl-matrix — Copyright (c) 2015-2025 Brandon Jones, Colin MacKenzie IV\nhttps://github.com/toji/gl-matrix\n\nPSRD noise — Copyright (c) 2021 Stefan Gustavson and Ian McEwan\nhttps://github.com/stegu/psrdnoise\n\nTopological sort — Copyright (c) Minko Gechev\nhttps://github.com/mgechev/javascript-algorithms\n\nThe following MIT permission applies to these components:\n\n${mit}`,
  `Earcut 2.2.4\nhttps://github.com/mapbox/earcut\n\n${block(/\/\*\s*\* ISC License[\s\S]*?\*\//)}`,
  `Simplify.js\nhttps://github.com/mourner/simplify-js\n\n${block(/\/\*\*\s*\* Copyright \(c\) 2017, Vladimir Agafonkin[\s\S]*?\*\//)}`,
  'Additional attribution retained from Matter.js:\nSVG path normalization — Copyright (c) Gavin Kistner; http://phrogz.net/js/_ReuseLicense.txt\nPolygon geometry — Copyright (c) Paul Bourke (use permitted), http://paulbourke.net/geometry/polygonmesh/',
  `${read('src/client/assets/ninja/SOURCES.md')}\n\n${read('src/client/assets/ninja/LICENSE.txt')}`,
]
writeFileSync(fileURLToPath(new URL('THIRD-PARTY-NOTICES.txt', plugin)), sections.join('\n\n==============================================================================\n\n').trimEnd() + '\n')
