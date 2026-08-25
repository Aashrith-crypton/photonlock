import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import MissionNav, { MobileMissionNav } from "@/components/MissionNav";
import HardwareAdapterPanel from "@/components/HardwareAdapterPanel";
import HardwareFeed from "@/components/HardwareFeed";
import SimulationViewport from "@/components/SimulationViewport";
import { DEFAULT_HARDWARE_CONFIG, type CameraSource, type HardwareAdapterConfig } from "@/lib/hardwareAdapter";
import { downloadSihExperimentReport } from "@/lib/pdfReport";
import { GRU_MODEL_INFO } from "@/lib/sequencePredictor";
import { DEFAULT_CONFIG, metricValue, PhotonSimulation, PRESETS, runBenchmark, runPredictorComparison, type BenchmarkResult, type PredictorComparison, type SimulationConfig, type TrackingMode } from "@/lib/simulator";
import { trpc } from "@/lib/trpc";
import { Activity, Aperture, BarChart3, ChevronRight, CircleHelp, Cpu, Download, FileDown, Gauge, History, Layers3, Pause, Play, Radar, RotateCcw, Settings2, Target, TimerReset, TriangleAlert, Waves, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

const STRESS_PROTOCOL: Array<{ label: string; note: string; config: Partial<SimulationConfig> }> = [
  { label: "PHASE 01 · NOMINAL", note: "Low-noise baseline acquisition", config: { ...PRESETS.find(item => item.id === "normal")?.config } },
  { label: "PHASE 02 · TARGET MOTION", note: "Increase designated-beacon velocity", config: { trajectory: "uav", targetSpeed: 1.35, noise: 0.06, vibration: 0.07, turbulence: 0.06, latencyMs: 70, occlusionDuration: 0 } },
  { label: "PHASE 03 · PLATFORM VIBRATION", note: "Introduce supported camera-base vibration", config: { vibration: 0.7, turbulence: 0.1, latencyMs: 85 } },
  { label: "PHASE 04 · SENSOR NOISE", note: "Increase simulated visual noise", config: { noise: 0.28, vibration: 0.42, turbulence: 0.16 } },
  { label: "PHASE 05 · LATENCY", note: "Apply high end-to-end perception delay", config: { latencyMs: 310, targetSpeed: 1.45 } },
  { label: "PHASE 06 · TARGET LOSS", note: "Run configured occlusion and real reacquisition state", config: { occlusionStart: 3, occlusionDuration: 3.3, latencyMs: 170 } },
];

const STATE_COPY: Record<string, { label: string; detail: string; tone: "cyan" | "emerald" | "amber" | "rose" }> = {
  search: { label: "SEARCH", detail: "Scanning around the virtual lock zone", tone: "cyan" },
  acquiring: { label: "ACQUIRING", detail: "Validating consecutive centroid detections", tone: "amber" },
  locked: { label: "LOCKED", detail: "Camera control is following the selected reference", tone: "emerald" },
  lost: { label: "TARGET LOST", detail: "Last-known position retained; loss detection active", tone: "rose" },
  reacquiring: { label: "REACQUIRING", detail: "Searching the last-known uncertainty region", tone: "cyan" },
};

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const historyQuery = trpc.experiment.list.useQuery(undefined, { enabled: isAuthenticated });
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [running, setRunning] = useState(true);
  const [activePreset, setActivePreset] = useState("normal");
  const [benchmark, setBenchmark] = useState<BenchmarkResult | null>(null);
  const [predictorBenchmark, setPredictorBenchmark] = useState<PredictorComparison | null>(null);
  const [cameraSource, setCameraSource] = useState<CameraSource>("virtual");
  const [hardwareConfig, setHardwareConfig] = useState<HardwareAdapterConfig>(DEFAULT_HARDWARE_CONFIG);
  const [adapterArmed, setAdapterArmed] = useState(false);
  const [stressPhase, setStressPhase] = useState<number | null>(null);
  const engine = useRef(new PhotonSimulation(DEFAULT_CONFIG));
  const [snapshot, setSnapshot] = useState(() => engine.current.getSnapshot());
  const saveRun = trpc.experiment.save.useMutation({
    onSuccess: async () => {
      await utils.experiment.list.invalidate();
      toast.success("Benchmark saved to experiment history.");
    },
    onError: error => toast.error(error.message),
  });

  const resetScene = (nextConfig = config) => {
    engine.current = new PhotonSimulation(nextConfig);
    setSnapshot(engine.current.getSnapshot());
  };

  useEffect(() => {
    resetScene(config);
  }, [config]);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let prior = performance.now();
    const advance = (now: number) => {
      engine.current.step((now - prior) / 1000);
      prior = now;
      setSnapshot(engine.current.getSnapshot());
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [running, config]);

  useEffect(() => {
    if (stressPhase === null || stressPhase >= STRESS_PROTOCOL.length) return;
    const phase = STRESS_PROTOCOL[stressPhase];
    setConfig(previous => ({ ...DEFAULT_CONFIG, ...previous, ...phase.config, mode: previous.mode, predictor: previous.predictor, seed: previous.seed }));
    setActivePreset("stress");
    const timer = window.setTimeout(() => setStressPhase(step => step === null ? null : step + 1), 4200);
    return () => window.clearTimeout(timer);
  }, [stressPhase]);

  const trackingMode = config.mode;
  const benchmarkDelta = useMemo(() => {
    if (!benchmark) return null;
    return benchmark.classical.meanError - benchmark.predictive.meanError;
  }, [benchmark]);
  const predictorDelta = useMemo(() => predictorBenchmark ? predictorBenchmark.kinematic.meanError - predictorBenchmark.trainedGru.meanError : null, [predictorBenchmark]);

  const updateConfig = <K extends keyof SimulationConfig>(key: K, value: SimulationConfig[K]) => {
    setConfig(previous => ({ ...previous, [key]: value }));
    setActivePreset("custom");
  };

  const resetDisturbances = () => setConfig(previous => ({ ...previous, noise: DEFAULT_CONFIG.noise, vibration: DEFAULT_CONFIG.vibration, turbulence: DEFAULT_CONFIG.turbulence, latencyMs: DEFAULT_CONFIG.latencyMs, occlusionDuration: 0 }));

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find(item => item.id === presetId);
    if (!preset) return;
    const next = { ...DEFAULT_CONFIG, ...preset.config, seed: config.seed, mode: config.mode, predictor: config.predictor };
    setConfig(next);
    setActivePreset(presetId);
    setBenchmark(null);
    setPredictorBenchmark(null);
  };

  const downloadReport = () => {
    const report = { generatedAt: new Date().toISOString(), configuration: config, liveMetrics: snapshot.metrics, benchmark };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `photonlock-run-${config.seed}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    const values = [
      ["run_type", "metric", "value", "unit"],
      ["live", "mean_tracking_error", snapshot.metrics.meanError.toFixed(4), "px"],
      ["live", "rmse", snapshot.metrics.rmse.toFixed(4), "px"],
      ["live", "lock_retention", snapshot.metrics.lockRetention.toFixed(4), "%"],
      ["live", "loss_count", snapshot.metrics.lossCount.toString(), "count"],
      ["live", "fps", snapshot.metrics.fps.toFixed(4), "fps"],
      ["live", "end_to_end_latency", snapshot.metrics.endToEndLatency.toFixed(4), "ms"],
      ["classical", "mean_tracking_error", benchmark?.classical.meanError.toFixed(4) ?? "", "px"],
      ["predictive", "mean_tracking_error", benchmark?.predictive.meanError.toFixed(4) ?? "", "px"],
      ["classical", "lock_retention", benchmark?.classical.lockRetention.toFixed(4) ?? "", "%"],
      ["predictive", "lock_retention", benchmark?.predictive.lockRetention.toFixed(4) ?? "", "%"],
    ];
    const csv = values.map(row => row.map(value => `"${value.replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `photonlock-metrics-${config.seed}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadSihPdf = async () => {
    if (!benchmark) {
      toast.message("Run a benchmark comparison before generating the SIH report.");
      return;
    }
    await downloadSihExperimentReport({ configuration: config, snapshot, benchmark, predictorComparison: predictorBenchmark });
    toast.success("SIH PDF report prepared for download.");
  };

  const saveBenchmark = () => {
    if (!benchmark) return;
    if (!isAuthenticated) {
      toast.message("Sign in to store experiment history.");
      startLogin();
      return;
    }
    saveRun.mutate({
      label: `Benchmark · seed ${config.seed}`,
      seed: config.seed,
      trackerMode: "benchmark",
      configuration: config as unknown as Record<string, unknown>,
      results: benchmark as unknown as Record<string, unknown>,
    });
  };

  const stateInfo = STATE_COPY[snapshot.state];
  const target = snapshot.beacons.find(beacon => beacon.id === 0);
  const targetVelocity = Math.hypot(snapshot.targetVelocity.x, snapshot.targetVelocity.y);

  return (
    <div className="lab-shell lg:flex">
      <MissionNav active="simulation" />

      <main className="mission-content">
        <MobileMissionNav active="simulation" />
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 lg:hidden"><div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-300"><Aperture className="h-4 w-4 text-slate-950" /></div><span className="font-extrabold tracking-[.12em]">PHOTONLOCK</span></div>
          <div className="hidden lg:block"><p className="mono text-[10px] font-medium tracking-[.18em] text-cyan-200/60">EXPERIMENT CONSOLE / 01</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-100">Optical acquisition laboratory</h1></div>
          <div className="ml-auto flex items-center gap-2.5">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.06] px-3 py-2 sm:flex"><span className="pulse-live h-1.5 w-1.5 rounded-full bg-emerald-300" /><span className="mono text-[10px] tracking-[.1em] text-emerald-100">{running ? "SIMULATION LIVE" : "SIMULATION PAUSED"}</span></div>
            <Button variant="outline" onClick={downloadCsv} className="hidden border-white/10 bg-white/[.035] text-slate-200 hover:bg-white/10 md:inline-flex"><Download className="mr-2 h-4 w-4" /> CSV</Button>
            <Button variant="outline" onClick={downloadReport} className="hidden border-white/10 bg-white/[.035] text-slate-200 hover:bg-white/10 sm:inline-flex"><Download className="mr-2 h-4 w-4" /> JSON</Button>
            <Button variant="outline" onClick={downloadSihPdf} className="hidden border-violet-200/20 bg-violet-300/[.07] text-violet-100 hover:bg-violet-300/[.14] xl:inline-flex"><FileDown className="mr-2 h-4 w-4" /> SIH PDF</Button>
            <Button onClick={() => setRunning(value => !value)} className="bg-cyan-300 font-semibold text-slate-950 hover:bg-cyan-200"><>{running ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}{running ? "Pause" : "Resume"}</></Button>
          </div>
        </header>

        <section id="laboratory" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_318px]">
          <div className="space-y-5">
            <div className="glass-panel overflow-hidden rounded-[1.55rem] border border-cyan-100/10 p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
                <div className={`state-readout state-${stateInfo.tone}`}><span className="h-2 w-2 rounded-full" /><span className="mono text-[10px] font-medium uppercase tracking-[.14em]">{stateInfo.label}</span><span className="hidden text-[10px] text-slate-500 sm:inline">{stateInfo.detail}</span></div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400"><span className="mono">T+ {snapshot.time.toFixed(1)}s</span><span className="h-3 w-px bg-white/15" /><span className="mono">SEED {config.seed}</span></div>
              </div>
              {cameraSource === "virtual" ? <SimulationViewport snapshot={snapshot} config={config} running={running} /> : <HardwareFeed config={hardwareConfig} armed={adapterArmed} />}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                <Metric label="Tracking error" value={`${snapshot.metrics.meanError.toFixed(2)} px`} accent="cyan" />
                <Metric label="Lock retention" value={`${snapshot.metrics.lockRetention.toFixed(1)}%`} accent="emerald" />
                <Metric label="Latency" value={`${snapshot.metrics.endToEndLatency.toFixed(0)} ms`} accent="violet" />
                <Metric label="Confidence" value={`${(snapshot.confidence * 100).toFixed(0)}%`} accent="amber" />
                <Metric label="Yaw" value={`${snapshot.camera.pan.toFixed(2)}°`} accent="cyan" />
                <Metric label="Target velocity" value={`${targetVelocity.toFixed(2)} u/s`} accent="amber" />
              </div>
            </div>

            <section className={`state-console ${stateInfo.tone === "rose" ? "state-console-alert" : ""}`}><div className="flex items-center gap-3"><Target className="h-4 w-4" /><div><p className="eyebrow">TRACKING STATE MACHINE</p><p className="mt-1 text-sm font-semibold text-slate-100">{stateInfo.label} <span className="font-normal text-slate-400">· {stateInfo.detail}</span></p></div></div><div className="mono text-[10px] text-slate-400">{snapshot.isOccluded ? "OCCLUSION ACTIVE" : snapshot.prediction ? "PREDICTION ACTIVE" : "FILTER WARM-UP"}</div></section>

            <section id="telemetry" className="glass-panel rounded-[1.55rem] border border-cyan-100/10 p-4 sm:p-5">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="mono text-[10px] tracking-[.15em] text-slate-500">MEASURED TELEMETRY</p><h2 className="mt-1 text-base font-bold text-slate-100">Pointing and prediction residuals</h2></div><div className="flex items-center gap-3 text-[10px] text-slate-400"><span className="flex items-center gap-1.5"><i className="legend-dot bg-cyan-300" /> CONTROL ERROR</span><span className="flex items-center gap-1.5"><i className="legend-dot bg-violet-400" /> PREDICTION</span></div></div>
              <div className="h-48 sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={snapshot.history}><defs><linearGradient id="errorFill" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#67e8f9" stopOpacity={0.3}/><stop offset="95%" stopColor="#67e8f9" stopOpacity={0}/></linearGradient><linearGradient id="predictionFill" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#c084fc" stopOpacity={0.22}/><stop offset="95%" stopColor="#c084fc" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="rgba(148,163,184,.12)" /><XAxis dataKey="time" hide /><YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={28}/><Tooltip contentStyle={{ background: "#0d1c2c", border: "1px solid rgba(125,211,252,.2)", borderRadius: 12 }} labelFormatter={(value) => `T+ ${Number(value).toFixed(1)}s`} formatter={(value: number) => `${value.toFixed(2)} px`} /><Area type="monotone" dataKey="error" name="Control error" stroke="#67e8f9" strokeWidth={2} fill="url(#errorFill)" /><Area type="monotone" dataKey="predictionError" name="Prediction residual" stroke="#c084fc" strokeWidth={1.6} fill="url(#predictionFill)" /></AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <aside className="glass-panel rounded-[1.55rem] border border-cyan-100/10 p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between"><div><p className="mono text-[10px] tracking-[.15em] text-slate-500">MISSION CONFIGURATION</p><h2 className="mt-1 text-base font-bold text-slate-100">Algorithm &amp; disturbances</h2></div><Settings2 className="h-4 w-4 text-cyan-200/60" /></div>
            <div className="mb-5 rounded-xl border border-white/8 bg-black/10 p-1.5"><div className="grid grid-cols-2 gap-1"><ModeButton active={trackingMode === "classical"} onClick={() => updateConfig("mode", "classical")} label="Classical" /><ModeButton active={trackingMode === "predictive"} onClick={() => updateConfig("mode", "predictive")} label="Predictive" /></div></div>
            <div className="mb-5"><p className="control-label"><span>Predictor model</span><span>{config.predictor === "gru" ? "TRAINED GRU" : "KINEMATIC"}</span></p><div className="mt-2 grid grid-cols-2 gap-1 rounded-xl border border-white/8 bg-black/10 p-1.5"><ModeButton active={config.predictor === "kinematic"} onClick={() => updateConfig("predictor", "kinematic")} label="Kinematic" /><ModeButton active={config.predictor === "gru"} onClick={() => updateConfig("predictor", "gru")} label="Trained GRU" /></div><p className="mt-2 text-[10px] leading-4 text-slate-500">{GRU_MODEL_INFO.architecture} · {GRU_MODEL_INFO.sequenceLength} filtered samples · offline artifact {GRU_MODEL_INFO.id}</p></div>
            <div className="mb-3 flex items-center gap-2 border-t border-white/[.07] pt-4"><Waves className="h-3.5 w-3.5 text-cyan-200" /><p className="mono text-[10px] tracking-[.13em] text-cyan-100/60">DISTURBANCE CONTROL CENTER</p></div>
            <div className="space-y-4">
              <SliderControl label="Target velocity multiplier" value={config.targetSpeed} min={0.4} max={2} step={0.05} unit="×" onChange={value => updateConfig("targetSpeed", value)} />
              <SliderControl label="Sensor noise · simulated" value={config.noise} min={0} max={1} step={0.02} unit="" onChange={value => updateConfig("noise", value)} />
              <SliderControl label="Platform vibration · simulated" value={config.vibration} min={0} max={1} step={0.02} unit="" onChange={value => updateConfig("vibration", value)} />
              <SliderControl label="Atmospheric distortion · simulated" value={config.turbulence} min={0} max={1} step={0.02} unit="" onChange={value => updateConfig("turbulence", value)} />
              <SliderControl label="System latency" value={config.latencyMs} min={0} max={420} step={5} unit="ms" onChange={value => updateConfig("latencyMs", value)} />
              <SliderControl label="Random seed" value={config.seed} min={1} max={999999} step={1} unit="" onChange={value => updateConfig("seed", Math.round(value))} />
            </div>
            <div className="mt-6 flex gap-2"><Button variant="outline" className="flex-1 border-white/10 bg-white/[.035] text-slate-200 hover:bg-white/10" onClick={() => resetScene()}><TimerReset className="mr-2 h-3.5 w-3.5" /> Apply &amp; restart</Button><Button variant="outline" className="border-white/10 bg-white/[.035] px-3 text-slate-200 hover:bg-white/10" onClick={resetDisturbances} aria-label="Reset supported disturbances"><Waves className="h-3.5 w-3.5" /></Button></div>
            <div className="mt-4 border-t border-white/[.07] pt-4"><p className="mono text-[10px] tracking-[.13em] text-amber-100/70">LIVE REFERENCE</p><div className="mt-3 grid grid-cols-2 gap-2"><Telemetry label="Target X / Y" value={target ? `${target.screenX.toFixed(2)} / ${target.screenY.toFixed(2)}` : "—"} /><Telemetry label="Target Vx / Vy" value={`${snapshot.targetVelocity.x.toFixed(2)} / ${snapshot.targetVelocity.y.toFixed(2)}`} /><Telemetry label="Yaw / pitch" value={`${snapshot.camera.pan.toFixed(1)}° / ${snapshot.camera.tilt.toFixed(1)}°`} /><Telemetry label="Frame time" value={`${snapshot.metrics.fps ? (1000 / snapshot.metrics.fps).toFixed(1) : "—"} ms`} /></div></div>
          </aside>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_318px]">
          <div className="glass-panel rounded-[1.55rem] border border-cyan-100/10 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-3"><Layers3 className="h-4 w-4 text-cyan-200" /><div><p className="mono text-[10px] tracking-[.15em] text-slate-500">SCENARIO LIBRARY</p><h2 className="mt-0.5 text-base font-bold text-slate-100">Stress the full tracking loop</h2></div></div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{PRESETS.map((preset, index) => <button key={preset.id} onClick={() => applyPreset(preset.id)} className={`group rounded-xl border p-3 text-left transition-all duration-200 ${activePreset === preset.id ? "border-cyan-200/40 bg-cyan-300/[.09]" : "border-white/[.07] bg-white/[.025] hover:border-cyan-100/20 hover:bg-white/[.055]"}`}><p className="mono text-[9px] tracking-[.12em] text-cyan-100/55">{String(index + 1).padStart(2, "0")}</p><p className="mt-1 text-xs font-bold text-slate-200">{preset.label}</p><p className="mt-1.5 text-[10px] leading-4 text-slate-500 group-hover:text-slate-400">{preset.description}</p><span className="mt-3 flex items-center text-[10px] font-semibold text-cyan-200/70">Load scenario <ChevronRight className="ml-1 h-3 w-3" /></span></button>)}</div>
          </div>
          <div className="glass-panel rounded-[1.55rem] border border-cyan-100/10 p-4 sm:p-5"><div className="flex items-center gap-3"><Gauge className="h-4 w-4 text-violet-300" /><div><p className="mono text-[10px] tracking-[.15em] text-slate-500">CAMERA COMMAND</p><h2 className="mt-0.5 text-base font-bold text-slate-100">Control telemetry</h2></div></div><div className="mt-5 grid grid-cols-2 gap-3"><Telemetry label="Pan angle" value={`${snapshot.camera.pan.toFixed(2)}°`} /><Telemetry label="Tilt angle" value={`${snapshot.camera.tilt.toFixed(2)}°`} /><Telemetry label="Detections" value={snapshot.metrics.detections.toString()} /><Telemetry label="FPS" value={snapshot.metrics.fps.toFixed(1)} /></div></div>
        </section>

        <section className="mt-5 stress-console"><div><div className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-200" /><p className="eyebrow">GUIDED STRESS TEST</p></div><h2>Configuration-driven resilience sequence</h2><p>Each phase applies a supported simulation configuration and restarts the live virtual environment. It does not fabricate a consolidated result; use the benchmark suite after the sequence for measured comparison.</p></div><div className="stress-actions"><Button className="bg-amber-300 text-slate-950 hover:bg-amber-200" onClick={() => setStressPhase(0)} disabled={stressPhase !== null && stressPhase < STRESS_PROTOCOL.length}><Zap className="mr-2 h-4 w-4" /> {stressPhase === null || stressPhase >= STRESS_PROTOCOL.length ? "Start stress test" : "Stress test running"}</Button>{stressPhase !== null ? <Button variant="outline" className="border-white/10 bg-white/[.03] text-slate-200" onClick={() => setStressPhase(null)}>Abort</Button> : null}</div><div className="stress-timeline">{STRESS_PROTOCOL.map((phase, index) => <div key={phase.label} className={index === stressPhase ? "stress-current" : index < (stressPhase ?? -1) ? "stress-complete" : ""}><span className="mono">{String(index + 1).padStart(2, "0")}</span><strong>{phase.label.replace(/^PHASE \d+ · /, "")}</strong><small>{phase.note}</small></div>)}</div>{stressPhase !== null && stressPhase >= STRESS_PROTOCOL.length ? <p className="mono mt-4 text-[10px] text-emerald-200">SEQUENCE COMPLETE · RUN COMPARISON TO GENERATE A MEASURED BENCHMARK</p> : null}</section>

        <section className="mt-5"><HardwareAdapterPanel source={cameraSource} onSourceChange={setCameraSource} onConfigChange={setHardwareConfig} onArmedChange={setAdapterArmed} /></section>

        <section id="benchmark" className="mt-5 glass-panel rounded-[1.55rem] border border-cyan-100/10 p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mono text-[10px] tracking-[.15em] text-slate-500">REPRODUCIBLE BENCHMARK</p><h2 className="mt-1 text-lg font-bold text-slate-100">Classical reactive vs. latency-aware predictive</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">Both modes execute against the exact same deterministic trajectory, disturbance profile, seed, and simulation duration. Reported values are calculated from the completed runs.</p></div><Button onClick={() => { setBenchmark(runBenchmark(config)); setPredictorBenchmark(runPredictorComparison(config)); }} className="bg-violet-300 font-semibold text-slate-950 hover:bg-violet-200"><BarChart3 className="mr-2 h-4 w-4" /> Run comparison</Button></div>
          {benchmark ? <><div className="mt-6 overflow-hidden rounded-2xl border border-white/[.08]"><div className="grid grid-cols-[minmax(130px,1.2fr)_1fr_1fr] bg-white/[.035] px-4 py-3 text-[10px] font-semibold uppercase tracking-[.12em] text-slate-500"><span>Measured metric</span><span>Classical</span><span>Predictive</span></div><BenchmarkRow label="Mean tracking error" classical={`${metricValue(benchmark.classical.meanError, 2)} px`} predictive={`${metricValue(benchmark.predictive.meanError, 2)} px`} positive={benchmarkDelta !== null && benchmarkDelta > 0}/><BenchmarkRow label="Lock retention" classical={`${metricValue(benchmark.classical.lockRetention, 1)}%`} predictive={`${metricValue(benchmark.predictive.lockRetention, 1)}%`} /><BenchmarkRow label="Acquisition time" classical={`${metricValue(benchmark.classical.acquisitionTime, 2)} s`} predictive={`${metricValue(benchmark.predictive.acquisitionTime, 2)} s`} /><BenchmarkRow label="Loss count" classical={benchmark.classical.lossCount.toString()} predictive={benchmark.predictive.lossCount.toString()} /><BenchmarkRow label="Reacquisition time" classical={`${metricValue(benchmark.classical.reacquisitionTime, 2)} s`} predictive={`${metricValue(benchmark.predictive.reacquisitionTime, 2)} s`} /><BenchmarkRow label="Measured latency" classical={`${metricValue(benchmark.classical.endToEndLatency, 0)} ms`} predictive={`${metricValue(benchmark.predictive.endToEndLatency, 0)} ms`} /></div><div className="mt-4 flex justify-end"><Button variant="outline" className="border-white/10 bg-white/[.035] text-slate-200 hover:bg-white/10" onClick={saveBenchmark} disabled={saveRun.isPending}><History className="mr-2 h-3.5 w-3.5" /> {saveRun.isPending ? "Saving…" : isAuthenticated ? "Save to experiment history" : "Sign in to save run"}</Button></div></> : <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-5 py-8 text-center"><Waves className="mx-auto h-5 w-5 text-cyan-200/50" /><p className="mt-3 text-sm font-semibold text-slate-300">No benchmark completed for this configuration</p><p className="mt-1 text-xs text-slate-500">Run the comparison to record a reproducible, side-by-side evaluation.</p></div>}
          {predictorBenchmark ? <div className="mt-4 rounded-2xl border border-cyan-200/10 bg-cyan-300/[.035] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="mono text-[10px] tracking-[.13em] text-cyan-100/60">PREDICTOR ABLATION</p><p className="mt-1 text-xs font-semibold text-slate-200">Kinematic extrapolation vs. offline trained GRU</p></div><span className={`mono rounded-full px-2.5 py-1 text-[10px] ${predictorDelta !== null && predictorDelta > 0 ? "bg-emerald-300/12 text-emerald-200" : "bg-slate-300/10 text-slate-300"}`}>{predictorDelta !== null ? `${Math.abs(predictorDelta).toFixed(2)} px ${predictorDelta > 0 ? "lower with GRU" : "difference"}` : "MEASURED"}</span></div><div className="mt-3 grid grid-cols-2 gap-3"><Telemetry label="Kinematic mean error" value={`${predictorBenchmark.kinematic.meanError.toFixed(2)} px`} /><Telemetry label="Trained GRU mean error" value={`${predictorBenchmark.trainedGru.meanError.toFixed(2)} px`} /></div></div> : null}
        </section>
        <section className="mt-5 glass-panel rounded-[1.55rem] border border-cyan-100/10 p-4 sm:p-5">
          <div className="flex items-center justify-between"><div><p className="mono text-[10px] tracking-[.15em] text-slate-500">EXPERIMENT HISTORY</p><h2 className="mt-1 text-base font-bold text-slate-100">Saved reproducible runs</h2></div><History className="h-4 w-4 text-cyan-200/60" /></div>
          {!isAuthenticated ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-white/10 bg-black/[.09] px-4 py-3"><p className="text-xs text-slate-400">Sign in to persist benchmark configurations and measured outputs for later review.</p><Button size="sm" variant="outline" className="border-white/10 bg-white/[.035] text-slate-200 hover:bg-white/10" onClick={() => startLogin()}>Sign in</Button></div> : historyQuery.isLoading ? <p className="mt-4 text-xs text-slate-500">Loading your saved runs…</p> : historyQuery.data?.length ? <div className="mt-4 overflow-hidden rounded-xl border border-white/[.07]">{historyQuery.data.map(run => <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.06] px-4 py-3 last:border-0"><div><p className="text-xs font-semibold text-slate-200">{run.label}</p><p className="mono mt-1 text-[10px] text-slate-500">SEED {run.seed} · {new Date(run.createdAt).toLocaleString()}</p></div><span className="rounded-full bg-violet-300/10 px-2.5 py-1 text-[10px] font-semibold text-violet-200">{run.trackerMode}</span></div>)}</div> : <p className="mt-4 text-xs text-slate-500">No saved runs yet. Complete and save a benchmark to begin a reproducible history.</p>}
        </section>
        <footer className="flex items-center justify-between py-7 text-[10px] text-slate-500"><span className="mono tracking-[.12em]">PHOTONLOCK / VIRTUAL PAT ENVIRONMENT</span><span className="flex items-center gap-1.5"><CircleHelp className="h-3 w-3" /> Metrics are derived from the active simulation run.</span></footer>
      </main>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: "cyan" | "emerald" | "violet" | "amber" }) {
  const colors = { cyan: "bg-cyan-300", emerald: "bg-emerald-300", violet: "bg-violet-300", amber: "bg-amber-300" };
  return <div className="rounded-xl border border-white/[.07] bg-black/[.13] px-3 py-2.5"><p className="mono flex items-center gap-1.5 text-[9px] uppercase tracking-[.11em] text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${colors[accent]}`} /> {label}</p><p className="mt-1 text-sm font-bold text-slate-100">{value}</p></div>;
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${active ? "bg-cyan-300 text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-200"}`}>{label}</button>;
}

function SliderControl({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (value: number) => void }) {
  const precision = step < 1 ? (step < 0.1 ? 2 : 1) : 0;
  return <label className="block"><span className="control-label"><span>{label}</span><span className="text-cyan-100">{value.toFixed(precision)}{unit}</span></span><input className="mt-2 h-1.5 w-full appearance-none rounded-full bg-slate-700 accent-cyan-300" type="range" value={value} min={min} max={max} step={step} onChange={event => onChange(Number(event.target.value))} /></label>;
}

function Telemetry({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/[.07] bg-black/[.11] p-3"><p className="mono text-[9px] uppercase tracking-[.1em] text-slate-500">{label}</p><p className="mt-1.5 text-sm font-bold text-slate-100">{value}</p></div>;
}

function BenchmarkRow({ label, classical, predictive, positive = false }: { label: string; classical: string; predictive: string; positive?: boolean }) {
  return <div className="grid grid-cols-[minmax(130px,1.2fr)_1fr_1fr] border-t border-white/[.06] px-4 py-3 text-xs"><span className="text-slate-400">{label}</span><span className="mono text-slate-300">{classical}</span><span className={`mono font-medium ${positive ? "text-emerald-300" : "text-cyan-200"}`}>{predictive}</span></div>;
}
