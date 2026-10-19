import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'

const COLORS = { OfficeSkin: 'skin', OfficeHair: 'hair', OfficeShirt: 'shirt', OfficeTrousers: 'pants', OfficeShoes: 'shoes' }

export async function loadOfficeCharacters(source) {
  const loader = new GLTFLoader()
  const gltf = typeof source === 'string' ? await loader.loadAsync(source) : await loader.parseAsync(source, '')
  const geometries = new Set(), materials = new Set(), textures = new Set()
  gltf.scene.traverse(node => {
    if (!node.isMesh) return
    geometries.add(node.geometry)
    for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(mat)
      for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value)
    }
  })
  const height = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()).y
  return {
    instantiate(look) {
      const model = clone(gltf.scene), owned = new Map(), skeletons = new Set(), rigs = new Map()
      model.traverse(node => {
        if (!node.isMesh) return
        node.castShadow = true; node.receiveShadow = true
        // Static rest-pose bounds do not cover the seated clip and arm swings.
        node.frustumCulled = false
        const recolor = source => {
          if (!owned.has(source)) {
            const mat = source.clone(), color = look[COLORS[source.name]]
            if (color) mat.color.set(color)
            owned.set(source, mat)
          }
          return owned.get(source)
        }
        node.material = Array.isArray(node.material) ? node.material.map(recolor) : recolor(node.material)
        if (node.isSkinnedMesh) {
          // GLTF material primitives clone the same rig separately. Share its bone
          // texture within one person, while keeping different people independent.
          const key = node.skeleton.bones.map(bone => bone.uuid).join(':')
          if (rigs.has(key)) {
            node.skeleton.dispose()
            node.bind(rigs.get(key), node.bindMatrix)
          } else { rigs.set(key, node.skeleton); skeletons.add(node.skeleton) }
        }
      })
      model.scale.setScalar(48 / height)
      const mixer = new THREE.AnimationMixer(model)
      const actions = Object.fromEntries(gltf.animations.map(clip => [clip.name, mixer.clipAction(clip)]))
      let mode = '', lastTime = null, wasQuiet = false
      return { model,
        animate(actor, time, quiet) {
          const speed = actor.sprite.body.enable ? actor.sprite.body.speed : 0
          const next = actor.exit ? 'OfficeSeated' : speed > 2 ? quiet ? 'OfficeIdle' : 'OfficeWalk'
            : ['coffee', 'drink'].includes(actor.activity) ? 'OfficeDrink' : actor.activity === 'exercise' ? 'OfficeExercise' : 'OfficeIdle'
          const delta = lastTime === null ? 0 : THREE.MathUtils.clamp((time - lastTime) / 1000, 0, .05)
          lastTime = time
          if (next !== mode || wasQuiet !== quiet) {
            const action = actions[next]
            if (quiet || !mode || wasQuiet) mixer.stopAllAction()
            else actions[mode]?.fadeOut(.18)
            action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play()
            if (!quiet && mode && !wasQuiet) action.fadeIn(.18)
            mode = next
          }
          mixer.timeScale = next === 'OfficeWalk' ? Math.max(.65, speed / 62) : 1
          mixer.update(quiet ? 0 : delta)
          wasQuiet = quiet
        },
        dispose() {
          mixer.stopAllAction(); mixer.uncacheRoot(model)
          for (const mat of owned.values()) mat.dispose()
          for (const skeleton of skeletons) skeleton.dispose()
          model.removeFromParent()
        },
      }
    },
    dispose() {
      for (const shape of geometries) shape.dispose()
      for (const mat of materials) mat.dispose()
      for (const map of textures) map.dispose()
    },
  }
}

export function makeWorker(kit, scene, bot, visitor, library, look) {
  const root = kit.group(scene), body = kit.group(root)
  if (!visitor) root.userData.targetId = bot.id
  const instance = library.instantiate(look)
  body.add(instance.model)
  const ring = kit.cylinder(root, 0, .4, 0, 8, 8, .4, visitor ? '#6a9cba' : '#c5a568', 32)
  const badge = kit.sphere(root, 0, 54, 0, 2.2, 2.2, 2.2, '#e4b767')
  const book = kit.group(body, 0, 26, 10)
  kit.box(book, 0, 0, 0, 10, .8, 7, '#997e58', .2)
  kit.box(book, 0, .5, 0, 9.2, .2, 6.4, '#e8e9df')
  book.rotation.x = -.15
  const cup = kit.group(body)
  kit.cylinder(cup, 0, 0, 0, 1.5, 1.2, 3, '#eee9df', 12)
  kit.cylinder(cup, 0, 1.55, 0, 1.15, 1.15, .12, '#5b4232', 12)
  const hand = instance.model.getObjectByName('RightHand'), handPoint = new THREE.Vector3()
  return { root, look,
    update(actor, time, quiet, selected) {
      root.position.set(actor.sprite.x, 0, actor.sprite.y)
      const speed = actor.sprite.body.enable ? actor.sprite.body.speed : 0
      const velocity = actor.sprite.body.velocity
      const direction = { down: 0, up: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 }[actor.direction] ?? 0
      body.rotation.y = speed > 2 ? Math.atan2(velocity.x, velocity.y) : direction
      instance.animate(actor, time, quiet)
      book.visible = Boolean(actor.exit) && ['reading', 'meal'].includes(actor.activity)
      cup.visible = !speed && ['coffee', 'drink'].includes(actor.activity)
      if (cup.visible && hand) {
        instance.model.updateWorldMatrix(true, true)
        hand.getWorldPosition(handPoint); body.worldToLocal(handPoint)
        cup.position.copy(handPoint); cup.position.y += 1; cup.position.z += 1.3
      }
      ring.visible = visitor || selected
      badge.visible = actor.state === 'waiting'
    },
    dispose() { instance.dispose(); root.removeFromParent() },
  }
}
