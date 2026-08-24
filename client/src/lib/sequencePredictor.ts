export type PredictorKind = "kinematic" | "gru";

export type SequenceSample = { x: number; y: number; vx: number; vy: number };

export type GruModelArtifact = {
  kind: "gru";
  id: string;
  architecture: string;
  sequenceLength: number;
  horizonSeconds: number;
  trainingMse: number;
  featureCount: number;
  featureSchema: readonly ["x", "y", "vx", "vy"];
  scope: "offline-gru-only";
};

export type SequencePredictor = {
  push(sample: SequenceSample): void;
  ready(): boolean;
  predictDelta(horizonSeconds: number): { x: number; y: number } | null;
};

/**
 * The browser artifact contract intentionally supports the currently trained GRU
 * model only. LSTM artifacts require an explicit gated-cell implementation and
 * are not silently accepted as GRU-compatible weights.
 */
export const PHOTONLOCK_GRU_ARTIFACT: GruModelArtifact = {
  kind: "gru",
  id: "photonlock-gru-v1",
  architecture: "GRU(2) → Dense(2)",
  sequenceLength: 8,
  horizonSeconds: 0.22,
  trainingMse: 0.00144654,
  featureCount: 4,
  featureSchema: ["x", "y", "vx", "vy"],
  scope: "offline-gru-only",
};

export const GRU_MODEL_INFO = PHOTONLOCK_GRU_ARTIFACT;

/**
 * Compact GRU weights trained by scripts/train-gru-model.mjs on the deterministic
 * PhotonLock trajectory curriculum. Inference is implemented directly to keep the
 * browser runtime offline and dependency-light; retraining remains reproducible.
 */
const WEIGHTS = {
  kernel: [-0.76680744, 0.17286596, -0.64909053, 0.41219047, 0.13284081, 0.0840141, -1.46459711, -0.89808905, -0.47600874, -0.98830634, -0.14511544, -0.04309749, 0.66906875, 0.0251174, -0.16250387, -0.31929579, -0.50171018, -0.31284609, 0.23353997, -0.22590593, -0.36747688, -0.04603865, 1.18869388, 0.19894852],
  recurrentKernel: [1.09072411, -0.0190829, 0.19116271, 0.00408404, -0.72064596, 0.197687, 1.08825088, -0.31684536, -0.07979555, 0.52806395, 0.47215593, -0.16488566],
  bias: [-1.01160884, -0.40496564, -0.3771629, -0.21884379, -0.03005333, -0.07489058],
  outputKernel: [0.23062073, 0.33180177, -0.94532138, -0.48088816],
  outputBias: [-0.04795466, -0.02094158],
} as const;

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

function matrixVector(input: number[], matrix: readonly number[], columns: number[], offset = 0) {
  return columns.map(column => input.reduce((sum, value, row) => sum + value * matrix[row * 6 + offset + column], 0));
}

function recurrentVector(hidden: number[], matrix: readonly number[], columns: number[], offset = 0) {
  return columns.map(column => hidden.reduce((sum, value, row) => sum + value * matrix[row * 6 + offset + column], 0));
}

export class TrainedGruPredictor implements SequencePredictor {
  private samples: SequenceSample[] = [];

  constructor(private artifact: GruModelArtifact = PHOTONLOCK_GRU_ARTIFACT) {}

  push(sample: SequenceSample) {
    this.samples.push(sample);
    this.samples = this.samples.slice(-this.artifact.sequenceLength);
  }

  ready() {
    return this.samples.length === this.artifact.sequenceLength;
  }

  predictDelta(horizonSeconds: number) {
    if (!this.ready()) return null;
    let hidden = [0, 0];
    for (const sample of this.samples) {
      const input = [sample.x, sample.y, sample.vx, sample.vy];
      const update = matrixVector(input, WEIGHTS.kernel, [0, 1]).map((value, index) => sigmoid(value + recurrentVector(hidden, WEIGHTS.recurrentKernel, [0, 1])[index] + WEIGHTS.bias[index]));
      const reset = matrixVector(input, WEIGHTS.kernel, [0, 1], 2).map((value, index) => sigmoid(value + recurrentVector(hidden, WEIGHTS.recurrentKernel, [0, 1], 2)[index] + WEIGHTS.bias[index + 2]));
      const candidate = matrixVector(input, WEIGHTS.kernel, [0, 1], 4).map((value, index) => Math.tanh(value + reset[index] * recurrentVector(hidden, WEIGHTS.recurrentKernel, [0, 1], 4)[index] + WEIGHTS.bias[index + 4]));
      hidden = hidden.map((value, index) => update[index] * value + (1 - update[index]) * candidate[index]);
    }
    const scale = horizonSeconds / this.artifact.horizonSeconds;
    return {
      x: (hidden[0] * WEIGHTS.outputKernel[0] + hidden[1] * WEIGHTS.outputKernel[2] + WEIGHTS.outputBias[0]) * scale,
      y: (hidden[0] * WEIGHTS.outputKernel[1] + hidden[1] * WEIGHTS.outputKernel[3] + WEIGHTS.outputBias[1]) * scale,
    };
  }
}
