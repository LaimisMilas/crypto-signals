import * as tf from '@tensorflow/tfjs-node';
import { prepareData } from '../ai/data.js';
import { timeIndicator } from '../instrumentation.js';
import { aiScore } from './ai.core.js';

let model;
export async function loadModel(path) {
  if (!model) {
    model = await tf.loadLayersModel(`file://${path}`);
  }
  return model;
}

export async function predictPrice(candles, modelPath) {
  const m = await loadModel(modelPath);
  const inputArr = prepareData(candles);
  if (inputArr.length === 0) return null;
  const input = tf.tensor2d([inputArr], [1, inputArr.length]);
  const output = m.predict(input);
  const [value] = await output.data();
  tf.dispose([input, output]);
  return value;
}

export function aiScoreInstrumented({ candles, symbol, interval, strategy }) {
  return timeIndicator({ indicator: 'ai_score', symbol, interval, strategy }, aiScore, candles);
}
