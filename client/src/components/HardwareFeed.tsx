import type { HardwareAdapterConfig } from "@/lib/hardwareAdapter";
import { CameraOff, RadioTower } from "lucide-react";

export default function HardwareFeed({ config, armed }: { config: HardwareAdapterConfig; armed: boolean }) {
  return (
    <div className="simulation-viewport relative grid min-h-[280px] place-items-center overflow-hidden rounded-[1.35rem] border border-amber-200/15 bg-[#06101b] shadow-2xl shadow-amber-950/10">
      {config.streamUrl ? <img src={config.streamUrl} alt="Configured hardware camera feed" className="h-full w-full object-cover" /> : <div className="max-w-sm px-8 text-center"><CameraOff className="mx-auto h-8 w-8 text-amber-200/60" /><p className="mt-4 text-sm font-bold text-slate-200">Hardware feed awaiting configuration</p><p className="mt-2 text-xs leading-5 text-slate-500">Enter an HTTP(S) MJPEG or snapshot stream URL in the hardware adapter. The virtual scene remains available until a verified local bridge is ready.</p></div>}
      <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-amber-200/15 bg-slate-950/75 px-3 py-2"><p className="mono text-[10px] tracking-[.12em] text-amber-100">HARDWARE ADAPTER // {armed ? "ARMED" : "SAFE / DISARMED"}</p><p className="mono mt-1 text-[9px] tracking-[.1em] text-slate-400">COMMANDS LIMITED LOCALLY</p></div>
      <div className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-2 rounded-full border border-amber-200/15 bg-slate-950/75 px-3 py-2"><RadioTower className="h-3.5 w-3.5 text-amber-300" /><span className="mono text-[9px] tracking-[.1em] text-amber-100">EXTERNAL FEED MODE</span></div>
    </div>
  );
}
