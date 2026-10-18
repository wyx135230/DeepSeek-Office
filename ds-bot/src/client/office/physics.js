// Body.reset() in Phaser 4 ignores a sprite's foot offset before checking bounds.
// Synchronize the authored registration without introducing a physics delta.
export function placeOfficeSprite(sprite, point) {
  sprite.setVelocity(0)
  sprite.setPosition(point.x, point.y)
  const body = sprite.body
  body.updateFromGameObject()
  for (const previous of [body.prev, body.prevFrame, body.autoFrame]) previous.copy(body.position)
}
