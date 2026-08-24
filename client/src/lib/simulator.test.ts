import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, PhotonSimulation, runBenchmark } from "./simulator";

function execute(config = DEFAULT_CONFIG, duration = 8) {
  const engine = new PhotonSimulation(config);
  for (let frame = 0; frame < duration * 30; frame += 1) engine.step(1 / 30);
  return engine.getSnapshot();
}

describe("PhotonSimulation", () => {
  it("produces identical measured metrics from the same seed and conditions", () => {
    const config = { ...DEFAULT_CONFIG, seed: 7788, trajectory: "uav" as const, latencyMs: 180, turbulence: 0.35 };
    const first = execute(config);
    const second = execute(config);

    expect(second.metrics).toEqual(first.metrics);
    expect(second.history).toEqual(first.history);
  });

  it("detects a forced loss and transitions out of locked tracking", () => {
    const config = { ...DEFAULT_CONFIG, seed: 5592, targetSpeed: 0.7, occlusionStart: 3, occlusionDuration: 2.3, latencyMs: 40 };
    const engine = new PhotonSimulation(config);
    const states = new Set<string>();
    for (let frame = 0; frame < 9 * 30; frame += 1) {
      engine.step(1 / 30);
      states.add(engine.getSnapshot().state);
    }

    const snapshot = engine.getSnapshot();
    expect(states.has("locked")).toBe(true);
    expect(states.has("lost") || states.has("reacquiring")).toBe(true);
    expect(snapshot.metrics.lossCount).toBeGreaterThan(0);
  });

  it("returns measured benchmark values for both controllers", () => {
    const result = runBenchmark({ ...DEFAULT_CONFIG, seed: 2026, latencyMs: 300, targetSpeed: 1.35, durationSec: 12 });

    expect(result.classical.meanError).toBeGreaterThan(0);
    expect(result.predictive.meanError).toBeGreaterThan(0);
    expect(result.classical.endToEndLatency).toBeGreaterThan(0);
    expect(result.predictive.endToEndLatency).toBeGreaterThan(0);
    expect(result.config.seed).toBe(2026);
  });
});
