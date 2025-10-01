export const runtime = 'edge'

// Maintain a global set of connected websocket clients
declare global {
  // eslint-disable-next-line no-var
  var __WS_CLIENTS: Set<WebSocket> | undefined
}

function getClientSet() {
  if (!globalThis.__WS_CLIENTS) {
    globalThis.__WS_CLIENTS = new Set<WebSocket>()
  }
  return globalThis.__WS_CLIENTS
}

export async function GET(request: Request) {
  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected websocket', { status: 400 })
  }
  // @ts-ignore - WebSocketPair is available in edge runtime
  const { 0: client, 1: server } = new WebSocketPair()
  // @ts-ignore
  server.accept()

  const clients = getClientSet()
  clients.add(server as unknown as WebSocket)

  // Heartbeat / cleanup
  // @ts-ignore
  server.addEventListener('close', () => {
    clients.delete(server as unknown as WebSocket)
  })
  // @ts-ignore
  server.addEventListener('error', () => {
    clients.delete(server as unknown as WebSocket)
  })

  // Cast to any because webSocket property is a platform extension not in TS lib
  return new Response(null, { status: 101, webSocket: client } as any)
}

// Utility used by the webhook route to broadcast
export function broadcastJSON(payload: unknown) {
  const clients = getClientSet()
  const msg = JSON.stringify(payload)
  for (const ws of clients) {
    try {
      // @ts-ignore
      ws.send(msg)
    } catch {
      clients.delete(ws)
    }
  }
}