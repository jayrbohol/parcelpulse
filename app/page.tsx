import Header from '@/components/Header'
import ParcelCard from '@/components/ParcelCard'
import { sampleParcel } from '@/lib/sample'

export default function Home() {
  return (
    <main className="space-y-8">
      <Header />
      <ParcelCard parcel={sampleParcel} />
    </main>
  )
}
