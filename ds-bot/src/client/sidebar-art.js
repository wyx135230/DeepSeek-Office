import { createElement as h } from 'react'
import atlas from './assets/sidebar/team-headshots.png'
import { fnv1a } from './characters.js'
import { inkFill } from './inks.js'

export function OfficeLogo({ size = 24 }) {
  return h('span', { style: { display: 'inline-flex', flex: 'none', width: size, height: size }, 'aria-hidden': true },
    h('svg', { viewBox: '0 0 32 32', width: size, height: size, fill: 'none' },
      h('path', { d: 'M5 6.5A4.5 4.5 0 0 1 9.5 2h13A4.5 4.5 0 0 1 27 6.5v16a4.5 4.5 0 0 1-4.5 4.5h-5L11 31v-4H9.5A4.5 4.5 0 0 1 5 22.5z', fill: '#3c827b' }),
      h('path', { d: 'M10 8h5v6h-5zm7 0h5v6h-5z', fill: '#d3eee4' }),
      h('path', { d: 'M10 17h5v6h-5zm7 0h5v6h-5z', fill: '#8cc5c2' }),
      h('path', { d: 'M24 3h2.5A3.5 3.5 0 0 1 30 6.5V14l-5-3h-1a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3', fill: '#dfb86b' }),
      h('path', { d: 'M24 7h3', stroke: '#5b5035', strokeWidth: 1.5, strokeLinecap: 'round' })))
}

export function SidebarPortrait({ bot, look }) {
  const index = fnv1a(`${bot?.id ?? 'office'}:${look.shape}`) % 16
  return h('span', {
    className: 'bt-mark-img bt-anime-portrait',
    'data-portrait': index,
    style: {
      backgroundPosition: `${index % 4 * 100 / 3}% ${Math.floor(index / 4) * 100 / 3}%`,
      backgroundColor: `color-mix(in srgb, ${inkFill(look.color)} 18%, #f3f3ec)`,
      borderRadius: '34%',
    },
  })
}

export const SIDEBAR_ART_CSS = `.bt-anime-portrait{background-image:url("${atlas}");background-size:400% 400%;background-repeat:no-repeat}`
