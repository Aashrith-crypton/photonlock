import { Link } from "wouter";
import { Activity, Aperture, BarChart3, BookOpenText, Compass, FlaskConical, Radar } from "lucide-react";

type Section = "overview" | "simulation" | "performance" | "experiments" | "technical";

const items: Array<{ id: Section; label: string; href: string; icon: typeof Radar }> = [
  { id: "overview", label: "Overview", href: "/", icon: Compass },
  { id: "simulation", label: "Simulation", href: "/simulation", icon: Radar },
  { id: "performance", label: "Performance lab", href: "/performance", icon: BarChart3 },
  { id: "experiments", label: "Experiments", href: "/experiments", icon: FlaskConical },
  { id: "technical", label: "Technical brief", href: "/technical", icon: BookOpenText },
];

export default function MissionNav({ active }: { active: Section }) {
  return <aside className="mission-nav hidden min-h-screen w-[248px] shrink-0 flex-col border-r border-cyan-100/10 px-4 py-5 lg:flex">
    <div className="mb-9 flex items-center gap-3 px-2"><div className="grid h-10 w-10 place-items-center rounded-lg border border-cyan-200/25 bg-cyan-300/10"><Aperture className="h-5 w-5 text-cyan-200" /></div><div><p className="text-sm font-extrabold tracking-[.16em] text-slate-50">PHOTONLOCK</p><p className="mono mt-0.5 text-[9px] tracking-[.16em] text-cyan-200/55">VIRTUAL PAT LAB</p></div></div>
    <nav className="space-y-1" aria-label="Primary navigation">{items.map(item => { const Icon = item.icon; return <Link key={item.id} href={item.href} className={`nav-item ${active === item.id ? "nav-item-active" : ""}`}><Icon className="h-4 w-4" />{item.label}</Link>; })}</nav>
    <div className="mt-auto border-t border-white/[.06] px-2 pt-5"><div className="flex items-center gap-2 text-[10px] font-semibold text-emerald-100"><span className="pulse-live h-1.5 w-1.5 rounded-full bg-emerald-300" /> SYSTEM NOMINAL</div><p className="mono mt-2 text-[9px] leading-4 tracking-[.08em] text-slate-500">DETERMINISTIC SIMULATION<br/>MEASURED OUTPUTS ONLY</p></div>
  </aside>;
}

export function MobileMissionNav({ active }: { active: Section }) {
  return <nav className="mb-5 flex items-center gap-1 overflow-x-auto rounded-lg border border-white/[.08] bg-slate-950/45 p-1 lg:hidden" aria-label="Primary navigation">{items.map(item => { const Icon = item.icon; return <Link key={item.id} href={item.href} className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-[10px] font-semibold ${active === item.id ? "bg-cyan-300 text-slate-950" : "text-slate-400"}`}><Icon className="h-3.5 w-3.5" />{item.label}</Link>; })}</nav>;
}
