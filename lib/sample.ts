import { Parcel } from '@/components/ParcelCard'

export const sampleParcel: Parcel = {
  id: 'PP-08243671',
  recipient: 'Morgan Walters',
  loggerId: 'ESP42-004',
  pickup: {
    date: 'March 18, 2024',
    time: '10:15 AM',
    coords: '📶 387800,\n−9.1.400',
  },
  handoff: {
    date: 'March 18, 2024',
    time: '11:30 AM',
    coords: '📶 46.9500,\n−7.4400',
  },
  deliver: {
    time: '1:20 PM',
  },
}
