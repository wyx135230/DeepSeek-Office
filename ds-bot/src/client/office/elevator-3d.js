import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export async function loadOfficeElevator(source) {
  const loader = new GLTFLoader()
  const gltf = typeof source === 'string' ? await loader.loadAsync(source) : await loader.parseAsync(source, '')
  const model = gltf.scene, materials = new Set(), sources = new Set(), geometries = new Set(), shell = []
  const left = model.getObjectByName('DoorL'), right = model.getObjectByName('DoorR')
  if (!left || !right) throw new Error('The lift model needs DoorL and DoorR components.')
  model.traverse(node => {
    if (!node.isMesh) return
    geometries.add(node.geometry); node.castShadow = true; node.receiveShadow = true
    const copy = mat => {
      sources.add(mat)
      const result = mat.clone(); materials.add(result)
      result.metalness = Math.min(.4, result.metalness); result.roughness = Math.max(.38, result.roughness)
      return result
    }
    node.material = Array.isArray(node.material) ? node.material.map(copy) : copy(node.material)
    let parent = node
    while (parent) { if (parent.name === 'Arrow_Frame') { shell.push(node); break }; parent = parent.parent }
  })
  model.updateMatrixWorld(true)
  const a = new THREE.Box3().setFromObject(left), b = new THREE.Box3().setFromObject(right)
  const travel = Math.max(0, b.min.x - a.max.x) / 2
  const closedLeft = left.position.x + travel, closedRight = right.position.x - travel
  let opening = 1, opacity = 1, lastTime = null, root
  return {
    mount(kit, stage, world) {
      root = kit.group(stage, world.elevator.cabin.x, 0, world.elevator.center.y)
      root.rotation.y = -Math.PI / 2; root.userData.targetId = 'lift'
      model.scale.setScalar(22)
      model.position.set(-.066707 * 22, 1.376618 * 22, -1.10 * 22)
      root.add(model)
      const light = new THREE.PointLight('#fff0d5', 35, 90, 1.3)
      light.position.set(0, 50, -30); root.add(light)
      return root
    },
    update(state, time, quiet) {
      const delta = lastTime === null ? 1 / 60 : Math.min(.05, Math.max(0, (time - lastTime) / 1000)); lastTime = time
      const alpha = quiet ? 1 : 1 - Math.exp(-delta * 9)
      const shut = ['closing', 'moving', 'loading', 'arriving', 'recovering'].includes(state.phase)
      opening = THREE.MathUtils.lerp(opening, shut ? 0 : state.near ? 1 : 0, alpha)
      left.position.x = closedLeft - travel * opening; right.position.x = closedRight + travel * opening
      opacity = THREE.MathUtils.lerp(opacity, state.inside ? .16 : 1, alpha)
      for (const mesh of shell) for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const transparent = opacity < .995
        if (mat.transparent !== transparent) { mat.transparent = transparent; mat.needsUpdate = true }
        mat.opacity = opacity; mat.depthWrite = !transparent
      }
    },
    snapshot() { return { doorOpen: opening, shellOpacity: opacity } },
    dispose() {
      root?.removeFromParent()
      for (const geometry of geometries) geometry.dispose()
      for (const mat of [...materials, ...sources]) mat.dispose()
    },
  }
}
