import * as tf from '@tensorflow/tfjs-node';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { predictPrice } from '../../src/signal/indicators/ai.js';

describe('AI indicator model predictions', () => {
  it('predicts closing price close to actual', async () => {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
    // set weights to output same value as input
    model.setWeights([
      tf.tensor2d([[1]]),
      tf.tensor1d([0]),
    ]);
    const dir = mkdtempSync(join(tmpdir(), 'model-'));
    await model.save(`file://${dir}`);
    const candles = [{ close: 41 }, { close: 42 }, { close: 43 }];
    const prediction = await predictPrice(candles, `${dir}/model.json`);
    expect(prediction).toBeCloseTo(43, 5);
    rmSync(dir, { recursive: true, force: true });
  });
});
