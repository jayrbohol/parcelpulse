import Stat from './Stat'
import LiveMap from './LiveMap'

export type Parcel = {
  id: string
  recipient: string
  loggerId: string
  pickup: { date: string; time: string; coords: string }
  handoff: { date: string; time: string; coords: string }
  deliver: { time: string }
}

export default function ParcelCard({ parcel }: { parcel: Parcel }) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="text-slate-300">Recipient:</div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">{parcel.recipient}</h1>
        <div className="text-slate-300">Logger ID:</div>
        <div className="text-3xl md:text-4xl font-extrabold">{parcel.loggerId}</div>
      </section>

      <section className="rounded-xl bg-card/70 ring-1 ring-white/10 p-2 md:p-4">
        <div className="relative h-64 md:h-96 w-full overflow-hidden rounded-lg">
          <LiveMap
            center={{ lat: 40.4168, lng: -3.7038 }}
            path={[
              { lat: 40.405, lng: -3.72 },
              { lat: 40.41, lng: -3.71 },
              { lat: 40.42, lng: -3.70 },
              { lat: 40.44, lng: -3.69 },
            ]}
            recipient={{ lat: 40.44, lng: -3.69 }}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
        <Stat label="PICKUP" value={parcel.pickup.date} sub={`${parcel.pickup.time}\n\n${parcel.pickup.coords}`} />
        <Stat label="HANDOFF" value={parcel.handoff.date} sub={`${parcel.handoff.time}\n\n${parcel.handoff.coords}`} />
        <div className="space-y-3">
          <div className="text-slate-300 tracking-wide text-sm font-semibold">DELIVER</div>
          <div className="text-xl md:text-2xl font-semibold">{parcel.deliver.time}</div>
          <button className="self-start rounded-xl bg-primary px-6 py-4 font-semibold shadow-md hover:brightness-110 w-fit">EXPRESS</button>
        </div>
      </section>
    </div>
  )
}
