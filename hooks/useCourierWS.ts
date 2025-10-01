"use client"
import { useEffect, useRef, useState } from 'react'

export interface WsPos { lat: number; lng: number; ts: number }
export interface RecipientPos { lat: number; lng: number; ts?: number }

export function useCourierWS(explicitUrl?: string) {
  const [wsPos, setWsPos] = useState<WsPos | null>(null)
  const [recipient, setRecipient] = useState<RecipientPos | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<number | null>(null)

  useEffect(() => {
    const connect = () => {
      // Precedence: explicit param > env var > derived local path
      const envUrl = (typeof window !== 'undefined' ? (window as any).NEXT_PUBLIC_WS_URL : undefined) || (process.env.NEXT_PUBLIC_WS_URL)
      let target = explicitUrl || envUrl
      if (!target) {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
        target = `${proto}://${window.location.host}/ws`
      } else if (target.startsWith('http://') || target.startsWith('https://')) {
        // Convert http(s) -> ws(s)
        target = target.replace(/^http/, 'ws')
      }
      const ws = new WebSocket(target)
      wsRef.current = ws
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          // Expected flexible formats:
          // 1) { point: { coordinates: { lat, lng } }, ts }
          // 2) { courier: { lat, lng }, recipient: { lat, lng } }
          // 3) { lat, lng } (bare coordinates for courier)
          // 4) { recipient: { lat, lng } } (update only recipient)
          let courierLat: number | undefined
          console.log(data)
          let courierLng: number | undefined
          if (data.point?.coordinates) {
            courierLat = data.point.coordinates.lat
            courierLng = data.point.coordinates.lng
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
          const rec = data.point.recipientCoordinates || data.destination || data.dest
          if (rec && typeof rec.lat === 'number' && typeof rec.lng === 'number') {
            setRecipient({ lat: rec.lat, lng: rec.lng, ts: rec.ts || data.ts })
          } 
        } catch {
          // swallow parse errors silently
        }
      }
      ws.onclose = scheduleReconnect
      ws.onerror = () => { try { ws.close() } catch {} }
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
  }, [])

  return { wsPos, recipient }
}