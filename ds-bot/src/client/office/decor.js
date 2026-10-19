// Small living details that are not part of the walkable world: Momo's cat friend.
import { catCanvas } from './portrait.js'

export function installCat(scene) {
  const frames = [catCanvas(0), catCanvas(1)]
  const keys = frames.map((canvas, index) => {
    const key = `office-cat-${index}`
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas)
    return key
  })
  return keys
}
