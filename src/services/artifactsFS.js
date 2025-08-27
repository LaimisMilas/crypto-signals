import fs from 'fs';
import path from 'path';
import LRU from 'lru-cache';
import crypto from 'crypto';
import { ARTIFACTS_ROOT } from '../config.js';

const metaCache = new LRU({ max: 500, ttl: 10 * 60 * 1000 });

const MIME = new Map(Object.entries({
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.zip': 'application/zip',
  '.pdf': 'application/pdf'
}));

export function mimeOf(p) {
  return MIME.get(path.extname(p).toLowerCase()) || 'application/octet-stream';
}

export function safeResolve(p) {
  const abs = path.resolve(ARTIFACTS_ROOT, p.replace(/^[/\\]+/, ''));
  if (!abs.startsWith(ARTIFACTS_ROOT)) throw new Error('unsafe path');
  return abs;
}

export function etagFromStat(abs, st) {
  const sig = `${abs}:${st.size}:${st.mtimeMs}`;
  return `"W/${crypto.createHash('sha1').update(sig).digest('base64url')}"`;
}

export function statCached(abs) {
  const hit = metaCache.get(abs);
  if (hit) return hit;
  const st = fs.statSync(abs);
  const meta = { size: st.size, mtimeMs: st.mtimeMs };
  metaCache.set(abs, meta);
  return meta;
}

export function parseRange(rangeHeader, size) {
  if (!rangeHeader || !/^bytes=/.test(rangeHeader)) return null;
  const [startStr, endStr] = rangeHeader.replace(/^bytes=/, '').split('-');
  let start = startStr ? parseInt(startStr, 10) : 0;
  let end = endStr ? parseInt(endStr, 10) : size - 1;
  if (Number.isNaN(start)) start = 0;
  if (Number.isNaN(end) || end >= size) end = size - 1;
  if (start > end) return null;
  return { start, end, length: end - start + 1 };
}

