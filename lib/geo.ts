export type LatLng = { lat: number; lng: number }

function toRad(x: number) {
  return (x * Math.PI) / 180
}

export function haversine(a: LatLng, b: LatLng) {
  const R = 6371e3
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
  return R * c
}

export function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }
}

// t in [0,1]
export function interpolatePath(path: LatLng[], t: number): LatLng {
  if (path.length === 0) throw new Error('empty path')
  if (path.length === 1) return path[0]
  const segLens = path.slice(0, -1).map((p, i) => haversine(p, path[i + 1]))
  const total = segLens.reduce((s, x) => s + x, 0)
  let dist = t * total
  for (let i = 0; i < segLens.length; i++) {
    if (dist <= segLens[i]) {
      const localT = segLens[i] === 0 ? 0 : dist / segLens[i]
      return interpolate(path[i], path[i + 1], localT)
    }
    dist -= segLens[i]
  }
  return path[path.length - 1]
}

// Returns a prefix of the path up to progress t, ending at the interpolated point
export function pathPrefixAtT(path: LatLng[], t: number): LatLng[] {
  if (path.length === 0) throw new Error('empty path')
  if (t <= 0) return [path[0]]
  if (t >= 1) return [...path]
  const segLens = path.slice(0, -1).map((p, i) => haversine(p, path[i + 1]))
  const total = segLens.reduce((s, x) => s + x, 0)
  let dist = t * total
  for (let i = 0; i < segLens.length; i++) {
    if (dist <= segLens[i]) {
      const localT = segLens[i] === 0 ? 0 : dist / segLens[i]
      return [...path.slice(0, i + 1), interpolate(path[i], path[i + 1], localT)]
    }
    dist -= segLens[i]
  }
  return [...path]
}

export function totalPathLength(path: LatLng[]): number {
  if (path.length <= 1) return 0
  return path.slice(0, -1).reduce((sum, p, i) => sum + haversine(p, path[i + 1]), 0)
}

export function pathSuffixAtT(path: LatLng[], t: number): LatLng[] {
  if (path.length === 0) return []
  if (t <= 0) return [...path]
  if (t >= 1) return [path[path.length - 1]]
  const segLens = path.slice(0, -1).map((p, i) => haversine(p, path[i + 1]))
  const total = segLens.reduce((s, x) => s + x, 0)
  let dist = t * total
  for (let i = 0; i < segLens.length; i++) {
    if (dist <= segLens[i]) {
      const localT = segLens[i] === 0 ? 0 : dist / segLens[i]
      return [interpolate(path[i], path[i + 1], localT), ...path.slice(i + 1)]
    }
    dist -= segLens[i]
  }
  return [path[path.length - 1]]
}

export function remainingDistanceAtT(path: LatLng[], t: number): number {
  const suffix = pathSuffixAtT(path, t)
  return totalPathLength(suffix)
}
