"use client"

import GoogleMap from './GoogleMap'
import { useCourierWS } from '@/hooks/useCourierWS'
import type { LatLng } from '@/lib/geo'
import { haversine } from '@/lib/geo'
import { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  center: LatLng
  path: LatLng[]
  recipient: LatLng
}

export default function LiveMap({ center, path, recipient }: Props) {
  // WebSocket-provided live position & possible dynamic recipient (external source)
  const { wsPos, recipient: dynamicRecipient } = useCourierWS()
  const effectiveRecipient = dynamicRecipient ? { lat: dynamicRecipient.lat, lng: dynamicRecipient.lng } : recipient
  const courier = wsPos ? { lat: wsPos.lat, lng: wsPos.lng } : path[0]

  const { isNearby, hasArrived, distanceMeters } = useMemo(() => {
    if (!courier || !effectiveRecipient) return { isNearby: false, hasArrived: false, distanceMeters: Infinity }
    const d = haversine(courier, effectiveRecipient) // meters
    return {
      distanceMeters: d,
      isNearby: d < 1000, // < 1 km
      hasArrived: d < 100, // < 0.1 km
    }
  }, [courier, effectiveRecipient])

  // Doorbell sound when entering proximity
  const audioCtxRef = useRef<AudioContext | null>(null)
  const wasArrivedRef = useRef(false)

  useEffect(() => {
    // Initialize lazily to avoid SSR issues and create only on client
    if (!audioCtxRef.current) {
      try {
        // @ts-ignore - webkit prefix for older Safari
        const Ctx = window.AudioContext || window.webkitAudioContext
        audioCtxRef.current = new Ctx()
      } catch {
        audioCtxRef.current = null
      }
    }
    // Attempt to auto-resume on first user interaction (mobile browsers)
    const onFirstInteract = () => {
      const ctx = audioCtxRef.current
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
    }
    window.addEventListener('pointerdown', onFirstInteract, { once: true })
    return () => window.removeEventListener('pointerdown', onFirstInteract)
  }, [])

  const ringDoorbell = () => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const now = ctx.currentTime
    const make = (freq: number, start: number, dur: number, gain = 0.08) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(g)
      g.connect(ctx.destination)
      // simple envelope for subtle chime
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(gain, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
      osc.start(start)
      osc.stop(start + dur + 0.02)
    }
    // Two-tone soft doorbell
    make(880, now, 0.18) // A5
    make(1318.51, now + 0.12, 0.22) // E6
  }

  useEffect(() => {
    if (hasArrived && !wasArrivedRef.current) {
      ringDoorbell()
    }
    wasArrivedRef.current = hasArrived
  }, [hasArrived])

  // Small inline SVG icons to match marker semantics
  const WarehouseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 14 L16 6 L28 14 V26 H4 Z" fill="#94A3B8" stroke="#334155" strokeWidth="2" />
      <rect x="7" y="18" width="6" height="6" fill="#E5E7EB" stroke="#334155" strokeWidth="1.5" />
      <rect x="19" y="18" width="6" height="6" fill="#E5E7EB" stroke="#334155" strokeWidth="1.5" />
    </svg>
  )
  const TruckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="3" y="14" width="14" height="8" rx="2" fill="#60A5FA" stroke="#1D4ED8" strokeWidth="2" />
      <path d="M17 16 H25 L28 19 V22 H17 Z" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="2" />
      <circle cx="9" cy="24" r="3" fill="#0EA5E9" stroke="#075985" strokeWidth="2" />
      <circle cx="23" cy="24" r="3" fill="#0EA5E9" stroke="#075985" strokeWidth="2" />
    </svg>
  )
  const PersonIcon = () => (
    <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="11" r="5" fill="#F87171" stroke="#7F1D1D" strokeWidth="2" />
      <path d="M8 26c0-4 3.5-7 8-7s8 3 8 7" fill="#FCA5A5" stroke="#7F1D1D" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )

  // Treat provided path indices as logical waypoints: origin -> sortation -> hub -> recipient
  const origin = path[0]
  const sortation = path.length >= 2 ? path[1] : undefined
  const hub = path.length >= 3 ? path[2] : undefined
  // recipient already provided as final destination

  // Build a breadcrumb polyline from actual received positions (WS) to visualize traveled path.
  const [breadcrumbs, setBreadcrumbs] = useState<LatLng[]>(() => [origin])
  const lastAddedRef = useRef<LatLng>(origin)
  useEffect(() => {
    if (!courier) return
    const last = lastAddedRef.current
    const dist = haversine(last, courier)
    // Only append if moved > 5 meters to reduce noise
    if (dist > 5) {
      setBreadcrumbs(prev => [...prev, courier])
      lastAddedRef.current = courier
    }
  }, [courier])

  const distanceText = useMemo(() => {
    if (distanceMeters === undefined || !isFinite(distanceMeters)) return ''
    return distanceMeters >= 1000
      ? `${(distanceMeters / 1000).toFixed(2)} km away`
      : `${Math.round(distanceMeters)} m away`
  }, [distanceMeters])

  // Waypoint arrival detection & stage-based status (heuristic without SSE leg timeline)
  const waypointHitRadius = 30 // meters
  const isAtSortation = useMemo(() => {
    if (!courier || !sortation) return false
    return haversine(courier, sortation) <= waypointHitRadius
  }, [courier, sortation])
  const isAtHub = useMemo(() => {
    if (!courier || !hub) return false
    return haversine(courier, hub) <= waypointHitRadius
  }, [courier, hub])

  type Stage = 'to-sortation' | 'sortation' | 'to-hub' | 'hub' | 'to-recipient' | 'recipient'
  const stage: Stage = useMemo(() => {
    if (!courier) return 'to-sortation'
    if (hasArrived) return 'recipient'
    if (isAtHub) return 'hub'
    if (isAtSortation) return 'sortation'
    // Approximate position along path by nearest waypoint index
    const ordered = [origin, sortation, hub, effectiveRecipient].filter(Boolean) as LatLng[]
    let nearestIdx = 0
    let nearestDist = Infinity
    ordered.forEach((pt, idx) => {
      const d = haversine(courier, pt)
      if (d < nearestDist) {
        nearestDist = d
        nearestIdx = idx
      }
    })
    // Map nearest index to transitional stages
    if (nearestIdx === 0 && sortation) return 'to-sortation'
    if (nearestIdx === 1 && hub) return 'to-hub'
    if (nearestIdx === 2 && effectiveRecipient) return 'to-recipient'
    return 'to-recipient'
  }, [courier, hasArrived, isAtHub, isAtSortation, origin, sortation, hub, effectiveRecipient])

  const [legMsg, setLegMsg] = useState<string | null>(null)
  const [legIcon, setLegIcon] = useState<'warehouse' | 'truck' | 'person' | null>(null)
  const prevStageRef = useRef<Stage | null>(null)
  useEffect(() => {
    const prev = prevStageRef.current
    if (prev !== stage) {
      if (stage === 'sortation') {
        setLegMsg('Parcel received at sortation center')
        setLegIcon('warehouse')
      } else if (prev === 'to-hub' && stage === 'hub') {
        setLegMsg('Arrived at delivery hub')
        setLegIcon('truck')
      } else if (prev === 'to-sortation' && stage === 'to-hub') {
        setLegMsg('On the way to Delivery Hub')
        setLegIcon('truck')
      } else if (prev === 'to-hub' && stage === 'to-recipient') {
        setLegMsg('Out for delivery')
        setLegIcon('truck')
      } else if (stage === 'recipient') {
        setLegMsg('Arriving now')
        setLegIcon('person')
      }
      prevStageRef.current = stage
    }
  }, [stage])

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        center={center}
        path={breadcrumbs}
        recipient={effectiveRecipient}
        courier={courier}
        sortation={sortation}
        hub={hub}
      />
      {legMsg && (
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10" role="status" aria-live="polite">
          <div className="mx-auto max-w-xl rounded-b-lg bg-slate-800/95 px-4 py-2 text-sm font-semibold text-slate-100 shadow-lg">
            <div className="flex items-center gap-2">
              {legIcon === 'warehouse' && <WarehouseIcon />}
              {legIcon === 'truck' && <TruckIcon />}
              {legIcon === 'person' && <PersonIcon />}
              <span>{legMsg}</span>
            </div>
          </div>
        </div>
      )}
      {(isNearby || hasArrived) && (
        <div
          className={`pointer-events-none absolute top-3 right-3 z-10 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg ${hasArrived ? 'bg-emerald-600/95' : 'bg-amber-500/95'}`}
          role="status"
          aria-live="polite"
        >
          {hasArrived ? 'package has arrived' : 'package is nearby'}{distanceText ? ` — ${distanceText}` : ''}
        </div>
      )}
      {/* Removed interpolation-based remaining/ETA panel (SSE removed) */}
    </div>
  )
}
