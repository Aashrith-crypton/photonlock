import { TrainedGruPredictor, type PredictorKind, type SequencePredictor } from "./sequencePredictor";

export type TrackingMode = "classical" | "predictive";
export type TrackingState = "search" | "acquiring" | "locked" | "lost" | "reacquiring";
export type TrajectoryKind = "linear" | "accelerating" | "circular" | "uav";

export type SimulationConfig = {
  seed: number;
  mode: TrackingMode;
  trajectory: TrajectoryKind;
  durationSec: number;
  targetCount: number;
  targetSpeed: number;
  noise: number;
  vibration: number;
  turbulence: number;
  latencyMs: number;
  occlusionStart: number;
  occlusionDuration: number;
  predictor: PredictorKind;
};

export type BeaconPosition = {
  id: number;
  worldX: number;
  worldY: number;
  screenX: number;
  screenY: number;
  visible: boolean;
};

export type TrackingMetrics = {
  acquisitionTime: number | null;
  meanError: number;
  rmse: number;
  lockRetention: number;
  lossCount: number;
  reacquisitionTime: number | null;
  fps: number;
  endToEndLatency: number;
  predictionError: number;
  detections: number;
  elapsed: number;
};

export type SimulationSnapshot = {
  time: number;
  state: TrackingState;
  beacons: BeaconPosition[];
  prediction: { worldX: number; worldY: number; screenX: number; screenY: number } | null;
  filtered: { worldX: number; worldY: number; screenX: number; screenY: number } | null;
  camera: { x: number; y: number; pan: number; tilt: number; controlError: number };
  metrics: TrackingMetrics;
  confidence: number;
  targetVisible: boolean;
  isOccluded: boolean;
  history: Array<{ time: number; error: number; predictionError: number; confidence: number }>;
};

export type BenchmarkResult = {
  classical: TrackingMetrics;
  predictive: TrackingMetrics;
  generatedAt: string;
  config: SimulationConfig;
};

export type PredictorComparison = {
  kinematic: TrackingMetrics;
  trainedGru: TrackingMetrics;
  generatedAt: string;
  config: SimulationConfig;
};

export const DEFAULT_CONFIG: SimulationConfig = {
  seed: 240816,
  mode: "predictive",
  trajectory: "uav",
  durationSec: 26,
  targetCount: 1,
  targetSpeed: 1,
  noise: 0.08,
  vibration: 0.1,
  turbulence: 0.08,
  latencyMs: 85,
  occlusionStart: 11,
  occlusionDuration: 0,
  predictor: "gru",
};

export const PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  config: Partial<SimulationConfig>;
}> = [
  {
    id: "normal",
    label: "Normal tracking",
    description: "Low-noise linear motion with stable pointing.",
    config: { trajectory: "linear", targetSpeed: 0.65, noise: 0.03, vibration: 0.03, turbulence: 0.02, latencyMs: 45, targetCount: 1, occlusionDuration: 0 },
  },
  {
    id: "accelerating",
    label: "Accelerating motion",
    description: "A target steadily increases its angular velocity.",
    config: { trajectory: "accelerating", targetSpeed: 1.45, noise: 0.06, vibration: 0.08, turbulence: 0.05, latencyMs: 85, targetCount: 1, occlusionDuration: 0 },
  },
  {
    id: "vibration",
    label: "High vibration",
    description: "Platform jitter tests controller stability.",
    config: { trajectory: "uav", targetSpeed: 1.05, noise: 0.08, vibration: 0.72, turbulence: 0.08, latencyMs: 85, targetCount: 1, occlusionDuration: 0 },
  },
  {
    id: "turbulence",
    label: "Turbulence",
    description: "Beam wander and visual distortion increase uncertainty.",
    config: { trajectory: "circular", targetSpeed: 1, noise: 0.12, vibration: 0.15, turbulence: 0.76, latencyMs: 90, targetCount: 1, occlusionDuration: 0 },
  },
  {
    id: "latency",
    label: "High latency",
    description: "Delayed perception rewards latency-aware prediction.",
    config: { trajectory: "uav", targetSpeed: 1.35, noise: 0.07, vibration: 0.12, turbulence: 0.1, latencyMs: 310, targetCount: 1, occlusionDuration: 0 },
  },
  {
    id: "multiple",
    label: "Multiple targets",
    description: "Three moving beacons; the primary beacon remains designated.",
    config: { trajectory: "circular", targetSpeed: 1.05, noise: 0.08, vibration: 0.1, turbulence: 0.08, latencyMs: 75, targetCount: 3, occlusionDuration: 0 },
  },
  {
    id: "occlusion",
    label: "Forced loss",
    description: "The designated beacon disappears and must be reacquired.",
    config: { trajectory: "uav", targetSpeed: 1.1, noise: 0.08, vibration: 0.12, turbulence: 0.1, latencyMs: 105, targetCount: 1, occlusionStart: 8, occlusionDuration: 3.3 },
  },
  {
    id: "combined",
    label: "Combined disturbance",
    description: "High speed, vibration, turbulence, latency, and an occlusion event.",
    config: { trajectory: "accelerating", targetSpeed: 1.6, noise: 0.2, vibration: 0.66, turbulence: 0.68, latencyMs: 250, targetCount: 2, occlusionStart: 9, occlusionDuration: 2.6 },
  },
];

type Point = { x: number; y: number };
type Observation = { x: number; y: number; createdAt: number; confidence: number };

type KalmanAxis = { position: number; velocity: number; p00: number; p01: number; p10: number; p11: number };

/** A constant-velocity Kalman estimator updated independently for horizontal and vertical beacon coordinates. */
class Kalman2D {
  private x: KalmanAxis | null = null;
  private y: KalmanAxis | null = null;

  private predictAxis(axis: KalmanAxis, dt: number) {
    const processPosition = 0.00003;
    const processVelocity = 0.0012;
    const p00 = axis.p00 + dt * (axis.p01 + axis.p10) + dt * dt * axis.p11 + processPosition;
    const p01 = axis.p01 + dt * axis.p11;
    const p10 = axis.p10 + dt * axis.p11;
    return { ...axis, position: axis.position + axis.velocity * dt, p00, p01, p10, p11: axis.p11 + processVelocity };
  }

  private updateAxis(axis: KalmanAxis, measurement: number, measurementVariance: number) {
    const innovation = measurement - axis.position;
    const innovationVariance = axis.p00 + measurementVariance;
    const positionGain = axis.p00 / innovationVariance;
    const velocityGain = axis.p10 / innovationVariance;
    const p00 = (1 - positionGain) * axis.p00;
    const p01 = (1 - positionGain) * axis.p01;
    const p10 = axis.p10 - velocityGain * axis.p00;
    const p11 = axis.p11 - velocityGain * axis.p01;
    return { position: axis.position + positionGain * innovation, velocity: axis.velocity + velocityGain * innovation, p00, p01, p10, p11 };
  }

  update(measurement: Point, dt: number, measurementVariance: number) {
    if (!this.x || !this.y) {
      this.x = { position: measurement.x, velocity: 0, p00: 0.2, p01: 0, p10: 0, p11: 0.2 };
      this.y = { position: measurement.y, velocity: 0, p00: 0.2, p01: 0, p10: 0, p11: 0.2 };
    } else {
      this.x = this.updateAxis(this.predictAxis(this.x, dt), measurement.x, measurementVariance);
      this.y = this.updateAxis(this.predictAxis(this.y, dt), measurement.y, measurementVariance);
    }
    return { position: { x: this.x.position, y: this.y.position }, velocity: { x: this.x.velocity, y: this.y.velocity } };
  }
}

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next() {
    this.state += 0x6d2b79f5;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  gaussian() {
    const u = Math.max(this.next(), 0.000001);
    const v = Math.max(this.next(), 0.000001);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export class PhotonSimulation {
  private random: SeededRandom;
  private time = 0;
  private camera: Point = { x: 0.5, y: 0.5 };
  private filtered: Point | null = null;
  private velocity: Point = { x: 0, y: 0 };
  private kalman = new Kalman2D();
  private sequencePredictor: SequencePredictor;
  private prediction: Point | null = null;
  private state: TrackingState = "search";
  private pending: Observation[] = [];
  private detectionStreak = 0;
  private lostFrames = 0;
  private stateElapsed = 0;
  private frames = 0;
  private detections = 0;
  private lockFrames = 0;
  private activeFrames = 0;
  private lossCount = 0;
  private firstLockAt: number | null = null;
  private lossStartedAt: number | null = null;
  private reacquisition: number[] = [];
  private errors: number[] = [];
  private predictionErrors: number[] = [];
  private latencySamples: number[] = [];
  private confidence = 0;
  private history: SimulationSnapshot["history"] = [];

  constructor(private config: SimulationConfig, predictor?: SequencePredictor) {
    this.random = new SeededRandom(config.seed);
    this.sequencePredictor = predictor ?? new TrainedGruPredictor();
  }

  private trajectory(id: number, time: number): Point {
    const speed = this.config.targetSpeed;
    const offset = id * 1.77;
    if (this.config.trajectory === "linear") {
      return { x: 0.15 + ((time * 0.08 * speed + id * 0.19) % 0.7), y: 0.35 + 0.2 * Math.sin(time * 0.35 * speed + offset) };
    }
    if (this.config.trajectory === "accelerating") {
      const rate = 0.045 * speed * (1 + time / 16);
      return { x: 0.5 + 0.35 * Math.sin(time * rate * 5 + offset), y: 0.5 + 0.26 * Math.sin(time * rate * 8 + offset * 1.7) };
    }
    if (this.config.trajectory === "circular") {
      return { x: 0.5 + (0.25 + id * 0.035) * Math.cos(time * 0.42 * speed + offset), y: 0.5 + 0.21 * Math.sin(time * 0.42 * speed + offset) };
    }
    return {
      x: 0.5 + 0.28 * Math.sin(time * 0.63 * speed + offset) + 0.075 * Math.sin(time * 2.7 * speed + offset),
      y: 0.5 + 0.22 * Math.sin(time * 0.91 * speed + offset * 1.6) + 0.055 * Math.cos(time * 3.1 * speed + offset),
    };
  }

  private isOccluded() {
    return this.config.occlusionDuration > 0 && this.time >= this.config.occlusionStart && this.time <= this.config.occlusionStart + this.config.occlusionDuration;
  }

  private screenPosition(point: Point, extraJitter = true) {
    const vibrationX = extraJitter ? this.config.vibration * 0.025 * Math.sin(this.time * 19.7) : 0;
    const vibrationY = extraJitter ? this.config.vibration * 0.025 * Math.cos(this.time * 22.1) : 0;
    const turbulenceX = extraJitter ? this.config.turbulence * 0.028 * Math.sin(this.time * 4.3 + point.y * 9) : 0;
    const turbulenceY = extraJitter ? this.config.turbulence * 0.028 * Math.cos(this.time * 5.1 + point.x * 7) : 0;
    return {
      x: 0.5 + point.x - this.camera.x + vibrationX + turbulenceX,
      y: 0.5 + point.y - this.camera.y + vibrationY + turbulenceY,
    };
  }

  /** Models a classical intensity threshold, connected bright blob, and weighted centroid measurement. */
  private thresholdBlobCentroid(target: Point): Observation | null {
    const screen = this.screenPosition(target);
    const inFrame = screen.x > 0.02 && screen.x < 0.98 && screen.y > 0.02 && screen.y < 0.98;
    const signal = clamp(0.98 - this.config.noise * 0.7 - this.config.turbulence * 0.22 - this.config.vibration * 0.08, 0.25, 1);
    const detected = inFrame && !this.isOccluded() && this.random.next() < signal;
    if (!detected) return null;

    const pixelScale = 0.004;
    const threshold = 0.52;
    let totalIntensity = 0;
    let weightedX = 0;
    let weightedY = 0;
    let blobPixels = 0;
    for (let row = -3; row <= 3; row += 1) {
      for (let column = -3; column <= 3; column += 1) {
        const candidateX = target.x + column * pixelScale;
        const candidateY = target.y + row * pixelScale;
        const radiusSquared = column * column + row * row;
        const beaconIntensity = Math.exp(-radiusSquared / 4.6);
        const disturbance = this.random.gaussian() * (0.045 + this.config.noise * 0.22 + this.config.turbulence * 0.08);
        const intensity = beaconIntensity + disturbance;
        if (intensity >= threshold) {
          const weight = intensity - threshold;
          totalIntensity += weight;
          weightedX += candidateX * weight;
          weightedY += candidateY * weight;
          blobPixels += 1;
        }
      }
    }
    if (blobPixels < 3 || totalIntensity === 0) return null;
    const centroid = { x: clamp(weightedX / totalIntensity), y: clamp(weightedY / totalIntensity) };
    const confidence = clamp(signal * Math.min(1, blobPixels / 12));
    return {
      x: centroid.x,
      y: centroid.y,
      createdAt: this.time,
      confidence,
    };
  }

  private updateState(hasObservation: boolean, dt: number) {
    this.stateElapsed += dt;
    if (hasObservation) {
      this.detectionStreak += 1;
      this.lostFrames = 0;
    } else {
      this.detectionStreak = Math.max(0, this.detectionStreak - 1);
      this.lostFrames += 1;
    }

    if (this.state === "search" && this.detectionStreak >= 3) {
      this.state = "acquiring";
      this.stateElapsed = 0;
    } else if (this.state === "acquiring" && this.detectionStreak >= 7) {
      this.state = "locked";
      this.stateElapsed = 0;
      this.firstLockAt ??= this.time;
      if (this.lossStartedAt !== null) {
        this.reacquisition.push(this.time - this.lossStartedAt);
        this.lossStartedAt = null;
      }
    } else if (this.state === "acquiring" && this.lostFrames > 14) {
      this.state = "search";
      this.stateElapsed = 0;
    } else if (this.state === "locked" && this.lostFrames > 13) {
      this.state = "lost";
      this.stateElapsed = 0;
      this.lossCount += 1;
      this.lossStartedAt = this.time;
    } else if (this.state === "lost" && this.stateElapsed > 0.45) {
      this.state = "reacquiring";
      this.stateElapsed = 0;
    } else if (this.state === "reacquiring" && this.detectionStreak >= 5) {
      this.state = "locked";
      this.stateElapsed = 0;
      if (this.lossStartedAt !== null) {
        this.reacquisition.push(this.time - this.lossStartedAt);
        this.lossStartedAt = null;
      }
    } else if (this.state === "reacquiring" && this.stateElapsed > 4) {
      this.state = "search";
      this.stateElapsed = 0;
    }
  }

  private updateFilter(observation: Observation, dt: number) {
    const measurementVariance = 0.00002 + this.config.noise * 0.0008 + this.config.turbulence * 0.00035;
    const estimate = this.kalman.update({ x: observation.x, y: observation.y }, dt, measurementVariance);
    this.filtered = estimate.position;
    this.velocity = estimate.velocity;
    this.sequencePredictor.push({ x: estimate.position.x, y: estimate.position.y, vx: estimate.velocity.x, vy: estimate.velocity.y });
    const lookAhead = this.config.mode === "predictive" ? this.config.latencyMs / 1000 + 0.085 : 0;
    const modelDelta = this.config.mode === "predictive" && this.config.predictor === "gru" ? this.sequencePredictor.predictDelta(lookAhead) : null;
    this.prediction = {
      x: clamp(estimate.position.x + (modelDelta?.x ?? this.velocity.x * lookAhead)),
      y: clamp(estimate.position.y + (modelDelta?.y ?? this.velocity.y * lookAhead)),
    };
  }

  private updateCamera(dt: number) {
    let reference = this.config.mode === "predictive" ? this.prediction : this.filtered;
    if (!reference || this.state === "search" || this.state === "lost") {
      reference = {
        x: 0.5 + 0.22 * Math.sin(this.time * 0.52),
        y: 0.5 + 0.18 * Math.cos(this.time * 0.37),
      };
    }
    const gain = this.config.mode === "predictive" ? 3.3 : 2.7;
    const cameraGain = 1 - Math.exp(-gain * dt);
    this.camera.x = clamp(this.camera.x + (reference.x - this.camera.x) * cameraGain, 0.05, 0.95);
    this.camera.y = clamp(this.camera.y + (reference.y - this.camera.y) * cameraGain, 0.05, 0.95);
  }

  step(inputDt: number) {
    const dt = Math.min(Math.max(inputDt, 0.008), 0.08);
    this.time += dt;
    this.frames += 1;
    const target = this.trajectory(0, this.time);
    const observation = this.thresholdBlobCentroid(target);
    if (observation) {
      this.detections += 1;
      this.pending.push(observation);
    }

    const due = this.time - this.config.latencyMs / 1000;
    const delivered = this.pending.filter(item => item.createdAt <= due);
    this.pending = this.pending.filter(item => item.createdAt > due);
    const latest = delivered.at(-1);
    if (latest) {
      this.updateFilter(latest, dt);
      this.confidence = latest.confidence;
      this.latencySamples.push((this.time - latest.createdAt) * 1000);
    } else {
      this.confidence *= 0.992;
    }

    this.updateState(Boolean(latest), dt);
    this.updateCamera(dt);

    const controlError = distance(target, this.camera) * 100;
    if (!this.isOccluded()) {
      this.activeFrames += 1;
      this.errors.push(controlError);
      if (this.prediction) this.predictionErrors.push(distance(target, this.prediction) * 100);
    }
    if (this.state === "locked") this.lockFrames += 1;

    if (this.frames % 3 === 0) {
      this.history.push({
        time: this.time,
        error: controlError,
        predictionError: this.prediction ? distance(target, this.prediction) * 100 : 0,
        confidence: this.confidence * 100,
      });
      this.history = this.history.slice(-160);
    }
  }

  getSnapshot(): SimulationSnapshot {
    const target = this.trajectory(0, this.time);
    const beacons = Array.from({ length: this.config.targetCount }, (_, id) => {
      const point = this.trajectory(id, this.time);
      const screen = this.screenPosition(point);
      return { id, worldX: point.x, worldY: point.y, screenX: screen.x, screenY: screen.y, visible: id !== 0 || !this.isOccluded() };
    });
    const formatted = (point: Point | null) => {
      if (!point) return null;
      const screen = this.screenPosition(point, false);
      return { worldX: point.x, worldY: point.y, screenX: screen.x, screenY: screen.y };
    };
    const meanError = average(this.errors);
    const rmse = this.errors.length ? Math.sqrt(average(this.errors.map(error => error ** 2))) : 0;
    const stateIsActive = this.state === "locked" || this.state === "acquiring" || this.state === "reacquiring";
    return {
      time: this.time,
      state: this.state,
      beacons,
      prediction: formatted(this.prediction),
      filtered: formatted(this.filtered),
      camera: { x: this.camera.x, y: this.camera.y, pan: (this.camera.x - 0.5) * 18, tilt: (this.camera.y - 0.5) * -12, controlError: distance(target, this.camera) * 100 },
      metrics: {
        acquisitionTime: this.firstLockAt,
        meanError,
        rmse,
        lockRetention: this.activeFrames ? (this.lockFrames / this.activeFrames) * 100 : 0,
        lossCount: this.lossCount,
        reacquisitionTime: this.reacquisition.length ? average(this.reacquisition) : null,
        fps: this.time ? this.frames / this.time : 0,
        endToEndLatency: average(this.latencySamples),
        predictionError: average(this.predictionErrors),
        detections: this.detections,
        elapsed: this.time,
      },
      confidence: this.confidence,
      targetVisible: stateIsActive && !this.isOccluded(),
      isOccluded: this.isOccluded(),
      history: this.history,
    };
  }
}

export function runBenchmark(config: SimulationConfig): BenchmarkResult {
  const simulate = (mode: TrackingMode) => {
    const engine = new PhotonSimulation({ ...config, mode });
    const step = 1 / 30;
    const frames = Math.round(config.durationSec / step);
    for (let frame = 0; frame < frames; frame += 1) engine.step(step);
    return engine.getSnapshot().metrics;
  };
  return {
    classical: simulate("classical"),
    predictive: simulate("predictive"),
    generatedAt: new Date().toISOString(),
    config,
  };
}

export function runPredictorComparison(config: SimulationConfig): PredictorComparison {
  const simulate = (predictor: PredictorKind) => {
    const engine = new PhotonSimulation({ ...config, mode: "predictive", predictor });
    const step = 1 / 30;
    const frames = Math.round(config.durationSec / step);
    for (let frame = 0; frame < frames; frame += 1) engine.step(step);
    return engine.getSnapshot().metrics;
  };
  return { kinematic: simulate("kinematic"), trainedGru: simulate("gru"), generatedAt: new Date().toISOString(), config };
}

export function metricValue(value: number | null, digits = 1) {
  return value === null ? "—" : value.toFixed(digits);
}
