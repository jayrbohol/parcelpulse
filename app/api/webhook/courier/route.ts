export const runtime = 'edge'

import { broadcast } from '@/app/ws/route'

const SECRET_HEADER = 'x-webhook-secret'

export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const expected = process.env.WEBHOOK_SHARED_SECRET
  if (expected) {
    const provided = req.headers.get(SECRET_HEADER)
    if (provided !== expected) return new Response('Unauthorized', { status: 401 })
  }

  const arr = Array.isArray(body) ? body : [body]
  const accepted: number[] = []
  const tsBase = Date.now()
  arr.forEach((p, i) => {
    if (p && typeof p.lat === 'number' && typeof p.lng === 'number') {
      const payload = { type: 'courier-pos', lat: p.lat, lng: p.lng, ts: p.ts || tsBase + i * 10 }
      broadcast(payload)
      accepted.push(i)
    }
  })

  if (!accepted.length) return new Response('No valid coordinates', { status: 400 })
  return new Response(JSON.stringify({ accepted: accepted.length }), { status: 200, headers: { 'content-type': 'application/json' } })
}