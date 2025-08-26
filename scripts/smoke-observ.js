import http from 'node:http';
import { once } from 'node:events';

const pingRes = await fetch('http://localhost:3000/api/ping', {
  headers: { 'x-request-id': 'test-123' }
});
console.log('ping req-id', pingRes.headers.get('x-request-id'));

const sseReq = http.get('http://localhost:3000/events', {
  headers: { 'x-client-id': 'dev-1' }
});
const [sseRes] = await once(sseReq, 'response');
console.log('sse status', sseRes.statusCode);
sseReq.destroy();

const metricsRes = await fetch('http://localhost:3000/metrics');
const metrics = await metricsRes.text();
console.log('metrics', metrics.includes('http_requests_total'));
