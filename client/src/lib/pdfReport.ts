import type { BenchmarkResult, PredictorComparison, SimulationConfig, SimulationSnapshot } from "@/lib/simulator";
import { GRU_MODEL_INFO } from "@/lib/sequencePredictor";

type ReportInput = {
  configuration: SimulationConfig;
  snapshot: SimulationSnapshot;
  benchmark: BenchmarkResult | null;
  predictorComparison?: PredictorComparison | null;
  projectTeam?: string;
};

const metric = (value: number | null, digits = 2) => (value === null ? "Not observed" : value.toFixed(digits));

export function buildSihReportSummary({ configuration, snapshot, benchmark, predictorComparison }: ReportInput) {
  return {
    seed: configuration.seed,
    selectedPredictor: configuration.mode === "predictive" ? configuration.predictor : "not-applicable",
    liveMeanError: snapshot.metrics.meanError,
    liveLockRetention: snapshot.metrics.lockRetention,
    model: GRU_MODEL_INFO,
    comparisonAvailable: Boolean(benchmark),
    benchmarkSeed: benchmark?.config.seed ?? null,
    predictorAblationAvailable: Boolean(predictorComparison),
  };
}

export async function downloadSihExperimentReport({ configuration, snapshot, benchmark, predictorComparison, projectTeam = "PhotonLock Research Team" }: ReportInput) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const document = new jsPDF({ unit: "mm", format: "a4" });
  const navy = [6, 20, 34] as const;
  const cyan = [34, 211, 238] as const;
  const pale = [226, 232, 240] as const;
  const created = new Date().toLocaleString();
  const summary = buildSihReportSummary({ configuration, snapshot, benchmark, predictorComparison, projectTeam });

  document.setFillColor(...navy);
  document.rect(0, 0, 210, 297, "F");
  document.setFillColor(...cyan);
  document.rect(14, 18, 3, 58, "F");
  document.setTextColor(...pale);
  document.setFont("helvetica", "bold");
  document.setFontSize(27);
  document.text("PHOTONLOCK", 23, 29);
  document.setFont("helvetica", "normal");
  document.setFontSize(10);
  document.setTextColor(165, 243, 252);
  document.text("PHYSICS-AWARE AI PREDICTIVE OPTICAL ACQUISITION & TRACKING", 23, 37);
  document.setTextColor(...pale);
  document.setFont("helvetica", "bold");
  document.setFontSize(21);
  document.text("SIH Experiment Report", 23, 57);
  document.setFont("helvetica", "normal");
  document.setFontSize(11);
  document.setTextColor(203, 213, 225);
  document.text("Virtual FSOC / PAT Simulator — Measured benchmark record", 23, 66);
  document.setTextColor(148, 163, 184);
  document.setFontSize(9);
  document.text(`Prepared by ${projectTeam}`, 23, 91);
  document.text(`Generated ${created}`, 23, 97);
  document.text(`Deterministic seed ${summary.seed}`, 23, 103);
  document.setDrawColor(71, 85, 105);
  document.line(23, 117, 187, 117);
  document.setTextColor(226, 232, 240);
  document.setFont("helvetica", "bold");
  document.setFontSize(12);
  document.text("Primary scientific hypothesis", 23, 133);
  document.setFont("helvetica", "normal");
  document.setFontSize(10);
  document.setTextColor(203, 213, 225);
  const hypothesis = "A latency-aware predictive tracking architecture can reduce tracking error and improve lock retention under target motion, visual noise, vibration, turbulence-like disturbance, and control latency relative to a purely reactive classical baseline.";
  document.text(document.splitTextToSize(hypothesis, 160), 23, 142);
  document.setTextColor(148, 163, 184);
  document.setFontSize(8);
  document.text("PHOTONLOCK · SOFTWARE-DEFINED EXPERIMENTAL LABORATORY · REPRODUCIBLE OUTPUT", 23, 276);

  document.addPage();
  document.setFillColor(248, 250, 252);
  document.rect(0, 0, 210, 297, "F");
  document.setTextColor(15, 23, 42);
  document.setFont("helvetica", "bold");
  document.setFontSize(17);
  document.text("1. Experiment configuration", 15, 20);
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.setTextColor(71, 85, 105);
  document.text("All parameters below are recorded to permit repeatable simulation and benchmark execution.", 15, 28);
  autoTable(document, {
    startY: 36,
    head: [["Condition", "Recorded value"]],
    body: [
      ["Deterministic seed", configuration.seed.toString()],
      ["Trajectory / target count", `${configuration.trajectory} / ${configuration.targetCount}`],
      ["Target speed", `${configuration.targetSpeed.toFixed(2)}×`],
      ["Visual noise / vibration / turbulence", `${configuration.noise.toFixed(2)} / ${configuration.vibration.toFixed(2)} / ${configuration.turbulence.toFixed(2)}`],
      ["End-to-end latency", `${configuration.latencyMs} ms`],
      ["Occlusion event", configuration.occlusionDuration ? `T+ ${configuration.occlusionStart.toFixed(1)} s for ${configuration.occlusionDuration.toFixed(1)} s` : "Not enabled"],
      ["Selected controller", configuration.mode],
      ["Predictor", configuration.mode === "predictive" ? configuration.predictor : "Not applicable"],
      ["Run duration", `${configuration.durationSec} s`],
    ],
    theme: "grid",
    headStyles: { fillColor: [14, 116, 144], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 3 },
  });
  const modelY = (document as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 135;
  document.setTextColor(15, 23, 42);
  document.setFont("helvetica", "bold");
  document.setFontSize(14);
  document.text("2. Predictive-model record", 15, modelY + 18);
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.setTextColor(71, 85, 105);
  const modelText = `Offline model: ${GRU_MODEL_INFO.architecture}. The deployed artifact consumes ${GRU_MODEL_INFO.sequenceLength} Kalman-filtered state samples (x, y, vx, vy) and estimates a ${GRU_MODEL_INFO.horizonSeconds.toFixed(2)} s beacon displacement. The artifact was trained with the deterministic PhotonLock trajectory curriculum; final training MSE: ${GRU_MODEL_INFO.trainingMse.toFixed(8)}. Its model identifier is ${GRU_MODEL_INFO.id}.`;
  document.text(document.splitTextToSize(modelText, 177), 15, modelY + 27);

  document.addPage();
  document.setFillColor(248, 250, 252);
  document.rect(0, 0, 210, 297, "F");
  document.setTextColor(15, 23, 42);
  document.setFont("helvetica", "bold");
  document.setFontSize(17);
  document.text("3. Measured results", 15, 20);
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.setTextColor(71, 85, 105);
  document.text("Values originate from the executed simulation, not fixed benchmark constants.", 15, 28);
  const liveRows = [
    ["Elapsed simulation time", `${snapshot.metrics.elapsed.toFixed(2)} s`],
    ["Mean tracking error / RMSE", `${snapshot.metrics.meanError.toFixed(3)} px / ${snapshot.metrics.rmse.toFixed(3)} px`],
    ["Lock retention / losses", `${snapshot.metrics.lockRetention.toFixed(2)}% / ${snapshot.metrics.lossCount}`],
    ["Acquisition / reacquisition", `${metric(snapshot.metrics.acquisitionTime)} s / ${metric(snapshot.metrics.reacquisitionTime)} s`],
    ["Measured FPS / latency", `${snapshot.metrics.fps.toFixed(2)} / ${snapshot.metrics.endToEndLatency.toFixed(2)} ms`],
    ["Prediction residual / detections", `${snapshot.metrics.predictionError.toFixed(3)} px / ${snapshot.metrics.detections}`],
  ];
  autoTable(document, { startY: 36, head: [["Live observation", "Measured value"]], body: liveRows, theme: "grid", headStyles: { fillColor: [14, 116, 144], textColor: 255 }, styles: { fontSize: 9, cellPadding: 3 } });
  if (benchmark) {
    const resultY = (document as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 110;
    document.setTextColor(15, 23, 42);
    document.setFont("helvetica", "bold");
    document.setFontSize(14);
    document.text("Reproducible controller comparison", 15, resultY + 18);
    autoTable(document, {
      startY: resultY + 25,
      head: [["Metric", "Classical reactive", `Predictive (${benchmark.config.predictor})`]],
      body: [
        ["Mean tracking error", `${benchmark.classical.meanError.toFixed(3)} px`, `${benchmark.predictive.meanError.toFixed(3)} px`],
        ["Lock retention", `${benchmark.classical.lockRetention.toFixed(2)}%`, `${benchmark.predictive.lockRetention.toFixed(2)}%`],
        ["Acquisition time", `${metric(benchmark.classical.acquisitionTime)} s`, `${metric(benchmark.predictive.acquisitionTime)} s`],
        ["Loss count", benchmark.classical.lossCount.toString(), benchmark.predictive.lossCount.toString()],
        ["Reacquisition time", `${metric(benchmark.classical.reacquisitionTime)} s`, `${metric(benchmark.predictive.reacquisitionTime)} s`],
        ["Measured latency", `${benchmark.classical.endToEndLatency.toFixed(2)} ms`, `${benchmark.predictive.endToEndLatency.toFixed(2)} ms`],
      ],
      theme: "grid",
      headStyles: { fillColor: [109, 40, 217], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
    });
  }
  if (predictorComparison) {
    const ablationY = (document as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 170;
    document.setTextColor(15, 23, 42);
    document.setFont("helvetica", "bold");
    document.setFontSize(13);
    document.text("Predictor ablation", 15, ablationY + 16);
    autoTable(document, {
      startY: ablationY + 22,
      head: [["Metric", "Kinematic extrapolation", "Offline trained GRU"]],
      body: [
        ["Mean tracking error", `${predictorComparison.kinematic.meanError.toFixed(3)} px`, `${predictorComparison.trainedGru.meanError.toFixed(3)} px`],
        ["Prediction residual", `${predictorComparison.kinematic.predictionError.toFixed(3)} px`, `${predictorComparison.trainedGru.predictionError.toFixed(3)} px`],
        ["Lock retention", `${predictorComparison.kinematic.lockRetention.toFixed(2)}%`, `${predictorComparison.trainedGru.lockRetention.toFixed(2)}%`],
      ],
      theme: "grid",
      headStyles: { fillColor: [14, 116, 144], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
    });
  }

  document.addPage();
  document.setFillColor(248, 250, 252);
  document.rect(0, 0, 210, 297, "F");
  document.setTextColor(15, 23, 42);
  document.setFont("helvetica", "bold");
  document.setFontSize(17);
  document.text("4. SIH demonstration and reproducibility notes", 15, 20);
  document.setFont("helvetica", "normal");
  document.setFontSize(10);
  document.setTextColor(71, 85, 105);
  const notes = [
    "The experiment environment implements a configurable virtual FSOC scene with a designated moving optical beacon, virtual pan/tilt camera, latency pipeline, and disturbance injection.",
    "The perception baseline models intensity thresholding, connected bright-blob selection, and weighted centroiding. A two-axis constant-velocity Kalman estimator provides filtered state and uncertainty-aware velocity inputs.",
    "The predictive mode may use either a kinematic baseline or the embedded offline GRU artifact. This report records the selected predictor and seed so the result can be rerun under identical conditions.",
    "Metrics are calculated from the run: acquisition and reacquisition time, tracking error, lock retention, loss count, FPS, inference/control latency, and prediction residual. The result should be presented as a simulation outcome, not a claim of unvalidated physical hardware accuracy.",
    "The hardware-adapter surface is safety-gated. Physical commands remain disarmed until a user configures a local bridge, accepts command limits, and intentionally arms the device interface.",
  ];
  let cursor = 37;
  notes.forEach((note, index) => {
    document.setFillColor(14, 116, 144);
    document.circle(19, cursor - 3, 2.2, "F");
    document.setTextColor(71, 85, 105);
    document.text(document.splitTextToSize(`${index + 1}. ${note}`, 165), 25, cursor);
    cursor += 31;
  });
  document.setTextColor(100, 116, 139);
  document.setFontSize(8);
  document.text("End of report · PhotonLock virtual PAT laboratory", 15, 278);
  document.save(`photonlock-sih-report-seed-${configuration.seed}.pdf`);
}
