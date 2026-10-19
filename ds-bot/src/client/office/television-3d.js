import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export async function loadOfficeTelevision(source) {
  const loader = new GLTFLoader()
  const gltf = typeof source === 'string' ? await loader.loadAsync(source) : await loader.parseAsync(source, '')
  const model = gltf.scene, shapes = new Set(), materials = new Set()
  let screen, root, disposed = false
  model.traverse(node => {
    if (!node.isMesh) return
    shapes.add(node.geometry); node.castShadow = true; node.receiveShadow = true
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material)
      if (material.name === 'Screen') screen = material
    }
  })
  const tv = model.getObjectByName('TV'), remote = model.getObjectByName('Remote')
  if (!tv || !remote || !screen) {
    for (const shape of shapes) shape.dispose()
    for (const material of materials) material.dispose()
    throw new Error('The television model needs TV, Remote and Screen components.')
  }
  return {
    mount(kit, stage, world) {
      const fixture = world.furniture.find(f => f.kind === 'television')
      if (!fixture || disposed) return
      root = kit.group(stage, fixture.x + fixture.width / 2, 21.5, fixture.y + fixture.height / 2)
      root.userData.fixtureId = fixture.id
      const bounds = new THREE.Box3().setFromObject(tv), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3())
      const scale = fixture.width * .9 / size.x
      tv.scale.setScalar(scale); tv.position.set(-center.x * scale, -bounds.min.y * scale, 0)
      const remoteBounds = new THREE.Box3().setFromObject(remote), remoteCenter = remoteBounds.getCenter(new THREE.Vector3())
      remote.scale.setScalar(scale)
      remote.position.set(fixture.width * .33 - remoteCenter.x * scale, -remoteBounds.min.y * scale, 6 - remoteCenter.z * scale)
      root.add(model)
      const map = kit.texture(1024, 576, ctx => {
        const sky = ctx.createLinearGradient(0, 0, 0, 576)
        sky.addColorStop(0, '#172c45'); sky.addColorStop(1, '#9eb6bb')
        ctx.fillStyle = sky; ctx.fillRect(0, 0, 1024, 576)
        ctx.fillStyle = '#e8d7af'; ctx.beginPath(); ctx.arc(768, 150, 48, 0, Math.PI * 2); ctx.fill()
        for (let layer = 0; layer < 3; layer++) {
          ctx.fillStyle = ['#718f97', '#426876', '#284957'][layer]
          ctx.beginPath(); ctx.moveTo(0, 576)
          for (let x = 0; x <= 1152; x += 128) ctx.lineTo(x, 310 + layer * 65 - Math.sin(x / 130 + layer * 2) * 75)
          ctx.lineTo(1024, 576); ctx.fill()
        }
        ctx.fillStyle = '#f0eadb'; ctx.textAlign = 'center'; ctx.font = '500 40px Segoe UI, sans-serif'
        ctx.fillText('OFFICE CINEMA', 512, 495)
        ctx.font = '22px Segoe UI, sans-serif'; ctx.fillText('Take a seat. Enjoy the view.', 512, 535)
      })
      map.flipY = false
      screen.map = map; screen.emissiveMap = map; screen.emissive.set('#ffffff'); screen.emissiveIntensity = .65
      screen.roughness = .5; screen.needsUpdate = true
      return root
    },
    dispose() {
      if (disposed) return
      disposed = true; root?.removeFromParent()
      for (const shape of shapes) shape.dispose()
      for (const material of materials) material.dispose()
    },
  }
}
