import { DEFAULT_HARDWARE_CONFIG, type CameraSource, type HardwareAdapterConfig, validateHardwareConfig } from "@/lib/hardwareAdapter";
import { Camera, Power, ShieldAlert, ShieldCheck, Usb } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  source: CameraSource;
  onSourceChange: (source: CameraSource) => void;
  onConfigChange: (config: HardwareAdapterConfig) => void;
  onArmedChange: (armed: boolean) => void;
};

export default function HardwareAdapterPanel({ source, onSourceChange, onConfigChange, onArmedChange }: Props) {
  const [config, setConfig] = useState(DEFAULT_HARDWARE_CONFIG);
  const [armed, setArmed] = useState(false);

  const update = <K extends keyof HardwareAdapterConfig>(key: K, value: HardwareAdapterConfig[K]) => {
    const next = { ...config, [key]: value };
    setConfig(next);
    onConfigChange(next);
  };

  const armAdapter = () => {
    const issues = validateHardwareConfig(config);
    if (issues.length || !config.streamUrl || !config.commandUrl) {
      toast.error(issues[0] ?? "Provide both the camera stream and pan-tilt bridge URL before arming.");
      return;
    }
    setArmed(true);
    onArmedChange(true);
    toast.success("Hardware adapter armed locally. Command limits are active.");
  };

  const emergencyStop = () => {
    setArmed(false);
    onArmedChange(false);
    onSourceChange("virtual");
    toast.warning("Emergency stop applied. Hardware commands are disarmed and virtual view restored.");
  };

  return (
    <section className="glass-panel rounded-[1.55rem] border border-amber-200/10 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><Usb className="h-4 w-4 text-amber-200" /><div><p className="mono text-[10px] tracking-[.15em] text-slate-500">CAMERA / PAN-TILT ADAPTER</p><h2 className="mt-0.5 text-base font-bold text-slate-100">Virtual or hardware feed</h2></div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${armed ? "bg-amber-300/15 text-amber-100" : "bg-emerald-300/10 text-emerald-200"}`}>{armed ? "ARMED WITH LIMITS" : "SAFE / DISARMED"}</span></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <div><p className="control-label"><span>Camera source</span><span>{source === "virtual" ? "VIRTUAL" : "HARDWARE"}</span></p><div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-white/8 bg-black/10 p-1.5"><button className={`rounded-lg px-3 py-2 text-xs font-semibold ${source === "virtual" ? "bg-cyan-300 text-slate-950" : "text-slate-500"}`} onClick={() => onSourceChange("virtual")}><Camera className="mr-1.5 inline h-3.5 w-3.5" /> Virtual</button><button className={`rounded-lg px-3 py-2 text-xs font-semibold ${source === "hardware" ? "bg-amber-300 text-slate-950" : "text-slate-500"}`} onClick={() => onSourceChange("hardware")}><Usb className="mr-1.5 inline h-3.5 w-3.5" /> Hardware</button></div><p className="mt-3 text-[11px] leading-5 text-slate-500">Hardware mode renders a user-configured HTTP(S) stream. Commands are not issued automatically; arming only unlocks the local adapter contract for an approved bridge.</p><div className="mt-4 rounded-xl border border-amber-200/10 bg-amber-300/[.035] p-3"><div className="flex gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><p className="text-[11px] leading-5 text-amber-100/75">Use a local bridge with authentication and CORS controls. This browser client intentionally has no embedded device credentials and applies the configured angular and slew-rate limits before any future bridge dispatch.</p></div></div></div>
        <div className="space-y-3"><label className="block"><span className="control-label"><span>Camera stream URL</span><span>MJPEG / SNAPSHOT</span></span><input value={config.streamUrl} onChange={event => update("streamUrl", event.target.value)} placeholder="http://192.168.1.50:8080/stream" className="mt-2 h-9 w-full rounded-lg border border-white/10 bg-black/15 px-3 text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-200/35 focus:outline-none" /></label><label className="block"><span className="control-label"><span>Pan-tilt bridge URL</span><span>HTTP(S)</span></span><input value={config.commandUrl} onChange={event => update("commandUrl", event.target.value)} placeholder="https://bridge.example.local/api" className="mt-2 h-9 w-full rounded-lg border border-white/10 bg-black/15 px-3 text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-200/35 focus:outline-none" /></label><div className="grid grid-cols-3 gap-2"><LimitInput label="Pan limit" value={config.maxPanDegrees} unit="°" onChange={value => update("maxPanDegrees", value)} /><LimitInput label="Tilt limit" value={config.maxTiltDegrees} unit="°" onChange={value => update("maxTiltDegrees", value)} /><LimitInput label="Slew rate" value={config.maxRateDegreesPerSecond} unit="°/s" onChange={value => update("maxRateDegreesPerSecond", value)} /></div><div className="flex gap-2 pt-1"><button onClick={armAdapter} className="flex flex-1 items-center justify-center rounded-lg bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-200"><Power className="mr-2 h-3.5 w-3.5" /> Arm adapter</button><button onClick={emergencyStop} className="flex items-center justify-center rounded-lg border border-rose-300/25 bg-rose-300/[.08] px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-300/[.14]"><ShieldCheck className="mr-2 h-3.5 w-3.5" /> E-stop</button></div></div>
      </div>
    </section>
  );
}

function LimitInput({ label, value, unit, onChange }: { label: string; value: number; unit: string; onChange: (value: number) => void }) {
  return <label><span className="control-label"><span>{label}</span><span>{unit}</span></span><input type="number" min="0" value={value} onChange={event => onChange(Number(event.target.value))} className="mt-2 h-9 w-full rounded-lg border border-white/10 bg-black/15 px-2 text-xs text-slate-200 focus:border-amber-200/35 focus:outline-none" /></label>;
}
