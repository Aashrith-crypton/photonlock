# Project TODO

- [x] Define shared simulation types for configuration, tracking states, telemetry, metrics, presets, and experiment reports.
- [x] Add persisted experiment-run schema, database helpers, and typed procedures for run history and report export.
- [x] Implement a deterministic seeded virtual FSOC scene with moving beacon trajectories, pan/tilt camera dynamics, disturbance injection, occlusion, and latency.
- [x] Implement measured classical threshold/blob/centroid perception, Kalman-assisted tracking, control loop, and search/acquire/lock/loss/reacquire state transitions.
- [x] Implement measured latency-aware predictive tracking alongside the classical reactive baseline.
- [x] Build an elegant responsive simulation laboratory with live camera view, overlays, interactive controls, presets, telemetry, and real-time charts.
- [x] Build reproducible benchmark execution, side-by-side comparison, experiment history, and CSV/JSON export.
- [x] Add unit tests for deterministic simulation, state transitions, metrics, and experiment persistence.
- [x] Verify the desktop layout, run type checks, tests, and production build, and create the delivery checkpoint.
- [x] Replace smoothing with an explicit threshold/blob/centroid perception stage and a true Kalman state estimator.
- [x] Add CSV export and verify authenticated experiment-history save/list contracts.
- [ ] Manually inspect the signed-in history flow and narrow mobile layout in the live preview before publication.
