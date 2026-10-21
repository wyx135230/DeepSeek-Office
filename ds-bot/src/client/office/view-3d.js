import * as THREE from 'three'
import { OFFICE_YAW, OFFICE_ELEVATION, screenMovement, insideOfficeViewport } from '../../shared/office/isometric.js'
import { characterPreset } from './cast.js'
import { createModelKit } from './model-kit.js'
import { buildArchitecture, batchArchitecture } from './architecture-3d.js'
import { createOfficeEnvironment, officeEnvironmentAtmosphere } from './environment-3d.js'
import { makeDog } from './people-3d.js'
import { makeWorker } from './worker-3d.js'
import { createOfficeWardrobe } from './wardrobe.js'
import { customizeOfficeLook } from '../../shared/office/wardrobe.js'

export function createOfficeView(element, world, floor, characters, elevator, television) {
  const kit = createModelKit(), stage = new THREE.Scene()
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08
  renderer.domElement.className = 'of-three-canvas'
  renderer.domElement.setAttribute('aria-hidden', 'true')
  element.appendChild(renderer.domElement)
  const camera = new THREE.OrthographicCamera(-500, 500, 350, -350, .1, 6000)
  const hemisphere = new THREE.HemisphereLight('#fff5df', '#9aa9ad', 2.3); stage.add(hemisphere)
  const sunlight = new THREE.DirectionalLight('#fff3d8', 2.5)
  sunlight.position.set(140, 1100, 160); sunlight.target.position.set(world.width / 2, 0, world.height / 2)
  sunlight.castShadow = true; sunlight.shadow.mapSize.set(2048, 2048)
  sunlight.shadow.camera.left = -850; sunlight.shadow.camera.right = 850
  sunlight.shadow.camera.top = 850; sunlight.shadow.camera.bottom = -850
  sunlight.shadow.camera.far = 2400; sunlight.shadow.normalBias = .6; sunlight.shadow.bias = -.00015
  sunlight.shadow.radius = 3
  stage.add(sunlight, sunlight.target)
  // The city continues to the edges of the panel; fog hands the far ground
  // over to the sky tone of the current local time.
  stage.fog = new THREE.Fog(officeEnvironmentAtmosphere('midday').fog, 2050, 3700)
  const environment = createOfficeEnvironment(kit, stage, world)
  let architecture, architectureKit, releaseBatch = () => {}, currentTheme = floor.theme, disposed = false
  const build = theme => {
    releaseBatch(); architecture?.dispose(); architectureKit?.dispose()
    architectureKit = createModelKit()
    architecture = buildArchitecture(architectureKit, stage, world, theme ?? {})
    const releases = [architecture.root, ...architecture.detailRoots].map(batchArchitecture)
    releaseBatch = () => { for (const release of releases) release() }
  }
  build(currentTheme)
  const people = new Map(), dog = makeDog(kit, stage)
  const lift = elevator.mount(kit, stage, world)
  television.mount(kit, stage, world)
  let storage
  try { storage = window.localStorage } catch { /* Storage is optional. */ }
  const wardrobe = createOfficeWardrobe(storage)
  let rosterKey = '', looks
  const marker = kit.cylinder(stage, 0, .6, 0, 7, 7, .4, kit.material('#6296b0', { transparent: true, opacity: .45 }), 32)
  marker.visible = false
  const proxyRoot = new THREE.Group(), picks = []
  for (const fixture of world.furniture) {
    const mesh = kit.box(proxyRoot, fixture.x + fixture.width / 2, 19, fixture.y + fixture.height / 2, fixture.width, 38, fixture.height, '#ffffff')
    mesh.userData.fixtureId = fixture.id; picks.push(mesh)
  }
  proxyRoot.updateMatrixWorld(true)
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const projection = new THREE.Vector3(), hit = new THREE.Vector3()
  const focus = new THREE.Vector3(world.spawn.x, 0, world.spawn.y)
  let yaw = OFFICE_YAW, zoom = 1, overview = false, manual = null, viewport, lastSize = '', quiet = false
  let lastLight = null, lastLightId = null, viewHeight = 500, verticalShift = 0
  const sunDirection = new THREE.Vector3()
  const lowSun = new THREE.Color('#ffb277')
  // The directional light follows the real solar path for the local clock and
  // date; below the horizon it becomes a cool ambient moon instead.
  const applySun = (light) => {
    const sun = light?.sun
    const moon = !sun || sun.elevation <= 0 || light.id === 'night'
    const azimuth = moon ? 205 * Math.PI / 180 : sun.azimuth
    const elevation = moon ? 38 * Math.PI / 180 : Math.max(6 * Math.PI / 180, sun.elevation)
    const flat = Math.cos(elevation)
    sunDirection.set(Math.sin(azimuth) * flat, Math.sin(elevation), -Math.cos(azimuth) * flat)
    sunlight.position.copy(sunlight.target.position).addScaledVector(sunDirection, 1100)
    sunlight.target.updateMatrixWorld()
    const palette = officeEnvironmentAtmosphere(light?.id)
    if (moon) {
      sunlight.color.set('#9fb6d8')
      sunlight.intensity = .55
    } else {
      const low = Math.max(0, 1 - Math.min(1, elevation / (22 * Math.PI / 180)))
      sunlight.color.set(palette.sun).lerp(lowSun, low * .55)
      sunlight.intensity = palette.sunIntensity * (.4 + .6 * Math.max(0, Math.sin(elevation)))
    }
  }
  const layout = () => {
    const width = Math.max(240, element.clientWidth), height = Math.max(240, element.clientHeight)
    const bounds = element.getBoundingClientRect()
    const workspace = element.closest('.of-workspace')
    const topBar = workspace?.querySelector('.of-game-top')?.getBoundingClientRect()
    const dock = workspace?.querySelector('.of-meeting-chat-wrap')?.getBoundingClientRect()
    const top = topBar ? Math.max(0, Math.min(height * .32, topBar.bottom - bounds.top)) : 0
    const bottom = dock ? Math.max(0, Math.min(height * .62, bounds.bottom - dock.top)) : 0
    const stageHeight = Math.max(150, height - top - bottom)
    // The canvas is the whole panel; only the camera framing answers to the HUD.
    viewport = { x: 0, y: 0, width, height }
    const size = `${width}:${height}`
    if (size !== lastSize) { renderer.setSize(width, height, false); lastSize = size }
    renderer.setViewport(0, 0, width, height)
    const stageAspect = width / stageHeight
    const fit = overview ? Math.max(1200, 2400 / stageAspect) : Math.max(390, Math.min(600, 700 / stageAspect)) / zoom
    viewHeight = fit * height / stageHeight
    verticalShift = (top - bottom) / 2
    const aspect = width / height
    camera.left = -viewHeight * aspect / 2; camera.right = viewHeight * aspect / 2
    camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2
    camera.updateProjectionMatrix()
  }
  const positionCamera = () => {
    const horizontal = Math.cos(OFFICE_ELEVATION) * 1700
    const target = new THREE.Vector3(focus.x, 12, focus.z)
    camera.position.set(focus.x + Math.sin(yaw) * horizontal, Math.sin(OFFICE_ELEVATION) * 1700, focus.z + Math.cos(yaw) * horizontal)
    camera.lookAt(target)
    if (Math.abs(verticalShift) > .5) {
      const forward = new THREE.Vector3().subVectors(target, camera.position).normalize()
      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize()
      const screenUp = new THREE.Vector3().crossVectors(right, forward).normalize()
      const shift = screenUp.multiplyScalar(verticalShift * viewHeight / Math.max(1, element.clientHeight))
      camera.position.add(shift)
      target.add(shift)
      camera.lookAt(target)
    }
    camera.updateMatrixWorld()
    for (const wall of architecture.walls) wall.root.scale.y = wall.nx * Math.sin(yaw) + wall.nz * Math.cos(yaw) > .1 ? .22 : 1
  }
  layout(); positionCamera()
  const groundAt = (x, y) => {
    pointer.set((x - viewport.x) / viewport.width * 2 - 1, -(y - viewport.y) / viewport.height * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    if (!raycaster.ray.intersectPlane(ground, hit)) return { x: world.spawn.x, y: world.spawn.y }
    return { x: hit.x, y: hit.z }
  }
  const project = (x, y, height = 0) => {
    projection.set(x, height, y).project(camera)
    return { x: viewport.x + (projection.x + 1) * viewport.width / 2, y: viewport.y + (1 - projection.y) * viewport.height / 2, visible: Math.abs(projection.x) <= 1 && Math.abs(projection.y) <= 1 }
  }
  const view = {
    project,
    pointAt(x, y) {
      if (!insideOfficeViewport({ x, y }, viewport)) return null
      const point = groundAt(x, y)
      const hits = raycaster.intersectObjects([...people.values()].map(p => p.root).concat(dog.root, lift, picks), true)
      for (const intersection of hits) {
        let object = intersection.object
        while (object) {
          if (object.userData.targetId) return { ...point, targetId: object.userData.targetId }
          if (object.userData.fixtureId) return { ...point, fixtureId: object.userData.fixtureId }
          object = object.parent
        }
      }
      return point
    },
    movement(x, y) { return screenMovement(x, y, yaw) },
    resize() { if (!disposed) { layout(); positionCamera() } },
    panTo(x, y) { manual = { x, y }; overview = false; focus.set(x, 0, y); layout(); positionCamera() },
    follow() { manual = null; overview = false; layout() },
    zoomBy(factor) { overview = false; zoom = THREE.MathUtils.clamp(zoom * factor, .65, 2.5); layout(); positionCamera() },
    rotate() { yaw += Math.PI / 2; positionCamera() },
    overview() { overview = true; manual = null; focus.set(world.width / 2, 0, world.height / 2); layout(); positionCamera() },
    get mode() { return overview ? 'overview' : manual ? 'inspect' : 'follow' },
    cameraSnapshot() {
      const corners = [[viewport.x, viewport.y], [viewport.x + viewport.width, viewport.y], [viewport.x, viewport.y + viewport.height], [viewport.x + viewport.width, viewport.y + viewport.height]].map(([x, y]) => groundAt(x, y))
      return { mode: view.mode, zoom, yaw, viewport: { ...viewport }, visibleWorld: { left: Math.min(...corners.map(p => p.x)), right: Math.max(...corners.map(p => p.x)), top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)) } }
    },
    update(office, current, time, reducedMotion, selected, destination) {
      if (disposed) return
      quiet = reducedMotion
      if (JSON.stringify(current.theme) !== JSON.stringify(currentTheme)) { currentTheme = current.theme; build(currentTheme) }
      if (office.light !== lastLight) {
        lastLight = office.light
        applySun(office.light)
        if (office.light.id !== lastLightId) {
          lastLightId = office.light.id
          const palette = officeEnvironmentAtmosphere(lastLightId)
          hemisphere.color.set(palette.hemi); hemisphere.groundColor.set(palette.ground); hemisphere.intensity = palette.hemiIntensity
          renderer.toneMappingExposure = palette.exposure
          stage.fog.color.set(palette.fog)
          environment.applyLight(office.light)
          element.closest('.of-workspace')?.setAttribute('data-office-phase', office.light.id)
        }
      }
      if (!overview && !manual) {
        const point = office.player.sprite
        focus.lerp(new THREE.Vector3(point.x, 0, point.y), quiet ? 1 : .09)
      }
      positionCamera()
      const list = [{ actor: office.player, bot: { id: 'studio-visitor' }, visitor: true }, ...office.actors.map(actor => ({ actor, bot: current.members.find(m => m.bot.id === actor.id)?.bot ?? { id: actor.id } }))]
      const nextRoster = JSON.stringify(list.map(entry => entry.bot.id).sort())
      if (nextRoster !== rosterKey) { looks = wardrobe(list.map(entry => entry.bot.id)); rosterKey = nextRoster }
      const present = new Set(list.map(entry => entry.bot.id))
      for (const [id, model] of people) if (!present.has(id)) { model.dispose(); people.delete(id) }
      for (const { actor, bot, visitor } of list) {
        const id = bot.id, look = customizeOfficeLook(looks.get(id), characterPreset(bot).appearance, bot.officeAvatar)
        const presetId = JSON.stringify([characterPreset(bot).id, look])
        let model = people.get(id)
        if (model && model.presetId !== presetId) { model.dispose(); people.delete(id); model = null }
        if (!model) { model = makeWorker(kit, stage, bot, visitor, characters, look); model.presetId = presetId; people.set(id, model) }
        model.update(actor, time, quiet, selected === id)
      }
      dog.update(office.dog, time, quiet)
      const player = office.player.sprite, center = world.elevator.center
      elevator.update({ ...office.liftTravel, inside: player.x >= world.elevator.cabin.x + 12 && Math.abs(player.y - center.y) < 34, near: Math.hypot(player.x - center.x, player.y - center.y) < 90 }, time, quiet)
      for (const door of architecture.doors) {
        const open = office.doors.find(d => d.id === door.id)?.open
        door.root.position.x = THREE.MathUtils.lerp(door.root.position.x, open ? 42 : 0, quiet ? 1 : .15)
      }
      marker.visible = Boolean(destination)
      if (destination) marker.position.set(destination.x, .7, destination.y)
      stage.updateMatrixWorld(true)
      renderer.render(stage, camera)
    },
    stats() { return { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, environment: environment.stats(), characters: [...people].map(([id, person]) => ({ id, look: { ...person.look } })) } },
    destroy() {
      if (disposed) return
      disposed = true
      for (const person of people.values()) person.dispose()
      releaseBatch(); architecture.dispose(); architectureKit.dispose(); environment.dispose(); kit.dispose(); people.clear()
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); stage.clear()
    },
  }
  const wheel = event => { event.preventDefault(); view.zoomBy(event.deltaY < 0 ? 1.08 : 1 / 1.08) }
  element.addEventListener('wheel', wheel, { passive: false })
  const destroy = view.destroy
  view.destroy = () => { element.removeEventListener('wheel', wheel); destroy() }
  return view
}
