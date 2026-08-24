# Visual Verification Notes

Desktop review at 1440 × 1000 confirmed that the PhotonLock laboratory renders as a cohesive dark optical mission-control interface. The live virtual camera, control panel, telemetry chart, scenario library, benchmark panel, and signed-out experiment history are all visible and legible. Accent semantics are consistent: cyan denotes control and live state, amber denotes the beacon/confidence, and violet denotes prediction/comparison.

The first full-page mobile capture at 390 × 844 did not complete in the preview environment. A second viewport-level capture after restarting the local service also did not complete, while desktop capture continued to succeed. The layout has been implemented with mobile-first grids, a hidden desktop sidebar, and responsive button visibility. This is therefore recorded as a preview-capture limitation rather than a confirmed mobile layout defect; mobile use should be verified manually in the live preview before publication.

Browser verification in an authenticated browser session confirmed that the laboratory loads with the full navigation and all interactive scene controls. The live scene moved from `search` to `acquiring` while detection count, camera angles, FPS, latency, confidence, control residuals, and prediction residuals updated from the simulation. The experiment-history area rendered the authenticated empty state and was ready to list persisted runs; no benchmark was saved during verification.

An independent local Chromium capture at 390 × 844 subsequently confirmed the compact layout. The desktop sidebar collapsed away, the header retained the product mark and pause control, the virtual camera remained fully framed, metric cards resolved to two columns, and no horizontal overflow appeared in the captured viewport.

With approval, one browser benchmark was saved to the authenticated history as `Benchmark · seed 240816`. The confirmation toast appeared and the saved entry, including its seed, timestamp, and `benchmark` tag, rendered immediately in the history list. This confirms the live end-to-end save and refresh path.

The current development preview was opened after the extension work. It displayed the SIH PDF actions, kinematic and trained-GRU predictor options, explicit offline model metadata, and the safe/disarmed camera and pan-tilt adapter panel with configurable stream URL, bridge URL, pan/tilt/slew limits, arming, and emergency-stop controls. The prior published domain remains on its earlier checkpoint until the next completed delivery checkpoint is saved.

The extended deterministic benchmark was run in the development preview. It populated the classical-versus-predictive table from executed measurements and rendered the predictor-ablation panel with separate kinematic and trained-GRU mean tracking errors. The tested default case showed 9.54 px classical mean error, 5.62 px predictive mean error, and a 0.06 px kinematic-versus-GRU difference, confirming that the UI reports measured outcomes rather than a hard-coded improvement claim.

The hardware source switch was exercised without entering endpoints or arming a device. The view changed to the external-feed placeholder, identified the adapter as safe/disarmed, and preserved the configured command-limit controls. No network request or pan-tilt command was issued.

After switching to hardware mode, the upper camera panel displayed the safe/disarmed adapter badge, command-limited state, external-feed label, and an awaiting-configuration message. The currently completed benchmark remained visible in the same session, enabling the SIH report download action to consume measured benchmark and predictor-ablation results.
