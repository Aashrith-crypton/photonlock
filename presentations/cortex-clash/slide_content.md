# Cortex Clash — PhotonLock

## Cover

PhotonLock

Predictive optical-beacon tracking for mobile free-space optical communication terminals

Cortex Clash · Smart India Hackathon 2026

Problem Statement ID / Team ID: To be confirmed from the SIH portal

## Slide 1

### PhotonLock makes optical acquisition observable, predictable, and reviewable

- Mobile free-space optical links depend on keeping a narrow beacon inside a fast-moving camera’s lock zone.
- PhotonLock is a virtual pointing, acquisition, and tracking laboratory for testing this control problem before a field deployment.
- The system lets a team configure target motion, visual noise, vibration, turbulence-like distortion, latency, and target loss under a fixed random seed.
- The result is an experiment workflow that exposes **what changed, why lock was lost, and how quickly it was regained**.

## Slide 2

### A perception-to-control stack combines classical vision with latency-aware prediction

- **Classical baseline:** threshold → blob detection → centroid → continuous Kalman-assisted tracking.
- **Predictive path:** an offline GRU model forecasts target motion across the configured delay horizon and supports a stable virtual pan/tilt controller.
- **State machine:** Search → Acquiring → Locked → Target Lost → Reacquiring.
- **Hardware-ready boundary:** a safety-gated adapter separates the virtual camera from a future authenticated pan/tilt bridge.

## Slide 3

### A deterministic digital test range compresses the field-test cycle

- Recreate a run using the same seed, scenario, visual disturbances, latency, and duration.
- Compare the classical reactive controller with predictive control under exactly the same virtual trajectory.
- Demonstrate eight implemented scenarios: nominal, accelerating, high vibration, turbulence, high latency, multiple targets, forced loss, and combined disturbance.
- Guided stress testing applies supported configurations step by step; measured benchmarks are generated separately rather than invented.

## Slide 4

### The value is a faster path from algorithm idea to operational confidence

- **For field teams:** identify lock loss, recovery behavior, and camera-command residuals before connecting a physical terminal.
- **For researchers:** review reproducible tracking error, lock retention, acquisition time, loss count, reacquisition time, FPS, and latency.
- **For integrators:** preserve experiment history and export JSON, CSV, and SIH-ready PDF evidence from completed runs.
- **For the final prototype:** retain a clean transition from virtual camera to an approved, bounded hardware-control bridge.

## Slide 5

### Built for credible experimentation, not decorative simulation

- PhotonLock reports simulator-derived measurements and clearly separates them from physical-terminal validation.
- The design is informed by established laser-communication and beacon-tracking research, while the present prototype focuses on transparent, deterministic control evaluation.
- Next demonstration: run the combined-disturbance scenario, compare reactive versus predictive control, save the run, and export the evidence package.

### Research references

- NASA, *Laser Communications Relay Demonstration* and space-to-ground optical-link materials.
- MIT Lincoln Laboratory, *Communications system achieves fastest laser link from space yet*.
- Laser beacon tracking for free-space optical communication on small-satellite platforms, Semantic Scholar literature listing.
- PhotonLock virtual PAT laboratory: reproducible internal simulator benchmark outputs.
