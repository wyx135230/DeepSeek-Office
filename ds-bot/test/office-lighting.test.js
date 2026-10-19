import assert from 'node:assert/strict'
import { test } from 'node:test'
import { officeClock, officeDayLabel, officeLight, officeSun } from '../src/shared/office/lighting.js'

const at = (hours, minutes = 0) => new Date(2026, 0, 5, hours, minutes)

test('the office light follows the local day and exposes one phase every time', () => {
  const phases = [[0, 'night'], [6, 'night'], [7, 'dawn'], [8, 'morning'], [11, 'midday'], [12, 'midday'], [16, 'afternoon'], [17, 'evening'], [18, 'night'], [22, 'night']]
  for (const [hour, id] of phases) assert.equal(officeLight(at(hour)).id, id, `${hour}:00`)
  for (let hour = 0; hour < 24; hour++) {
    const light = officeLight(at(hour, 30))
    assert.ok(light.label)
    assert.equal(light.sky.length, 2)
    assert.ok(light.light >= 0 && light.light <= 1)
    assert.equal(typeof light.lamp, 'boolean')
  }
})

test('sunlight fades at night and lamps switch on while the office is dark', () => {
  assert.ok(officeLight(at(12)).light > officeLight(at(8)).light)
  assert.equal(officeLight(at(12)).lamp, false)
  assert.equal(officeLight(at(2)).lamp, true)
  assert.equal(officeLight(at(2)).light, 0)
  assert.equal(officeLight(at(19)).lamp, true)
})

test('a moonlit room theme forces night regardless of the clock', () => {
  const theme = { night: true }
  for (const hour of [8, 12, 17]) {
    const light = officeLight(at(hour), theme)
    assert.equal(light.id, 'night')
    assert.equal(light.lamp, true)
    assert.equal(light.label, 'Night')
  }
})

test('an autumn evening after sunset is already night outside', () => {
  const light = officeLight(new Date(2026, 9, 19, 20, 40))
  assert.equal(light.id, 'night')
  assert.equal(light.label, 'Night')
  assert.equal(light.lamp, true)
  assert.ok(light.sun.elevation < -.3)
})

test('the HUD clock and weekday are stable local strings', () => {
  assert.equal(officeClock(at(9, 5)), '09:05')
  assert.equal(officeClock(at(21, 40)), '21:40')
  assert.equal(officeDayLabel(at(12)), 'Mon')
  assert.equal(officeDayLabel(new Date(2026, 0, 4, 12)), 'Sun')
  assert.equal(officeClock(new Date(Number.NaN)), officeClock(new Date()))
})

test('the sun follows the local solar path, east in the morning and west in the afternoon', () => {
  const noon = officeSun(at(12))
  const morning = officeSun(at(8))
  const evening = officeSun(at(16))
  const night = officeSun(at(2))
  // North is 0, east is π/2 and south is π, so midday sits near π.
  assert.ok(Math.abs(noon.azimuth - Math.PI) < .2, `noon azimuth ${noon.azimuth}`)
  assert.ok(noon.elevation > 20 * Math.PI / 180 && noon.elevation < 60 * Math.PI / 180)
  assert.ok(morning.azimuth > 60 * Math.PI / 180 && morning.azimuth < 150 * Math.PI / 180, `morning azimuth ${morning.azimuth}`)
  assert.ok(evening.azimuth > 210 * Math.PI / 180 && evening.azimuth < 300 * Math.PI / 180, `evening azimuth ${evening.azimuth}`)
  assert.ok(morning.elevation > 0 && morning.elevation < noon.elevation)
  assert.ok(evening.elevation > 0 && evening.elevation < noon.elevation)
  assert.ok(night.elevation < 0)
  assert.ok(officeLight(at(12)).sun.elevation > 0)
})
