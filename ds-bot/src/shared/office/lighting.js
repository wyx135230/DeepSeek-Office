// The office follows the visitor's local day. Pure functions so the scene, HUD and
// tests agree on the light without touching the platform clock.
const PHASES = [
  { id: 'night', from: 0, sky: ['#2a3550', '#3d4d6c'], ambient: '#5d7396', warm: .28, lamp: true, label: 'Night' },
  { id: 'dawn', from: 5, sky: ['#8f7a8f', '#e0a98a'], ambient: '#d8a58c', warm: .55, lamp: true, label: 'Dawn' },
  { id: 'morning', from: 7, sky: ['#8fc6d4', '#d8ecc8'], ambient: '#fff1c6', warm: .7, lamp: false, label: 'Morning' },
  { id: 'midday', from: 11, sky: ['#8cc6dc', '#cfe8dd'], ambient: '#fff6dc', warm: .55, lamp: false, label: 'Midday' },
  { id: 'afternoon', from: 15, sky: ['#a4c4d4', '#f2ddb3'], ambient: '#ffe2a8', warm: .75, lamp: false, label: 'Afternoon' },
  { id: 'evening', from: 18, sky: ['#8a6f8f', '#e7a477'], ambient: '#f2b984', warm: .55, lamp: true, label: 'Evening' },
  { id: 'night', from: 21, sky: ['#2a3550', '#3d4d6c'], ambient: '#5d7396', warm: .28, lamp: true, label: 'Night' },
]

const at = date => {
  const day = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()
  return day.getHours() + day.getMinutes() / 60
}

const RAD = Math.PI / 180
// The office sits at a mid-northern latitude. Local clock time stands in for
// solar time, which keeps the sun overhead at noon wherever the visitor is.
const LATITUDE = 35 * RAD
const DAY_MS = 86400000

/**
 * Sun position for a local date and time, in radians.
 * `azimuth` counts clockwise from north (0 = north, π/2 = east, π = south),
 * `elevation` is measured above the horizon. Presentation only.
 */
export function officeSun(date) {
  const day = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()
  const start = new Date(day.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((day.getTime() - start.getTime()) / DAY_MS) + 1
  const hours = day.getHours() + day.getMinutes() / 60 + day.getSeconds() / 3600
  const declination = 23.44 * RAD * Math.sin(2 * Math.PI * (dayOfYear - 81) / 365)
  const hourAngle = (hours - 12) * 15 * RAD
  const sinElevation = Math.sin(LATITUDE) * Math.sin(declination) + Math.cos(LATITUDE) * Math.cos(declination) * Math.cos(hourAngle)
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinElevation)))
  const cosAzimuth = (Math.sin(declination) - Math.sin(elevation) * Math.sin(LATITUDE)) / (Math.cos(elevation) * Math.cos(LATITUDE) || 1e-6)
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth)))
  if (hourAngle > 0) azimuth = 2 * Math.PI - azimuth
  return { azimuth, elevation, declination, hourAngle }
}

export function officeLight(date, theme = {}) {
  const day = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()
  const hour = at(day)
  const sun = officeSun(day)
  const elevation = sun.elevation
  // The phase follows the real sun, not the hour alone: after sunset the room is
  // already night even at 20:00, and lamps come on in the twilight band.
  const twilight = elevation <= 4 * RAD
  const golden = elevation <= 15 * RAD
  let phase
  if (elevation <= -6 * RAD) phase = PHASES[0]
  else if (twilight) phase = hour < 12 ? PHASES[1] : PHASES[5]
  else if (golden) phase = hour < 12 ? PHASES[2] : PHASES[4]
  else phase = hour >= 11 && hour < 15 ? PHASES[3] : hour < 11 ? PHASES[2] : PHASES[4]
  if (theme.night) phase = PHASES[0]
  const strength = theme.night ? 0 : Math.max(0, Math.min(1, Math.sin(elevation) * 1.8))
  return {
    id: theme.night ? 'night' : phase.id,
    label: theme.night ? 'Night' : phase.label,
    hour,
    sky: phase.sky,
    ambient: phase.ambient,
    warmth: phase.warm,
    lamp: theme.night ? true : twilight,
    light: Number(strength.toFixed(2)),
    sun,
  }
}

export function officeClock(date) {
  const day = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()
  return `${String(day.getHours()).padStart(2, '0')}:${String(day.getMinutes()).padStart(2, '0')}`
}

export function officeDayLabel(date) {
  const day = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getDay()]
}
