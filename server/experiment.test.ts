import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  createExperimentRun: vi.fn(),
  listExperimentRuns: vi.fn(),
}));

vi.mock("./db", () => database);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext {
  return {
    user: {
      id: 12,
      openId: "researcher-12",
      email: "researcher@example.com",
      name: "Researcher",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("experiment router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves a reproducible run against the authenticated researcher", async () => {
    const caller = appRouter.createCaller(context());
    database.createExperimentRun.mockResolvedValue(undefined);

    await expect(
      caller.experiment.save({
        label: "Benchmark · seed 811",
        seed: 811,
        trackerMode: "benchmark",
        configuration: { latencyMs: 250, targetSpeed: 1.2 },
        results: { classical: { meanError: 8.4 }, predictive: { meanError: 5.6 } },
      }),
    ).resolves.toEqual({ success: true });

    expect(database.createExperimentRun).toHaveBeenCalledWith(expect.objectContaining({ userId: 12, seed: 811, trackerMode: "benchmark" }));
  });

  it("returns only the current researcher's experiment history", async () => {
    const caller = appRouter.createCaller(context());
    database.listExperimentRuns.mockResolvedValue([{ id: 4, userId: 12, label: "Benchmark · seed 811" }]);

    await expect(caller.experiment.list()).resolves.toEqual([{ id: 4, userId: 12, label: "Benchmark · seed 811" }]);
    expect(database.listExperimentRuns).toHaveBeenCalledWith(12);
  });
});
