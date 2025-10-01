"use client"

import { GoogleMap as GMap, LoadScript, Marker, Polyline } from '@react-google-maps/api'
import { useMemo } from 'react'

type LatLng = { lat: number; lng: number }

type Props = {
  center: LatLng
  path?: LatLng[]
  recipient?: LatLng
  courier?: LatLng
  futurePath?: LatLng[]
  sortation?: LatLng
  hub?: LatLng
}

export default function GoogleMap({ center, path, recipient, courier, futurePath, sortation, hub }: Props) {
  const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), [])

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#0B1220' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#9AA4B2' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#0B1220' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2B3440' }] },
        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1C2430' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0E1724' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    }),
    []
  )

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const { courierIcon, recipientIcon, sortationIcon, hubIcon } = useMemo(() => {
    const pkg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
        <rect x='6' y='9' width='20' height='16' rx='3' fill='#F59E0B' stroke='#92400E' stroke-width='2'/>
        <path d='M6 12 L16 7 L26 12' fill='none' stroke='#FBBF24' stroke-width='3' stroke-linejoin='round'/>
        <path d='M16 7 V25' stroke='#92400E' stroke-width='2'/>
      </svg>
    `)}`
    const person = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
        <circle cx='16' cy='11' r='5' fill='#F87171' stroke='#7F1D1D' stroke-width='2'/>
        <path d='M8 26c0-4 3.5-7 8-7s8 3 8 7' fill='#FCA5A5' stroke='#7F1D1D' stroke-width='2' stroke-linejoin='round'/>
      </svg>
    `)}`
    const warehouse = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
        <path d='M4 14 L16 6 L28 14 V26 H4 Z' fill='#94A3B8' stroke='#334155' stroke-width='2'/>
        <rect x='7' y='18' width='6' height='6' fill='#E5E7EB' stroke='#334155' stroke-width='1.5'/>
        <rect x='19' y='18' width='6' height='6' fill='#E5E7EB' stroke='#334155' stroke-width='1.5'/>
      </svg>
    `)}`
    const hubTruck = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
        <rect x='3' y='14' width='14' height='8' rx='2' fill='#60A5FA' stroke='#1D4ED8' stroke-width='2'/>
        <path d='M17 16 H25 L28 19 V22 H17 Z' fill='#3B82F6' stroke='#1D4ED8' stroke-width='2'/>
        <circle cx='9' cy='24' r='3' fill='#0EA5E9' stroke='#075985' stroke-width='2'/>
        <circle cx='23' cy='24' r='3' fill='#0EA5E9' stroke='#075985' stroke-width='2'/>
      </svg>
    `)}`
    return { courierIcon: person, recipientIcon: pkg, sortationIcon: warehouse, hubIcon: hubTruck }
  }, [])

  return (
    <LoadScript googleMapsApiKey={apiKey} loadingElement={<div style={{ height: '100%' }} />}>
      <GMap mapContainerStyle={containerStyle} center={center} zoom={11} options={mapOptions}>
        {/* {path && path.length > 2 && <Polyline path={path} options={{ strokeColor: '#1F6FEB', strokeWeight: 6 }} />}
        {futurePath && (
          <Polyline
            path={path}
            options={{ strokeColor: '#60A5FA', strokeOpacity: 0.35, strokeWeight: 5, icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.35, scale: 4 }, offset: '0', repeat: '12px' }] }}
          />
        )} */}
        {courier && <Marker position={courier} options={{ icon: courierIcon, title: 'Courier' }} />}
        {recipient && <Marker position={recipient} options={{ icon: recipientIcon, title: 'Recipient' }} />}
        {sortation && <Marker position={sortation} options={{ icon: sortationIcon, title: 'Sortation Center' }} />}
        {hub && <Marker position={hub} options={{ icon: hubIcon, title: 'Delivery Hub' }} />}
      </GMap>
    </LoadScript>
  )
}
