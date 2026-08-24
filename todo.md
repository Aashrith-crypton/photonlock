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
- [x] Inspect the signed-in history flow in the live preview and the narrow mobile layout in an independent local browser capture before publication.
- [x] Formalize the offline GRU model-artifact contract and document its GRU-only inference scope.
- [x] Add predictor selection and measured comparison between kinematic and trained-sequence modes.
- [x] Generate and download a comprehensive SIH-formatted PDF experiment report from completed benchmark data.
- [x] Implement a camera/pan-tilt adapter interface with virtual and real-feed modes, connection configuration, command limits, and an emergency-stop control.
- [x] Add an integration test proving predictive tracking falls back to kinematic extrapolation when trained-model output is unavailable.
- [x] Re-run final validation and save the delivery checkpoint after closing the model-contract and fallback-test gaps.
