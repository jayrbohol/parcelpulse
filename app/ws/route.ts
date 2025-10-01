export const runtime = 'edge'

declare global {
  // eslint-disable-next-line no-var
  var __WS_CLIENTS: Set<WebSocket> | undefined
}

function clients() {
  if (!globalThis.__WS_CLIENTS) globalThis.__WS_CLIENTS = new Set<WebSocket>()
  return globalThis.__WS_CLIENTS
}

export async function GET(request: Request) {
  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 400 })
  }
  // @ts-ignore platform pair
  const { 0: client, 1: server } = new WebSocketPair()
  // @ts-ignore
  server.accept()
  const set = clients()
  set.add(server as unknown as WebSocket)
  // @ts-ignore
  server.addEventListener('close', () => set.delete(server as unknown as WebSocket))
  // @ts-ignore
  server.addEventListener('error', () => set.delete(server as unknown as WebSocket))
  return new Response(null, { status: 101, webSocket: client } as any)
}

export function broadcast(payload: unknown) {
  const msg = JSON.stringify(payload)
  for (const ws of clients()) {
    try { /* @ts-ignore */ ws.send(msg) } catch { clients().delete(ws) }
  }
}