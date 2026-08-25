import MissionNav, { MobileMissionNav } from "@/components/MissionNav";
import { ArrowUpRight, Aperture, Gauge, Radar, ScanLine, Sparkles } from "lucide-react";
import { Link } from "wouter";

const specs = [
  ["PAT", "POINTING / ACQUISITION / TRACKING"],
  ["AI", "OFFLINE TEMPORAL PREDICTION"],
  ["SIM", "CONFIGURABLE DISTURBANCES"],
  ["EVAL", "REPRODUCIBLE BENCHMARKING"],
];

export default function Overview() {
  return <div className="lab-shell lg:flex"><MissionNav active="overview" /><main className="mission-content"><MobileMissionNav active="overview" /><header className="flex items-center justify-between gap-4"><div className="flex items-center gap-3 lg:hidden"><Aperture className="h-5 w-5 text-cyan-200" /><span className="font-extrabold tracking-[.14em]">PHOTONLOCK</span></div><p className="mono hidden text-[10px] tracking-[.16em] text-cyan-100/55 lg:block">SIH26169 // VIRTUAL FSOC COARSE ALIGNMENT</p><span className="status-chip"><span className="pulse-live h-1.5 w-1.5 rounded-full bg-emerald-300" /> SYSTEM NOMINAL</span></header>
    <section className="overview-hero"><div className="relative z-10 max-w-3xl"><p className="eyebrow">PHYSICS-AWARE OPTICAL TRACKING</p><h1>PHOTONLOCK</h1><h2>Predictive acquisition &amp; tracking laboratory for mobile FSOC terminals.</h2><p className="hero-copy">Simulate, stress-test, and evaluate intelligent coarse-alignment algorithms against measured virtual beacon trajectories, latency, vibration, turbulence-like disturbance, and target loss.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/simulation" className="mission-button"><Radar className="h-4 w-4" /> Launch simulation <ArrowUpRight className="h-3.5 w-3.5" /></Link><Link href="/performance" className="mission-button-secondary"><Gauge className="h-4 w-4" /> Open performance lab</Link></div></div><div className="optical-hero" aria-hidden="true"><div className="optical-orbit orbit-a" /><div className="optical-orbit orbit-b" /><div className="optical-beacon" /><div className="optical-camera"><ScanLine className="h-8 w-8" /></div><div className="optical-beam" /><span className="hero-label label-beacon">DESIGNATED BEACON</span><span className="hero-label label-camera">VIRTUAL CAMERA</span></div></section>
    <section className="spec-strip">{specs.map(([tag, label], index) => <div key={tag} className="spec-cell"><span className="mono text-[10px] text-cyan-200">0{index + 1} / {tag}</span><span>{label}</span></div>)}</section>
    <section className="overview-grid"><article className="technical-panel"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-200" /><p className="eyebrow">DEMO FLOW</p></div><h3>From acquisition to lock restoration.</h3><p>Use the simulation to designate a beacon, observe measured detection and prediction overlays, introduce real supported disturbances, force loss, and compare controllers under the same seeded conditions.</p></article><article className="technical-panel"><div className="flex items-center gap-2"><Aperture className="h-4 w-4 text-cyan-200" /><p className="eyebrow">SCIENTIFIC SCOPE</p></div><h3>Simulated, deterministic, reviewable.</h3><p>PhotonLock reports simulator-derived results and identifies the offline GRU model path explicitly. It does not present virtual outcomes as validated physical-terminal performance.</p></article></section>
  </main></div>;
}
