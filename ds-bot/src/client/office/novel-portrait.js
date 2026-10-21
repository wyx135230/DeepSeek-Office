import { createElement as h, useEffect, useRef } from 'react'
import atlas from '../assets/dialogue/coworker-busts.png'
import { portraitPixel } from '../../shared/office/dialogue.js'
import { customizeOfficeLook } from '../../shared/office/wardrobe.js'
import { hashOf } from '../../shared/office.js'
import { characterPreset } from './cast.js'
import { createOfficeWardrobe } from './wardrobe.js'

let imagePromise, wardrobe
const cache = new Map()
function image() {
  return imagePromise ??= new Promise((resolve, reject) => {
    const source = new Image()
    source.onload = () => resolve(source)
    source.onerror = () => { imagePromise = null; reject(new Error('Could not load character portraits')) }
    source.src = atlas
  })
}

export function AnimePortrait({ bot, members = [] }) {
  const ref = useRef(null)
  const preset = characterPreset(bot), appearance = preset.appearance ?? preset
  if (!wardrobe) {
    let storage
    try { storage = localStorage } catch { /* An in-memory wardrobe works in restricted browsers. */ }
    wardrobe = createOfficeWardrobe(storage)
  }
  const looks = wardrobe(['studio-visitor', ...members.map(member => member.bot.id), bot.id])
  const look = customizeOfficeLook(looks.get(bot.id), preset.appearance, bot.officeAvatar)
  const variant = appearance.hair === 'side-bob' ? 1 : ['natural', 'bun', 'cornrows'].includes(appearance.hair) && appearance.body === 'f' ? 2 : 0
  const key = JSON.stringify([variant, look])
  useEffect(() => {
    let stopped = false
    const canvas = ref.current
    void image().then(source => {
      if (stopped) return
      let portrait = cache.get(key)
      if (!portrait) {
        portrait = document.createElement('canvas'); portrait.width = 300; portrait.height = 440
        const ctx = portrait.getContext('2d', { willReadFrequently: true })
        const width = source.width / 3
        ctx.drawImage(source, variant * width, 0, width, source.height * .984, 0, 0, 300, 440)
        const pixels = ctx.getImageData(0, 0, 300, 440)
        for (let i = 0; i < pixels.data.length; i += 4) pixels.data.set(portraitPixel(pixels.data.slice(i, i + 4), look, Math.floor(i / 4 / 300) / 440), i)
        ctx.putImageData(pixels, 0, 0)
        cache.set(key, portrait)
        if (cache.size > 48) cache.delete(cache.keys().next().value)
      }
      canvas.getContext('2d').drawImage(portrait, 0, 0)
    }).catch(() => { if (!stopped) canvas.dataset.failed = 'true' })
    return () => { stopped = true }
  }, [key])
  return h('canvas', { key: hashOf(bot.id), ref, width: 300, height: 440, className: 'of-vn-portrait', role: 'img', 'aria-label': `${bot.name ?? 'You'} portrait` })
}
