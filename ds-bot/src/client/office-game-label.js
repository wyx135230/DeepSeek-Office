import font from './assets/ninja/font8x8.png'

export const PIXEL_FONT = font

export function installPixelFont(scene, Phaser) {
  const chars = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('')
  scene.cache.bitmapFont.add('office-font', Phaser.GameObjects.RetroFont.Parse(scene, { image: 'office-font', width: 8, height: 8, chars, charsPerRow: 15 }))
}

export function gameLabel(scene, value) {
  const box = scene.add.rectangle(0, 0, 1, 12, 0xeadcb7).setStrokeStyle(1, 0x958563)
  const bitmap = scene.add.bitmapText(0, 0, 'office-font', '', 8)
  // Names and messages may contain any language, even though the game UI is English.
  const unicode = scene.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '8px', color: '#354436' })
  const group = scene.add.container(0, 0, [box, bitmap, unicode])
  let original = '', anchor = 0
  const layout = () => {
    const ascii = [...original].every(char => char.codePointAt(0) >= 32 && char.codePointAt(0) <= 126)
    bitmap.setVisible(ascii); unicode.setVisible(!ascii)
    const label = ascii ? bitmap : unicode
    const visible = [...original].length > 22 ? [...original].slice(0, 19).join('') + '...' : original
    label.setText(visible).setOrigin(.5, anchor).setPosition(0, anchor ? -2 : 2)
    box.setSize(Math.ceil(label.width) + 6, Math.ceil(label.height) + 4).setOrigin(.5, anchor)
  }
  Object.defineProperty(group, 'text', { get: () => original })
  group.setText = text => { original = String(text); layout(); return group }
  group.setOrigin = (_x, y = 0) => { anchor = y; layout(); return group }
  group.setBackgroundColor = color => { box.setFillStyle(Number.parseInt(color.replace('#', '').slice(0, 6), 16)); return group }
  return group.setText(value)
}
