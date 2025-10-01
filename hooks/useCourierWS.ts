"use client"
import { useEffect, useRef, useState } from 'react'

export interface WsPos { lat: number; lng: number; ts: number }
export interface RecipientPos { lat: number; lng: number; ts?: number }
export interface PickupPos { lat: number; lng: number; ts?: number }
export interface SortationPos { lat: number; lng: number; ts?: number }
export interface DeliveryPos { lat: number; lng: number; ts?: number }

export function useCourierWS(explicitUrl?: string) {
  const [wsPos, setWsPos] = useState<WsPos | null>(null)
  const [recipient, setRecipient] = useState<RecipientPos | null>(null)
  const [pickup, setPickup] = useState<PickupPos | null>(null)
  const [sortation, setSortation] = useState<SortationPos | null>(null)
  const [delivery, setDelivery] = useState<DeliveryPos | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<number | null>(null)

  useEffect(() => {
    const debug = (msg: string, ...rest: any[]) => {
      if (typeof window !== 'undefined' && (window as any).__WS_DEBUG__) {
        // eslint-disable-next-line no-console
        console.log('[WS]', msg, ...rest)
      }
    }
    const resolveTarget = () => {
      const envUrl = (typeof window !== 'undefined' ? (window as any).NEXT_PUBLIC_WS_URL : undefined) || (process.env.NEXT_PUBLIC_WS_URL)
      let base = explicitUrl || envUrl
      if (!base) {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
        base = `${proto}://${window.location.host}/ws`
      }
      if (base.startsWith('http://') || base.startsWith('https://')) {
        base = base.replace(/^http/, 'ws')
      }
      // Mobile: if base contains localhost/127.* but device host differs, rewrite using current page host
      if (/localhost|127\.0\.0\.1/.test(base)) {
        const currentHost = window.location.host
        if (!/localhost|127\.0\.0\.1/.test(currentHost)) {
          const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
          debug('Rewriting localhost WS URL to device-visible host', currentHost)
          base = `${proto}://${currentHost}/ws`
        }
      }
      return base
    }
    const connect = () => {
      const target = resolveTarget()
      debug('Connecting', target)
      const ws = new WebSocket(target)
      wsRef.current = ws
      ws.onopen = () => debug('Open')
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          debug('Message', data)
          let courierLat: number | undefined
          let courierLng: number | undefined
          const point = data.point || data.payload || undefined
          if (point?.coordinates) {
            courierLat = point.coordinates.lat
            courierLng = point.coordinates.lng
          } else if (data.courier) {
            courierLat = data.courier.lat
            courierLng = data.courier.lng
          } else if (typeof data.lat === 'number' && typeof data.lng === 'number') {
            courierLat = data.lat
            courierLng = data.lng
          }
          if (courierLat != null && courierLng != null) {
            setWsPos({ lat: courierLat, lng: courierLng, ts: data.ts || Date.now() })
          }
          const recipientNode = point?.recipientCoordinates || data.recipient || data.destination || data.dest
          const pickupNode = point?.pickupLocationCoordinates || data.pickup || data.origin || data.src
          const sortationNode = point?.sortationCenterCoordinates || data.sortation || data.sort
          const deliveryNode = point?.deliveryHubCoordinates || data.delivery || data.hub
          if (recipientNode && typeof recipientNode.lat === 'number' && typeof recipientNode.lng === 'number') {
            setRecipient({ lat: recipientNode.lat, lng: recipientNode.lng, ts: recipientNode.ts || data.ts })
          }
          if (pickupNode && typeof pickupNode.lat === 'number' && typeof pickupNode.lng === 'number') {
            setPickup({ lat: pickupNode.lat, lng: pickupNode.lng, ts: pickupNode.ts || data.ts })
          }
            if (sortationNode && typeof sortationNode.lat === 'number' && typeof sortationNode.lng === 'number') {
            setSortation({ lat: sortationNode.lat, lng: sortationNode.lng, ts: sortationNode.ts || data.ts })
          }
          if (deliveryNode && typeof deliveryNode.lat === 'number' && typeof deliveryNode.lng === 'number') {
            setDelivery({ lat: deliveryNode.lat, lng: deliveryNode.lng, ts: deliveryNode.ts || data.ts })
          }
        } catch (err) {
          debug('Message parse error', err)
        }
      }
      ws.onclose = (ev) => {
        debug('Close', ev.code, ev.reason)
        scheduleReconnect()
      }
      ws.onerror = (ev) => {
        debug('Error', ev)
        try { ws.close() } catch {}
      }
    }
    const scheduleReconnect = () => {
      if (retryRef.current != null) return
      retryRef.current = window.setTimeout(() => {
        retryRef.current = null
        connect()
      }, 2000)
    }
    connect()
    return () => {
      if (retryRef.current) window.clearTimeout(retryRef.current)
      retryRef.current = null
      wsRef.current?.close()
    }
  }, [explicitUrl])

  return { wsPos, recipient, pickup, sortation, delivery }
}