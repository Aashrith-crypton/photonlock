import type { SimulationConfig, SimulationSnapshot } from "@/lib/simulator";
import { useEffect, useRef } from "react";

type Props = {
  snapshot: SimulationSnapshot;
  config: SimulationConfig;
  running: boolean;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export default function SimulationViewport({ snapshot, config, running }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const frame = canvas.parentElement?.getBoundingClientRect();
    const width = Math.max(320, frame?.width ?? 720);
    const height = Math.max(280, width * 0.59);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const point = (x: number, y: number) => ({ x: x * width, y: y * height });
    const { time } = snapshot;
    const background = ctx.createRadialGradient(width * 0.55, height * 0.45, 0, width * 0.55, height * 0.45, width * 0.7);
    background.addColorStop(0, "#10243a");
    background.addColorStop(0.52, "#07121f");
    background.addColorStop(1, "#03070f");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(99, 179, 237, 0.12)";
    ctx.lineWidth = 1;
    for (let index = 1; index < 10; index += 1) {
      const x = (index * width) / 10;
      const y = (index * height) / 8;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    for (let star = 0; star < 45; star += 1) {
      const x = ((Math.sin(star * 91.7) + 1) / 2) * width;
      const y = ((Math.cos(star * 37.9) + 1) / 2) * height;
      const alpha = 0.18 + ((Math.sin(time * 1.8 + star) + 1) / 2) * 0.25;
      ctx.fillStyle = `rgba(217, 244, 255, ${alpha})`;
      ctx.fillRect(x, y, 1.2, 1.2);
    }

    const centre = point(0.5, 0.5);
    ctx.strokeStyle = "rgba(255,255,255,0.24)";
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(centre.x - 26, centre.y);
    ctx.lineTo(centre.x + 26, centre.y);
    ctx.moveTo(centre.x, centre.y - 26);
    ctx.lineTo(centre.x, centre.y + 26);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(86, 212, 255, 0.46)";
    ctx.strokeRect(centre.x - 37, centre.y - 37, 74, 74);

    snapshot.beacons.forEach(beacon => {
      if (!beacon.visible) return;
      const visualX = beacon.screenX + config.turbulence * 0.012 * Math.sin(time * 4.2 + beacon.id);
      const visualY = beacon.screenY + config.turbulence * 0.012 * Math.cos(time * 4.8 + beacon.id);
      const { x, y } = point(visualX, visualY);
      if (x < -40 || x > width + 40 || y < -40 || y > height + 40) return;
      const primary = beacon.id === 0;
      const radius = primary ? 6.5 : 4.2;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, primary ? 29 : 16);
      glow.addColorStop(0, primary ? "rgba(255, 255, 224, 1)" : "rgba(110, 231, 255, 0.92)");
      glow.addColorStop(0.17, primary ? "rgba(251, 191, 36, .94)" : "rgba(45, 212, 191, .65)");
      glow.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, primary ? 29 : 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = primary ? "#fff7cc" : "#8ff7ff";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      if (primary) {
        ctx.strokeStyle = "rgba(251, 191, 36, .86)";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x - 15, y - 15, 30, 30);
      }
    });

    if (snapshot.filtered) {
      const { x, y } = point(snapshot.filtered.screenX, snapshot.filtered.screenY);
      ctx.strokeStyle = "rgba(94, 234, 212, 0.95)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (snapshot.prediction) {
      const { x, y } = point(snapshot.prediction.screenX, snapshot.prediction.screenY);
      ctx.strokeStyle = "rgba(192, 132, 252, 0.95)";
      ctx.lineWidth = 1.7;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 9);
      ctx.lineTo(x + 9, y + 9);
      ctx.moveTo(x + 9, y - 9);
      ctx.lineTo(x - 9, y + 9);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (config.turbulence > 0.05) {
      ctx.strokeStyle = `rgba(147, 197, 253, ${config.turbulence * 0.18})`;
      ctx.lineWidth = 1;
      for (let line = 0; line < 12; line += 1) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 16) {
          const y = line * (height / 11) + Math.sin(x / 55 + time * 2.6 + line) * config.turbulence * 8;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    ctx.fillStyle = "rgba(3, 9, 18, .78)";
    ctx.fillRect(14, 14, 181, 48);
    ctx.fillStyle = "rgba(226, 232, 240, .86)";
    ctx.font = "11px 'DM Mono', monospace";
    ctx.fillText(`VIRTUAL CAMERA // ${running ? "LIVE" : "PAUSED"}`, 25, 34);
    ctx.fillStyle = snapshot.isOccluded ? "#fda4af" : "#86efac";
    ctx.fillText(snapshot.isOccluded ? "PRIMARY BEACON OCCLUDED" : "PRIMARY BEACON DESIGNATED", 25, 51);
  }, [snapshot, config, running]);

  return (
    <div className="simulation-viewport relative overflow-hidden rounded-[1.35rem] border border-cyan-100/10 bg-[#06101b] shadow-2xl shadow-cyan-950/20">
      <canvas ref={canvasRef} aria-label="Live virtual optical beacon tracking scene" />
      <div className="pointer-events-none absolute bottom-4 left-4 flex gap-4 text-[10px] font-medium tracking-[0.13em] text-slate-300/80">
        <span className="flex items-center gap-1.5"><i className="legend-dot bg-amber-300" /> BEACON</span>
        <span className="flex items-center gap-1.5"><i className="legend-dot bg-teal-300" /> FILTER</span>
        <span className="flex items-center gap-1.5"><i className="legend-dot bg-violet-400" /> PREDICTION</span>
      </div>
    </div>
  );
}
