"use client"

import { useEffect, useState } from 'react'
import type { LatLng } from '@/lib/geo'

export function useCourierSSE(url: string = '/api/courier') {
  const [pos, setPos] = useState<LatLng | null>(null)
  const [t, setT] = useState<number>(0)
  const [leg, setLeg] = useState<'to-sortation' | 'to-hub' | 'to-recipient'>('to-sortation')
  const [waypoints, setWaypoints] = useState<{ sortation: LatLng; hub: LatLng; finalDest: LatLng } | null>(null)

  useEffect(() => {
    const es = new EventSource(url)
    es.onmessage = (e) => {
      try {
        const { pos, t, leg, waypoints } = JSON.parse(e.data)
        if (pos) setPos(pos)
        if (typeof t === 'number') setT(t)
        if (leg) setLeg(leg)
        if (waypoints) setWaypoints(waypoints)
      } catch {}
    }
    return () => es.close()
  }, [url])

  return { pos, t, leg, waypoints }
}
