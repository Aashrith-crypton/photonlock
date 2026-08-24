import { describe, expect, it } from "vitest";
import { clampHardwareCommand, validateHardwareConfig } from "./hardwareAdapter";
import { buildSihReportSummary } from "./pdfReport";
import { PHOTONLOCK_GRU_ARTIFACT, TrainedGruPredictor, type SequencePredictor } from "./sequencePredictor";
import { DEFAULT_CONFIG, PhotonSimulation, runBenchmark, runPredictorComparison } from "./simulator";

describe("trained GRU predictor adapter", () => {
  it("requires a complete filtered-state window before returning a finite forecast", () => {
    const predictor = new TrainedGruPredictor();
    for (let index = 0; index < 7; index += 1) predictor.push({ x: 0.4 + index * 0.01, y: 0.5, vx: 0.3, vy: 0 });
    expect(predictor.predictDelta(0.2)).toBeNull();

    predictor.push({ x: 0.48, y: 0.5, vx: 0.3, vy: 0 });
    const prediction = predictor.predictDelta(0.2);
    expect(prediction).not.toBeNull();
    expect(Number.isFinite(prediction?.x)).toBe(true);
    expect(Number.isFinite(prediction?.y)).toBe(true);
  });

  it("records the selected trained predictor in reproducible benchmark configuration", () => {
    const benchmark = runBenchmark({ ...DEFAULT_CONFIG, predictor: "gru", seed: 9301, durationSec: 5 });
    expect(benchmark.config.predictor).toBe("gru");
  });

  it("uses an explicit GRU-only artifact contract", () => {
    expect(PHOTONLOCK_GRU_ARTIFACT.kind).toBe("gru");
    expect(PHOTONLOCK_GRU_ARTIFACT.scope).toBe("offline-gru-only");
    expect(PHOTONLOCK_GRU_ARTIFACT.featureSchema).toEqual(["x", "y", "vx", "vy"]);
  });

  it("runs a deterministic ablation under identical seeds for kinematic and GRU modes", () => {
    const config = { ...DEFAULT_CONFIG, seed: 3024, durationSec: 5, latencyMs: 220 };
    const first = runPredictorComparison(config);
    const second = runPredictorComparison(config);
    expect(first.config).toEqual(second.config);
    expect(first.kinematic).toEqual(second.kinematic);
    expect(first.trainedGru).toEqual(second.trainedGru);
    expect(first.kinematic.meanError).toBeGreaterThan(0);
    expect(first.trainedGru.meanError).toBeGreaterThan(0);
  });
});

describe("hardware adapter safety contract", () => {
  it("rejects unsafe configuration and clamps command values to configured limits", () => {
    const config = { streamUrl: "file:///camera", commandUrl: "not a url", maxPanDegrees: 250, maxTiltDegrees: 100, maxRateDegreesPerSecond: 200 };
    expect(validateHardwareConfig(config)).toHaveLength(5);
    const safe = clampHardwareCommand({ pan: 25, tilt: -12, rate: 80 }, { streamUrl: "", commandUrl: "", maxPanDegrees: 12, maxTiltDegrees: 8, maxRateDegreesPerSecond: 10 });
    expect(safe).toEqual({ pan: 12, tilt: -8, rate: 10 });
  });
});

describe("trained-model fallback", () => {
  it("falls back to the same kinematic prediction when no trained forecast is available", () => {
    const unavailablePredictor: SequencePredictor = { push: () => undefined, ready: () => false, predictDelta: () => null };
    const config = { ...DEFAULT_CONFIG, seed: 771, durationSec: 4, latencyMs: 180, mode: "predictive" as const };
    const kinematic = new PhotonSimulation({ ...config, predictor: "kinematic" });
    const unavailableGru = new PhotonSimulation({ ...config, predictor: "gru" }, unavailablePredictor);
    for (let frame = 0; frame < 120; frame += 1) {
      kinematic.step(1 / 30);
      unavailableGru.step(1 / 30);
    }
    expect(unavailableGru.getSnapshot().metrics).toEqual(kinematic.getSnapshot().metrics);
  });
});

describe("SIH report summary", () => {
  it("binds measured simulator output and deterministic model metadata into the report payload", () => {
    const simulation = new PhotonSimulation({ ...DEFAULT_CONFIG, seed: 601, predictor: "gru" });
    for (let frame = 0; frame < 60; frame += 1) simulation.step(1 / 30);
    const summary = buildSihReportSummary({ configuration: { ...DEFAULT_CONFIG, seed: 601, predictor: "gru" }, snapshot: simulation.getSnapshot(), benchmark: null });
    expect(summary.seed).toBe(601);
    expect(summary.selectedPredictor).toBe("gru");
    expect(summary.model.id).toBe("photonlock-gru-v1");
    expect(summary.liveMeanError).toBeGreaterThanOrEqual(0);
  });
});
