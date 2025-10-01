# ParcelPulse (Next.js + Tailwind)

A tiny Next.js app that renders the ParcelPulse tracking card with responsive (mobile + desktop) layout inspired by the provided mock.

## Quick start

1. Install dependencies

```powershell
npm install
```

2. Run the dev server

```powershell
npm run dev
```

Then open http://localhost:3000.

### Run on your LAN (other devices)

```powershell
npm run dev:lan
```

- Find your PC’s IP with `ipconfig` (look for IPv4). Other devices on the same Wi‑Fi open: `http://<your-ip>:3000`.
- If you can’t access it, allow Node.js through Windows Defender Firewall.

### Google Maps setup

1. Copy `.env.local.example` to `.env.local` and set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
2. Restart `npm run dev` after changes to env.
3. The `ParcelCard` now renders a live Google Map via `@react-google-maps/api`.

## Notes
- Built with Next.js App Router and Tailwind CSS.
- Map uses Google Maps. You can replace the demo path/center in `components/ParcelCard.tsx`.

## Live Tracking Integration

`LiveMap` consumes real-time courier position (and optional pickup / sortation / delivery-hub / recipient waypoints) from the WebSocket hook `useCourierWS`.

### WebSocket URL Resolution
Order of precedence:
1. Explicit param passed to `useCourierWS(url)`
2. `NEXT_PUBLIC_WS_URL` (env / global)
3. Derived: `ws(s)://<current-host>/ws`

If `localhost` is detected but the page is served from a LAN IP (mobile testing), the host is automatically rewritten to the device-visible host.

### Supported Incoming Message Shapes
Any of these will update the courier (and optionally waypoints):
```jsonc
// Basic courier point
{ "lat": 14.55, "lng": 121.02 }

// With nested point object
{ "point": { "coordinates": { "lat": 14.56, "lng": 121.03 }}}

// Full multi-node payload
{
	"point": {
		"coordinates": { "lat": 14.56, "lng": 121.03 },
		"pickupLocationCoordinates": { "lat": 14.50, "lng": 121.00 },
		"sortationCenterCoordinates": { "lat": 14.57, "lng": 121.05 },
		"deliveryHubCoordinates": { "lat": 14.58, "lng": 121.07 },
		"recipientCoordinates": { "lat": 14.60, "lng": 121.10 }
	}
}
```
Aliases recognized: `origin|src` (pickup), `sortation|sort`, `delivery|hub` (delivery hub), `recipient|destination|dest` (final).

### `LiveMap` Props
| Prop | Type | Description |
|------|------|-------------|
| `center` | `LatLng` | Initial map center (fallback if bounds not auto-fit). |
| `path` | `LatLng[]` | Fallback static path (used until dynamic waypoints arrive). |
| `recipient` | `LatLng` | Fallback recipient location if no dynamic recipient provided. |
| `onProgress` | `(info: { phase: string; progressPct: number\|null }) => void` | Emits smoothed progress for current leg. |
| `messages` | `Partial<Record<...>>` | Override localized status strings. Keys: `pickedUp`, `atSortation`, `toHub`, `atHub`, `outForDelivery`, `arriving`. |

### Phases & Progress
Legs inferred sequentially:
1. `to-sortation`
2. `to-hub`
3. `to-recipient`
4. `recipient` (final arrival)

Progress is a moving average (window size 10) of distance traveled along the current leg (haversine). A leg is 100% when within 30m of its endpoint.

### Status Bar Enhancements
Displays:
- Localized message
- Timestamp of transition (`@ HH:MM:SS`)
- Elapsed time since transition (`(+XmYYs)`)
- Smoothing-based progress percentage
- Dynamic background color per phase (pickup, sortation, hub, out-for-delivery, arriving)

### Localization Example
```tsx
<LiveMap
	center={{ lat: 14.6, lng: 121.0 }}
	path={fallbackPath}
	recipient={recipientFallback}
	messages={{
		pickedUp: 'Retrait effectué – en transit',
		outForDelivery: 'En cours de livraison'
	}}
	onProgress={({ phase, progressPct }) => {
		console.log('Phase', phase, 'Progress', progressPct)
	}}
/> 
```

### Simulating Updates (Webhook)
If you use the built-in webhook (example path: `/api/webhook/courier` if present), you can POST sample batches:
```powershell
curl -X POST http://localhost:3000/api/webhook/courier \ 
	-H "Content-Type: application/json" \ 
	-d '{
		"points": [
			{ "point": { "coordinates": { "lat": 14.55, "lng": 121.01 } } },
			{ "point": { "coordinates": { "lat": 14.555, "lng": 121.02 } } },
			{ "point": { "coordinates": { "lat": 14.56, "lng": 121.03 }, "sortationCenterCoordinates": { "lat": 14.57, "lng": 121.05 } } }
		]
	}'
```

### Debugging on Mobile
In mobile browser console:
```js
window.__WS_DEBUG__ = true
```
Watch logs for `[WS] Connecting`, `Open`, `Message`, etc.

### Extending Further
- Provide a prop for custom color map.
- Expose raw (unsmoothed) progress.
- Add a fit-to-bounds button.
- Accept a `progressSmoothingWindow` (default 10).

