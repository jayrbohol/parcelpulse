export const runtime = 'edge'

import { interpolatePath } from '@/lib/geo'

// Define a multi-leg route: origin -> sortation -> hub -> final destination
const origin = { lat: 40.4017, lng: -3.7074 }
const sortation = { lat: 40.4267, lng: -3.7038 }
const hub = { lat: 40.4382, lng: -3.6886 }
const finalDest = { lat: 40.4170, lng: -3.7033 }
const route = [origin, sortation, hub, finalDest]

// Total simulation duration (ms)
const TOTAL_MS = 1000 * 60 * 12 // 12 minutes

export async function GET(req: Request) {
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  let closed = false

  const send = (obj: any) => {
    if (closed) return
    try {
      const line = `data: ${JSON.stringify(obj)}\n\n`
      writer.write(encoder.encode(line)).catch(() => {})
    } catch {
      // ignore
    }
  }

  const start = Date.now()
  let interval: number | undefined

  const tick = () => {
    const elapsed = Date.now() - start
    let t = elapsed / TOTAL_MS
    if (t > 1) t = 1
    const pos = interpolatePath(route, t)

    // Determine leg based on t partitions across three legs
    const legFraction = 1 / (route.length - 1) // 1/3
    let leg: 'to-sortation' | 'to-hub' | 'to-recipient'
    if (t < legFraction) leg = 'to-sortation'
    else if (t < 2 * legFraction) leg = 'to-hub'
    else leg = 'to-recipient'

    send({ pos, t, leg, waypoints: { sortation, hub, finalDest } })

    if (t >= 1) {
      cleanup()
    }
  }

  const cleanup = () => {
    if (closed) return
    closed = true
    if (interval) clearInterval(interval)
    writer.close().catch(() => {})
  }

  // 1s updates
  // @ts-ignore
  interval = setInterval(tick, 1000)
  tick()

  req.signal.addEventListener('abort', cleanup)

  return new Response(readable, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-no-compression': '1',
    },
  })
}
