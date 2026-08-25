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

Productization visual audit: the first multi-route capture showed that a stylesheet utility-composition issue left the new overview, performance, and technical routes mostly unstyled. The offending composed utility rules were corrected. The second capture confirmed an aerospace mission-control overview with a procedural beacon/camera optical-path visual, a structured deterministic performance-lab empty state, and a panelized technical signal-path brief. The live simulation route retained its measured simulation, benchmark, export, and safety-gated hardware-adapter workflows.

The refined simulation capture confirmed real solid/dashed target and prediction trajectory traces, lock-zone framing, a prediction-horizon indicator, an aerospace telemetry strip, the state-machine console, labeled disturbance controls, live target/camera values, and the configuration-driven stress sequence. A subsequent direct browser navigation reached an expired temporary preview and displayed the sandbox wake-up screen; screenshot-based preview verification remained available.

The temporary preview subsequently resumed. Browser inspection confirmed the new state label/detail, trajectory legend, measured target velocity and camera values, labeled simulated disturbance controls, implemented scenario library, guided stress-test phases, safety-gated hardware adapter, and benchmark empty state were all rendered as active product controls rather than static placeholders.

After the scene advanced, the browser showed the actual `ACQUIRING` state with corresponding explanatory text, nonzero centroid detections, measured latency, confidence, target velocity, yaw/pitch, and frame time. The target, camera, and state-machine readouts therefore update from the active simulator rather than a static design layer.

The guided stress sequence was launched in the browser. The interface changed to `Stress test running`, exposed an abort control, highlighted the nominal first phase, and applied its low-noise configuration to the active simulator (including target-speed multiplier 0.65 and system latency 45 ms). This confirms the sequence changes real supported configuration values instead of presenting decorative phases.

The dedicated Performance Lab was also exercised with the implemented high-latency scenario. Its empty state was replaced by an executed controller comparison and predictor ablation: 18.71 px versus 13.87 px tracking RMSE for classical versus predictive control, and 13.43 px versus 12.91 px kinematic versus trained-GRU mean error. The page also retained its explicit simulator-artifact caveat.

The managed tablet capture failed twice despite a server restart, so an independent 768 × 1024 local Chromium capture was inspected. It retained the horizontal mobile navigation, fully framed simulation viewport, six measured telemetry readouts, state-machine strip, and beginning of the telemetry chart without visible horizontal overflow.

The final productization capture verified the dedicated Experiments archive, which displayed the saved authenticated benchmark with its label, seed, mode, and timestamp. The updated simulation route also displayed professionally numbered scenario cards while preserving the actual preset labels and descriptions.
