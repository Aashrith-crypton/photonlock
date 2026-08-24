import * as tf from "@tensorflow/tfjs";

const sequenceLength = 8;
const horizon = 0.22;
const step = 1 / 30;
const sampleCount = 1400;

function trajectory(kind, time, speed, phase) {
  if (kind === 0) return [0.15 + ((time * 0.08 * speed + phase * 0.05) % 0.7), 0.35 + 0.2 * Math.sin(time * 0.35 * speed + phase)];
  if (kind === 1) {
    const rate = 0.045 * speed * (1 + time / 16);
    return [0.5 + 0.35 * Math.sin(time * rate * 5 + phase), 0.5 + 0.26 * Math.sin(time * rate * 8 + phase * 1.7)];
  }
  if (kind === 2) return [0.5 + 0.25 * Math.cos(time * 0.42 * speed + phase), 0.5 + 0.21 * Math.sin(time * 0.42 * speed + phase)];
  return [0.5 + 0.28 * Math.sin(time * 0.63 * speed + phase) + 0.075 * Math.sin(time * 2.7 * speed + phase), 0.5 + 0.22 * Math.sin(time * 0.91 * speed + phase * 1.6) + 0.055 * Math.cos(time * 3.1 * speed + phase)];
}

const features = [];
const labels = [];
for (let index = 0; index < sampleCount; index += 1) {
  const kind = index % 4;
  const speed = 0.55 + ((index * 37) % 130) / 100;
  const phase = ((index * 53) % 628) / 100;
  const start = ((index * 97) % 900) / 100;
  const sequence = [];
  for (let frame = 0; frame < sequenceLength; frame += 1) {
    const time = start + frame * step;
    const [x, y] = trajectory(kind, time, speed, phase);
    const [previousX, previousY] = trajectory(kind, time - step, speed, phase);
    sequence.push(x, y, (x - previousX) / step, (y - previousY) / step);
  }
  const [lastX, lastY] = trajectory(kind, start + (sequenceLength - 1) * step, speed, phase);
  const [futureX, futureY] = trajectory(kind, start + (sequenceLength - 1) * step + horizon, speed, phase);
  features.push(sequence);
  labels.push([futureX - lastX, futureY - lastY]);
}

tf.util.shuffleCombo(features, labels);
const xs = tf.tensor3d(features.flat(), [sampleCount, sequenceLength, 4]);
const ys = tf.tensor2d(labels, [sampleCount, 2]);
const model = tf.sequential();
model.add(tf.layers.gru({ units: 2, inputShape: [sequenceLength, 4], resetAfter: false, recurrentActivation: "sigmoid", activation: "tanh", kernelInitializer: tf.initializers.glorotUniform({ seed: 240816 }), recurrentInitializer: tf.initializers.orthogonal({ seed: 240817 }), biasInitializer: tf.initializers.zeros() }));
model.add(tf.layers.dense({ units: 2, kernelInitializer: tf.initializers.glorotUniform({ seed: 240818 }), biasInitializer: tf.initializers.zeros() }));
model.compile({ optimizer: tf.train.adam(0.014), loss: "meanSquaredError" });
const outcome = await model.fit(xs, ys, { epochs: 75, batchSize: 70, shuffle: false, verbose: 0 });
const weights = model.getWeights();
const names = ["kernel", "recurrentKernel", "bias", "outputKernel", "outputBias"];
const artifact = Object.fromEntries(weights.map((tensor, index) => [names[index], Array.from(tensor.dataSync()).map(value => Number(value.toFixed(8)))]));
const loss = outcome.history.loss.at(-1);
console.log(JSON.stringify({ sequenceLength, featureCount: 4, units: 2, horizonSeconds: horizon, trainingMse: Number(loss.toFixed(8)), artifact }, null, 2));
tf.dispose([xs, ys, ...weights]);
