type Props = { label: string; value: string; sub?: string }

export default function Stat({ label, value, sub }: Props) {
  return (
    <div className="space-y-1">
      <div className="text-slate-300 tracking-wide text-sm font-semibold">{label}</div>
      <div className="text-xl md:text-2xl font-semibold">{value}</div>
      {sub ? <div className="whitespace-pre-line text-slate-400">{sub}</div> : null}
    </div>
  )
}
