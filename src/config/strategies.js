import schemas from './schemas.js';
import { db } from '../storage/db.js';
import { gracefulRestart } from '../liveRunner.js';

export async function getActiveConfig() {
  const { rows } = await db.query('SELECT active FROM strategy_configs WHERE id=1');
  return rows[0]?.active || { strategies: [] };
}

function validateBySchema(strategyId, params) {
  const schema = schemas[strategyId];
  if (!schema) return [`unknown_strategy:${strategyId}`];
  const errors = [];
  const props = schema.properties || {};
  const req = schema.required || [];
  for (const r of req) {
    if (!(r in params)) errors.push(`${strategyId}.${r}.required`);
  }
  for (const [k, v] of Object.entries(params || {})) {
    const spec = props[k];
    if (!spec) {
      if (schema.additionalProperties === false) errors.push(`${strategyId}.${k}.unknown`);
      continue;
    }
    const val = v;
    if (spec.type === 'integer') {
      if (!Number.isInteger(val)) errors.push(`${strategyId}.${k}.type`);
      if (spec.minimum != null && val < spec.minimum) errors.push(`${strategyId}.${k}.min`);
      if (spec.maximum != null && val > spec.maximum) errors.push(`${strategyId}.${k}.max`);
    } else if (spec.type === 'number') {
      if (typeof val !== 'number' || Number.isNaN(val)) errors.push(`${strategyId}.${k}.type`);
      if (spec.minimum != null && val < spec.minimum) errors.push(`${strategyId}.${k}.min`);
      if (spec.maximum != null && val > spec.maximum) errors.push(`${strategyId}.${k}.max`);
    }
  }
  return errors;
}

export function validateConfig(cfg) {
  const errors = [];
  if (!cfg || !Array.isArray(cfg.strategies) || cfg.strategies.length === 0) {
    errors.push('strategies.required');
    return { ok: false, errors };
  }
  for (const [i, s] of cfg.strategies.entries()) {
    if (!s || typeof s !== 'object') {
      errors.push(`strategies[${i}].invalid`);
      continue;
    }
    if (!s.id || !schemas[s.id]) {
      errors.push(`strategies[${i}].id.unknown`);
      continue;
    }
    const paramErrs = validateBySchema(s.id, s.params || {});
    errors.push(...paramErrs.map(e => `strategies[${i}].${e}`));
    if (!Array.isArray(s.symbols) || s.symbols.length === 0 || s.symbols.some(sym => typeof sym !== 'string' || !sym)) {
      errors.push(`strategies[${i}].symbols.invalid`);
    }
    if (s.id === 'ema') {
      const fast = s.params?.fast;
      const slow = s.params?.slow;
      if (Number.isFinite(fast) && Number.isFinite(slow) && slow <= fast) {
        errors.push(`strategies[${i}].params.slow_gt_fast`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

export async function saveActiveConfig(cfg) {
  await db.query('UPDATE strategy_configs SET active=$1, updated_at=now() WHERE id=1', [cfg]);
}

export async function applyActiveConfig() {
  const cfg = await getActiveConfig();
  await gracefulRestart(cfg);
}

export { schemas };
