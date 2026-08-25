# PhotonLock

> **Predictive optical-beacon tracking for mobile free-space optical communication terminals.**

PhotonLock is a full-stack, deterministic **virtual pointing, acquisition, and tracking (PAT) laboratory** built by **Cortex Clash** for Smart India Hackathon review. It lets reviewers simulate a moving optical beacon, apply realistic control disturbances, compare classical and predictive tracking strategies under matched conditions, and preserve the resulting experiment evidence.

The project is intentionally transparent about scope: its reported outputs are **simulator-derived measurements**, not physical-terminal performance claims. The hardware-adapter screen provides a bounded integration boundary for a future authenticated pan/tilt bridge; it does not automatically issue physical-device commands.

## What judges can explore

| Area | What PhotonLock demonstrates |
| --- | --- |
| **Live Simulation** | Moving beacon trajectories, virtual pan/tilt camera behavior, target detection, lock state, trajectory overlays, and measured telemetry. |
| **Perception & Control** | Threshold/blob/centroid baseline, Kalman-assisted state tracking, classical reactive control, and latency-aware predictive control. |
| **Offline GRU Path** | A reproducible offline GRU artifact used in the predictive-tracking experiment path, with a kinematic fallback when a trained forecast is unavailable. |
| **Disturbances** | Target velocity, sensor noise, platform vibration, turbulence-like visual distortion, end-to-end latency, multiple targets, and forced target loss. |
| **Benchmarking** | Identical-seed controller comparisons measuring acquisition time, tracking error, lock retention, loss count, reacquisition time, FPS, and latency. |
| **Evidence** | Persisted experiment history plus JSON, CSV, and SIH-ready PDF reporting from completed virtual benchmarks. |
| **Hardware Boundary** | Virtual/hardware feed selection, stream and bridge configuration, command limits, arming gate, and emergency-stop surface. |

## SIH reviewer walkthrough

Start from the **Overview** page, then open **Simulation**. Choose **Combined disturbance** from the numbered scenario library and start the run. Observe the tracking-state strip as the scene moves through search, acquisition, lock, loss, and reacquisition.

Next, open **Performance Lab**, select **High latency** or **Combined disturbance**, and run the experiment. The page calculates a side-by-side classical-versus-predictive comparison from the deterministic simulator, followed by a kinematic-versus-offline-GRU ablation. Return to Simulation to save an authenticated run or export CSV, JSON, and an SIH PDF report. The **Experiments** page displays saved runs with their seed and recorded timestamp.

## Technology overview

PhotonLock uses a React 19 client with Tailwind CSS, an Express/tRPC server, Drizzle ORM, and a MySQL/TiDB-compatible database. The deterministic simulator runs in the client and is covered by Vitest tests. The repository also includes the **Cortex Clash SIH presentation source** under [`presentations/cortex-clash/`](presentations/cortex-clash/), including the deck XML, assets, and judge-pitch speaker notes.

## Local setup

### Prerequisites

Install **Node.js 22+** and enable Corepack so the pinned pnpm version can be used. A MySQL/TiDB-compatible `DATABASE_URL` is required for authenticated experiment-history persistence; the simulator, local UI development, and tests can still be explored without creating test database records.

### Installation

```bash
git clone https://github.com/Aashrith-crypton/photonlock.git
cd photonlock
corepack enable
pnpm install --frozen-lockfile
```

### Environment configuration

The deployed Manus environment injects authentication, database, and built-in service variables. For a local deployment, create a local environment file using values appropriate to your own OAuth and database setup. Do **not** commit secrets.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | MySQL/TiDB connection string for user and experiment-history persistence. |
| `JWT_SECRET` | Session signing secret. |
| `VITE_APP_ID` | OAuth application identifier. |
| `OAUTH_SERVER_URL` | OAuth backend base URL. |
| `VITE_OAUTH_PORTAL_URL` | OAuth portal URL used by the client. |

### Run locally

```bash
pnpm dev
```

Open the local URL emitted by the development server. The core simulator starts from the UI and does not require a physical camera.

## Validation commands

Run all quality checks before opening a pull request or presenting a new experiment feature.

```bash
# TypeScript validation
pnpm check

# Deterministic simulator, extension, and server-contract tests
pnpm test

# Production bundle
pnpm build
```

The included GitHub Actions workflow executes these same commands for every push and pull request.

## Repository structure

```text
client/                 React interface, simulator views, and reusable components
client/src/lib/         Deterministic simulation, GRU adapter, hardware boundary, PDF reporting
server/                 Express, tRPC procedures, and persistence helpers
drizzle/                Database schema and migration files
presentations/          Cortex Clash SIH deck source, visual assets, and speaker notes
.github/workflows/      Continuous integration workflow
```

## Safety and scope notes

PhotonLock is a **virtual experiment environment**. It should be used to inspect deterministic control behavior and compare implemented algorithms before field integration. A future hardware bridge must enforce authentication, transport security, calibrated mechanical limits, and emergency-stop semantics independently of this browser client.

## Team

**Cortex Clash** · Smart India Hackathon 2026

For SIH submission metadata, update the Problem Statement ID and Team ID placeholders in the title slide before final portal upload.

## License

This repository is released under the [MIT License](LICENSE).
