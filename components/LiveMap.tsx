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
  // WebSocket-provided positions: courier + dynamic nodes
  const { wsPos, recipient: dynamicRecipient, pickup, sortation: dynSortation, delivery } = useCourierWS()
  const effectiveRecipient = dynamicRecipient ? { lat: dynamicRecipient.lat, lng: dynamicRecipient.lng } : recipient
  const effectivePickup = pickup ? { lat: pickup.lat, lng: pickup.lng } : path[0]
  const effectiveSortation = dynSortation ? { lat: dynSortation.lat, lng: dynSortation.lng } : (path.length >= 2 ? path[1] : undefined)
  const effectiveDeliveryHub = delivery ? { lat: delivery.lat, lng: delivery.lng } : (path.length >= 3 ? path[2] : undefined)
  const courier = wsPos ? { lat: wsPos.lat, lng: wsPos.lng } : effectivePickup

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

  // Logical waypoints now come from dynamic feed (fallback to provided path): pickup -> sortation -> delivery hub -> recipient
  const origin = effectivePickup
  const sortation = effectiveSortation
  const hub = effectiveDeliveryHub

  // Build a breadcrumb polyline from actual received positions (WS) to visualize traveled path.
  const [breadcrumbs, setBreadcrumbs] = useState<LatLng[]>(() => [origin])
  const lastAddedRef = useRef<LatLng>(origin)
  // If the origin changes dynamically (first pickup update arrives), reset breadcrumbs
  useEffect(() => {
    setBreadcrumbs([origin])
    lastAddedRef.current = origin
  }, [origin.lat, origin.lng])
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

  // Waypoint arrival & status messaging (transition-based)
  const waypointHitRadius = 30 // meters threshold
  const isAtPickup = useMemo(() => haversine(courier, origin) <= waypointHitRadius, [courier, origin])
  const isAtSortation = useMemo(() => sortation ? haversine(courier, sortation) <= waypointHitRadius : false, [courier, sortation])
  const isAtHub = useMemo(() => hub ? haversine(courier, hub) <= waypointHitRadius : false, [courier, hub])

  const [legMsg, setLegMsg] = useState<string | null>(null)
  const [legIcon, setLegIcon] = useState<'warehouse' | 'truck' | 'person' | null>(null)
  const prevFlagsRef = useRef({ atPickup: false, atSortation: false, atHub: false, arrived: false })

  useEffect(() => {
    const prev = prevFlagsRef.current
    // Initial pickup announcement (only once when we get a dynamic pickup different from default)
    if (isAtPickup && !prev.atPickup) {
      setLegMsg('Picked up – parcel in transit')
      setLegIcon('truck')
    }
    if (isAtSortation && !prev.atSortation) {
      setLegMsg('Parcel received at sortation center')
      setLegIcon('warehouse')
    }
    if (!isAtSortation && prev.atSortation && !isAtHub && !hasArrived) {
      setLegMsg('On the way to Delivery Hub')
      setLegIcon('truck')
    }
    if (isAtHub && !prev.atHub) {
      setLegMsg('Arrived at delivery hub')
      setLegIcon('truck')
    }
    if (!isAtHub && prev.atHub && !hasArrived) {
      setLegMsg('Out for delivery')
      setLegIcon('truck')
    }
    if (hasArrived && !prev.arrived) {
      setLegMsg('Arriving now')
      setLegIcon('person')
    }
    prevFlagsRef.current = { atPickup: isAtPickup, atSortation: isAtSortation, atHub: isAtHub, arrived: hasArrived }
  }, [isAtPickup, isAtSortation, isAtHub, hasArrived])

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
