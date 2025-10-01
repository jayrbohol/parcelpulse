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
