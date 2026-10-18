import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { placeOfficeSprite } from '../src/client/office/physics.js'
const require = createRequire(import.meta.url)
const Body = require('../node_modules/phaser/src/physics/arcade/Body.js')
const Rectangle = require('../node_modules/phaser/src/geom/rectangle/Rectangle.js')
test('waypoint and seat repositioning preserve the foot offset beside every wall', () => {
  for (const point of [{x:55,y:104},{x:713,y:104},{x:55,y:458},{x:713,y:458}]) {
    const sprite = { ...point, width:64,height:64,displayWidth:64,displayHeight:64,displayOriginX:32,displayOriginY:58,scaleX:1,scaleY:1,angle:0,rotation:0,
      setPosition(x,y){this.x=x;this.y=y;return this},setVelocity(x,y=x){this.body.velocity.set(x,y);return this},getTopLeft(out){return out.set(this.x-32,this.y-58)} }
    sprite.body = new Body({ defaults:{},bounds:new Rectangle(48,96,672,368),checkCollision:{left:true,right:true,up:true,down:true} },sprite)
    sprite.body.setSize(12,12);sprite.body.setOffset(26,52);sprite.body.setCollideWorldBounds(true)
    placeOfficeSprite(sprite,point)
    sprite.body.checkWorldBounds();sprite.body.postUpdate()
    assert.equal(sprite.x,point.x);assert.equal(sprite.y,point.y)
    assert.equal(sprite.body.position.x,point.x-6);assert.equal(sprite.body.position.y,point.y-6)
  }
})
