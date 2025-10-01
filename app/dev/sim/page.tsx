"use client";
import { useState } from 'react';

// Simple simulation page to push waypoint & courier updates via webhook
// Adjust webhookPath if different in your project.
const webhookPath = '/api/webhook/courier';

interface Point { lat: number; lng: number }

const phases = [
  'pickup',
  'to-sortation',
  'sortation',
  'to-hub',
  'hub',
  'to-recipient',
  'recipient'
];

export default function SimPage() {
  const [ip, setIp] = useState<string>('localhost');
  const [port, setPort] = useState<string>('3000');
  const [log, setLog] = useState<string[]>([]);
  const [coord, setCoord] = useState<Point>({ lat: 14.55, lng: 121.00 });
  const [pickup, setPickup] = useState<Point>({ lat: 14.50, lng: 121.00 });
  const [sortation, setSortation] = useState<Point>({ lat: 14.57, lng: 121.05 });
  const [hub, setHub] = useState<Point>({ lat: 14.58, lng: 121.07 });
  const [recipient, setRecipient] = useState<Point>({ lat: 14.60, lng: 121.10 });
  const [auto, setAuto] = useState<boolean>(false);
  const [phaseIdx, setPhaseIdx] = useState<number>(0);

  const baseUrl = `http://${ip}:${port}`;

  const push = async (body: any) => {
    try {
      const res = await fetch(baseUrl + webhookPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setLog(l => [new Date().toLocaleTimeString() + ' OK ' + JSON.stringify(body), ...l.slice(0,199)]);
      if (!res.ok) throw new Error(await res.text());
    } catch (e: any) {
      setLog(l => [new Date().toLocaleTimeString() + ' ERR ' + e.message, ...l.slice(0,199)]);
    }
  };

  const pushCourier = () => {
    push({ point: { coordinates: coord }});
  };

  const pushAllWaypoints = () => {
    push({ point: {
      coordinates: coord,
      pickupLocationCoordinates: pickup,
      sortationCenterCoordinates: sortation,
      deliveryHubCoordinates: hub,
      recipientCoordinates: recipient,
    }});
  };

  const advancePhase = () => {
    setPhaseIdx(i => (i + 1) % phases.length);
  };

  const autoRun = async () => {
    if (auto) return;
    setAuto(true);
    // Simple scripted path along legs
    const legs: Point[][] = [
      // pickup -> sortation
      interpolateLine(pickup, sortation, 8),
      // sortation -> hub
      interpolateLine(sortation, hub, 6),
      // hub -> recipient
      interpolateLine(hub, recipient, 10)
    ];
    for (let li = 0; li < legs.length && auto; li++) {
      for (let pi = 0; pi < legs[li].length && auto; pi++) {
        const p = legs[li][pi];
        setCoord(p);
        push({ point: { coordinates: p } });
        await wait(1500);
      }
      advancePhase();
    }
    setAuto(false);
  };

  return <div className="p-6 space-y-6 max-w-3xl mx-auto">
    <h1 className="text-2xl font-bold">Simulation Harness</h1>
    <div className="grid gap-4 md:grid-cols-3">
      <Field label="Host/IP">
        <input className="bg-black text-slate-100 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-sky-500/60 text-xs placeholder-slate-500" value={ip} onChange={e=>setIp(e.target.value)} />
      </Field>
      <Field label="Port">
        <input className="bg-black text-slate-100 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-sky-500/60 text-xs placeholder-slate-500" value={port} onChange={e=>setPort(e.target.value)} />
      </Field>
      <Field label="Phase">
        <div className="flex gap-2 items-center">
          <span className="text-sm font-mono">{phases[phaseIdx]}</span>
          <button className="btn" onClick={advancePhase}>Next</button>
        </div>
      </Field>
    </div>
    <CoordEditors
      coord={coord} setCoord={setCoord}
      pickup={pickup} setPickup={setPickup}
      sortation={sortation} setSortation={setSortation}
      hub={hub} setHub={setHub}
      recipient={recipient} setRecipient={setRecipient}
    />
    <div className="flex flex-wrap gap-3">
      <button className="btn" onClick={pushCourier}>Push Courier</button>
      <button className="btn" onClick={pushAllWaypoints}>Push All Waypoints</button>
      <button className="btn" onClick={autoRun} disabled={auto}>{auto ? 'Running...' : 'Auto Sim'}</button>
      <button className="btn" onClick={() => setAuto(false)}>Stop</button>
      <button className="btn" onClick={() => setLog([])}>Clear Log</button>
    </div>
    <LogPanel log={log} />
    <StyleInject />
  </div>;
}

function Field({ label, children }: { label: string; children: any }) {
  return <label className="space-y-1 block text-sm">
    <div className="font-medium text-slate-300">{label}</div>
    {children}
  </label>;
}

function CoordEditors(props: any) {
  const { coord, setCoord, pickup, setPickup, sortation, setSortation, hub, setHub, recipient, setRecipient } = props;
  return <div className="grid md:grid-cols-2 gap-4">
    <CoordBlock title="Courier" point={coord} onChange={setCoord} />
    <CoordBlock title="Pickup" point={pickup} onChange={setPickup} />
    <CoordBlock title="Sortation" point={sortation} onChange={setSortation} />
    <CoordBlock title="Hub" point={hub} onChange={setHub} />
    <CoordBlock title="Recipient" point={recipient} onChange={setRecipient} />
  </div>;
}

function CoordBlock({ title, point, onChange }: { title: string; point: Point; onChange: (p: Point) => void }) {
  return <div className="p-3 rounded-lg bg-slate-800/60 ring-1 ring-white/10 space-y-2">
    <div className="text-xs font-semibold tracking-wide text-slate-400">{title}</div>
    <div className="grid grid-cols-2 gap-2 text-xs">
  <input className="bg-black text-slate-100 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-sky-500/60 text-xs placeholder-slate-500" value={point.lat} onChange={e=>onChange({ ...point, lat: parseFloat(e.target.value) })} />
  <input className="bg-black text-slate-100 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-sky-500/60 text-xs placeholder-slate-500" value={point.lng} onChange={e=>onChange({ ...point, lng: parseFloat(e.target.value) })} />
    </div>
  </div>;
}

function LogPanel({ log }: { log: string[] }) {
  return <div className="max-h-64 overflow-auto text-xs font-mono bg-black/50 p-3 rounded-lg w-full space-y-1">
    {log.map((l,i)=><div key={i}>{l}</div>)}
  </div>;
}

function interpolateLine(a: Point, b: Point, steps: number): Point[] {
  const out: Point[] = [];
  for (let i=0;i<=steps;i++) {
    const t = i/steps;
    out.push({ lat: a.lat + (b.lat - a.lat)*t, lng: a.lng + (b.lng - a.lng)*t });
  }
  return out;
}

function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function StyleInject() {
  return <style>{`
    .btn { background:#334155; padding:0.5rem 0.75rem; border-radius:0.375rem; font-size:0.75rem; font-weight:600; letter-spacing:0.05em; color:#f1f5f9; }
    .btn:hover { background:#475569; }
  `}</style>;
}
