import { assignOfficeWardrobe } from '../../shared/office/wardrobe.js'

const PREFIX = 'deepseek-office:wardrobe:v1:'

export function createOfficeWardrobe(storage) {
  const saved = new Map(), loaded = new Set()
  return ids => {
    for (const id of ids) {
      if (loaded.has(id)) continue
      loaded.add(id)
      try {
        const value = storage?.getItem(PREFIX + encodeURIComponent(id))
        if (value) saved.set(id, JSON.parse(value))
      } catch { /* Private browsing or damaged preferences must not stop the office. */ }
    }
    const looks = assignOfficeWardrobe(ids, saved)
    for (const [id, look] of looks) {
      const changed = JSON.stringify(saved.get(id)) !== JSON.stringify(look)
      saved.set(id, look)
      if (changed) try { storage?.setItem(PREFIX + encodeURIComponent(id), JSON.stringify(look)) } catch { /* Keep the in-memory choice. */ }
    }
    return looks
  }
}
