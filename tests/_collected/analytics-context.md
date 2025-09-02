# Analytics test context
Tue Sep  2 22:50:49 UTC 2025

## Files found
- HTML: client/public/analytics.html
- JS: client/public/assets/analytics.e2e-dataset.js
client/public/assets/analytics.js
- Setup: not found
- Jest config: jest.client.config.cjs
jest.config.js

## HTML selectors (id / data-testid)
12:<div id="app-nav"></div>
13:<div id="app-breadcrumbs"></div>
14:<div id="toasts"></div>
18:    <datalist id="symbols"><option value="SOLUSDT"></option></datalist>
42:  <section class="card" id="equity-card">
47:  <section class="card" id="overlays-card">
53:  <section class="card" id="jobs-card">
62:  <section class="card" id="stats-card">
67:<div id="app-footer"></div>

## HTML snippets (filters/overlays/CSV/chart/toasts)
### snippet ~ filters
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Analytics</title>
      <link rel="stylesheet" href="/assets/nav.css">
      <link rel="stylesheet" href="/assets/ui-breadcrumbs.css">
      <link rel="stylesheet" href="/assets/ui-loader.css">
      <link rel="stylesheet" href="/assets/analytics.css">
    </head>
    <body data-page="Analytics">
    <div id="app-nav"></div>
    <div id="app-breadcrumbs"></div>
    <div id="toasts"></div>
    <main class="container">
      <fieldset class="filters">
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    

### snippet ~ overlays
            <option value="15m">15m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
            <option value="1d">1d</option>
          </select>
        </label>
        <label>From <input name="from" placeholder="ms or ISO"></label>
        <label>To <input name="to" placeholder="ms or ISO"></label>
        <label>Downsampling
          <select name="ds">
            <option value="none">none</option>
            <option value="lttb" selected>lttb</option>
          </select>
        </label>
        <label>N <input name="n" type="number" value="1000"></label>
        <button type="button" data-apply>Apply</button>
        <button type="button" data-reset>Reset</button>
      </fieldset>
    
      <section class="card" id="equity-card">
        <h2>Equity (Baseline + Overlays)</h2>
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
          </select>
        </label>
        <label>From <input name="from" placeholder="ms or ISO"></label>
        <label>To <input name="to" placeholder="ms or ISO"></label>
        <label>Downsampling
          <select name="ds">
            <option value="none">none</option>
            <option value="lttb" selected>lttb</option>
          </select>
        </label>
        <label>N <input name="n" type="number" value="1000"></label>
        <button type="button" data-apply>Apply</button>
        <button type="button" data-reset>Reset</button>
      </fieldset>
    
      <section class="card" id="equity-card">
        <h2>Equity (Baseline + Overlays)</h2>
        <canvas data-equity></canvas>
      </section>
    
      <section class="card" id="overlays-card">
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
        </label>
        <label>From <input name="from" placeholder="ms or ISO"></label>
        <label>To <input name="to" placeholder="ms or ISO"></label>
        <label>Downsampling
          <select name="ds">
            <option value="none">none</option>
            <option value="lttb" selected>lttb</option>
          </select>
        </label>
        <label>N <input name="n" type="number" value="1000"></label>
        <button type="button" data-apply>Apply</button>
        <button type="button" data-reset>Reset</button>
      </fieldset>
    
      <section class="card" id="equity-card">
        <h2>Equity (Baseline + Overlays)</h2>
        <canvas data-equity></canvas>
      </section>
    
      <section class="card" id="overlays-card">
        <h2>Overlays</h2>
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
        <label>From <input name="from" placeholder="ms or ISO"></label>
        <label>To <input name="to" placeholder="ms or ISO"></label>
        <label>Downsampling
          <select name="ds">
            <option value="none">none</option>
            <option value="lttb" selected>lttb</option>
          </select>
        </label>
        <label>N <input name="n" type="number" value="1000"></label>
        <button type="button" data-apply>Apply</button>
        <button type="button" data-reset>Reset</button>
      </fieldset>
    
      <section class="card" id="equity-card">
        <h2>Equity (Baseline + Overlays)</h2>
        <canvas data-equity></canvas>
      </section>
    
      <section class="card" id="overlays-card">
        <h2>Overlays</h2>
        <div class="overlays-list" data-overlays-list></div>
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
        <label>To <input name="to" placeholder="ms or ISO"></label>
        <label>Downsampling
          <select name="ds">
            <option value="none">none</option>
            <option value="lttb" selected>lttb</option>
          </select>
        </label>
        <label>N <input name="n" type="number" value="1000"></label>
        <button type="button" data-apply>Apply</button>
        <button type="button" data-reset>Reset</button>
      </fieldset>
    
      <section class="card" id="equity-card">
        <h2>Equity (Baseline + Overlays)</h2>
        <canvas data-equity></canvas>
      </section>
    
      <section class="card" id="overlays-card">
        <h2>Overlays</h2>
        <div class="overlays-list" data-overlays-list></div>
        <a data-export-csv href="#">Export Overlays CSV</a>
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    

### snippet ~ csv
        <label>To <input name="to" placeholder="ms or ISO"></label>
        <label>Downsampling
          <select name="ds">
            <option value="none">none</option>
            <option value="lttb" selected>lttb</option>
          </select>
        </label>
        <label>N <input name="n" type="number" value="1000"></label>
        <button type="button" data-apply>Apply</button>
        <button type="button" data-reset>Reset</button>
      </fieldset>
    
      <section class="card" id="equity-card">
        <h2>Equity (Baseline + Overlays)</h2>
        <canvas data-equity></canvas>
      </section>
    
      <section class="card" id="overlays-card">
        <h2>Overlays</h2>
        <div class="overlays-list" data-overlays-list></div>
        <a data-export-csv href="#">Export Overlays CSV</a>
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    

### snippet ~ equityChart

### snippet ~ toasts
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Analytics</title>
      <link rel="stylesheet" href="/assets/nav.css">
      <link rel="stylesheet" href="/assets/ui-breadcrumbs.css">
      <link rel="stylesheet" href="/assets/ui-loader.css">
      <link rel="stylesheet" href="/assets/analytics.css">
    </head>
    <body data-page="Analytics">
    <div id="app-nav"></div>
    <div id="app-breadcrumbs"></div>
    <div id="toasts"></div>
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    

## JS exports and init
### client/public/assets/analytics.e2e-dataset.js
1:export const E2E_EQUITY = [

### client/public/assets/analytics.js
21:export function persistFilters(store = localStorage) {
25:export function loadFilters(doc = document, store = localStorage) {
40:export function composeAnalyticsQuery(p) {
51:export function normalizeEquity(list) {
57:export function overlayLabel(job) {
61:export function composeCsvUrl(ids = [], range = {}) {
70:export function initEquityChart(ctx) {
93:export function setBaseline(series) {
106:export function upsertOverlay(id, series, label) {
114:export function removeOverlay(id) {
120:export function getChart() { return state.chart; }
190:export function updateCsvLink(doc = document) {
207:export function init(doc = document) {

## Existing tests overview
### tests/client/analytics.ui.test.js
18:describe('analytics ui', () => {
19:  test('smoke', () => {
26:  test('compose query', async () => {
34:  test('normalize and overlay label', async () => {
42:  test('baseline dataset added', async () => {
59:  test('overlay add/remove and csv link', async () => {
88:  test('filters persisted and loaded from localStorage', async () => {
111:  test('legend click toggles visibility only', async () => {
140:  test('error toast on API error', async () => {

### tests/client/breadcrumbs.test.js
6:test('breadcrumbs reflect active tab and update title', () => {

### tests/client/nav.test.js
7:test('nav highlights current page and sets aria-current', () => {

### tests/client/toast.test.js
7:test('toast shows and auto-hides', () => {

### tests/client/ui-tabs.a11y.test.js
16:test('initializes first tab selected & panels hidden correctly', () => {
33:test('click changes selection, updates hash and localStorage', async () => {

### tests/unit/httpCache.test.js
3:test('ETag changes with payload', () => {
9:test('handleConditionalReq true on matching ETag', () => {

### tests/unit/overlayPerf.lttb.test.js
3:test('lttb keeps first/last and reduces points', () => {

### tests/unit/reportHtml.template.test.js
3:test('htmlPage contains Chart, Stats table and escapes title/params', () => {

## Jest config & setup
\n```package.json
     1    {
     2      "name": "crypto-signals",
     3      "version": "0.2.0",
     4      "type": "module",
     5      "engines": {
     6        "node": "20.x",
     7        "npm": ">=10"
     8      },
     9      "scripts": {
    10        "start": "node src/server.js",
    11        "dev": "node --require ./src/otel-preload.cjs src/server.js",
    12        "lint": "eslint .",
    13        "test": "cross-env TZ=UTC NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules jest --runInBand",
    14        "test:watch": "cross-env TZ=UTC NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules jest --watch",
    15        "test:cov": "cross-env TZ=UTC NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules jest --coverage",
    16        "test:client": "cross-env TZ=UTC NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules jest -c jest.client.config.cjs",
    17        "test:cov:client": "cross-env TZ=UTC NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules jest -c jest.client.config.cjs --coverage",
    18        "coverage:client": "npm run test:cov:client && node -e \"const b=require('fs').existsSync('coverage-client/coverage-summary.json')&&console.log('OK');\"",
    19        "test:observ": "node scripts/smoke-observ.js",
    20        "k6:http": "k6 run tests/k6/http-smoke.js",
    21        "build": "echo \"(optional) build step for FE bundling\"",
    22        "migrate": "node src/storage/migrate.js",
    23        "backtest": "node src/engine/backtest.js",
    24        "live": "node src/engine/live.js",
    25        "initdb": "node src/storage/db.js",
    26        "build:client": "cd client && npm install && npm run build && cd .. && mkdir -p .keep && cp -f client/public/wf.html .keep/wf.html 2>/dev/null || true && cp -f client/public/analytics.html .keep/analytics.html 2>/dev/null || true && cp -f client/public/health.html .keep/health.html 2>/dev/null || true && cp -f client/public/live.html .keep/live.html 2>/dev/null || true && rm -rf public/* && cp -r client/dist/* public/ && mkdir -p public && cp -f .keep/wf.html public/wf.html 2>/dev/null || true && cp -f .keep/analytics.html public/analytics.html 2>/dev/null || true && cp -f .keep/health.html public/health.html 2>/dev/null || true && cp -f .keep/live.html public/live.html 2>/dev/null || true && rm -rf .keep",
    27        "bt": "node scripts/run-backtest.js",
    28        "fetch:binance": "node scripts/fetch-binance.js",
    29        "opt": "node scripts/optimize.js",
    30        "signals": "node scripts/generate-signals.js",
    31        "wf": "node scripts/walkforward.js",
    32        "wf:summary": "node scripts/wf-summary.js",
    33        "artifacts:backfill": "node scripts/backfill-artifacts-size.js",
    34        "prom:check": "docker run --rm -v \"$PWD/deploy/prometheus:/etc/prometheus\" --entrypoint /bin/promtool prom/prometheus:latest check rules /etc/prometheus/alerts.yml /etc/prometheus/recording-rules.yml /etc/prometheus/alerts-burnrate.yml",
    35        "prom:check:min": "docker run --rm -v \"$PWD/deploy/prometheus:/etc/prometheus\" --entrypoint /bin/promtool prom/prometheus:latest check rules /etc/prometheus/alerts.yml",
    36        "stack:up": "docker compose -f deploy/docker-compose.observability.yml up -d prometheus alertmanager grafana",
    37        "stack:logs": "docker compose -f deploy/docker-compose.observability.yml logs -f prometheus",
    38        "prom:check:flex": "./scripts/promtool.sh",
    39        "deploy-api:build": "docker compose -f deploy/docker-compose.observability.yml build --pull --no-cache deploy-api",
    40        "deploy-api:up": "docker compose -f deploy/docker-compose.observability.yml up -d --no-deps --force-recreate deploy-api",
    41        "deploy-api:rebuild": "npm run deploy-api:build && npm run deploy-api:up",
    42        "deploy-api:logs": "docker compose -f deploy/docker-compose.observability.yml logs -f deploy-api",
    43        "e2e:install": "npx playwright install --with-deps chromium",
    44        "serve:client": "http-server client/public -p 4173 -s",
    45        "e2e": "playwright test -c playwright.config.ts",
    46        "e2e:headed": "playwright test -c playwright.config.ts --headed"
    47      },
    48      "dependencies": {
    49        "@opentelemetry/auto-instrumentations-node": "^0.62.1",
    50        "@opentelemetry/exporter-metrics-otlp-http": "^0.203.0",
    51        "@opentelemetry/exporter-trace-otlp-http": "^0.203.0",
    52        "@opentelemetry/sdk-node": "^0.203.0",
    53        "archiver": "^5.3.2",
    54        "axios": "^1.7.2",
    55        "body-parser": "^1.20.2",
    56        "cookie-parser": "^1.4.6",
    57        "cors": "^2.8.5",
    58        "csv-parse": "^5.6.0",
    59        "dotenv": "^16.4.5",
    60        "escape-html": "^1.0.3",
    61        "express": "^4.19.2",
    62        "jest-canvas-mock": "^2.5.2",
    63        "lru-cache": "^10.2.1",
    64        "node-telegram-bot-api": "^0.66.0",
    65        "pino": "^9.9.0",
    66        "pino-http": "^10.5.0",
    67        "prom-client": "^15.1.3",
    68        "stripe": "^16.6.0",
    69        "ws": "^8.18.0"
    70      },
    71      "devDependencies": {
    72        "@axe-core/playwright": "^4.8.2",
    73        "@playwright/test": "^1.44.1",
    74        "@testing-library/dom": "^9.3.1",
    75        "@testing-library/user-event": "^14.4.3",
    76        "cross-env": "^10.0.0",
    77        "eslint": "^8.56.0",
    78        "glob": "^11.0.3",
    79        "http-server": "^14.1.1",
    80        "jest": "^30.1.1",
    81        "jest-environment-jsdom": "^30.1.1",
    82        "jsdom": "^24.0.0",
    83        "pg": "^8.16.3",
    84        "supertest": "^7.1.4",
    85        "testcontainers": "^11.5.1",
    86        "whatwg-fetch": "^3.6.20"
    87      }
    88    }
```\n
\n```jest.client.config.cjs
     1    module.exports = {
     2      testEnvironment: 'jsdom',
     3      testMatch: ['<rootDir>/tests/client/**/*.test.js'],
     4      setupFiles: ['<rootDir>/tests/setup/jest.setup.dom.cjs'],
     5      moduleNameMapper: {
     6        '\\.(css|less|scss)$': '<rootDir>/tests/setup/styleStub.js',
     7      },
     8      coverageDirectory: 'coverage-client',
     9      collectCoverageFrom: [
    10        'client/public/assets/**/*.js',
    11        '!client/public/assets/vendor/**'
    12      ],
    13    };
```\n
\n```jest.config.js
     1    export default {
     2      testEnvironment: 'node',
     3      roots: ['<rootDir>/tests'],
     4      testTimeout: 15000,
     5      collectCoverageFrom: [
     6        'src/**/*.js',
     7        '!src/**/server.js',
     8        '!src/**/observability/**'
     9      ],
    10      coverageThreshold: {
    11        global: { lines: 0.7, statements: 0.7, branches: 0.5, functions: 0.6 }
    12      },
    13      setupFiles: ['<rootDir>/jest.setup.cjs'],
    14      verbose: true
    15    };
```\n
## Coverage (npm run test:client)
    jest-haste-map: duplicate manual mock found: chart.umd
      The following files share their name; please delete one of them:
        * <rootDir>/public/assets/vendor/__mocks__/chart.umd.js
        * <rootDir>/client/public/assets/vendor/__mocks__/chart.umd.js
    
    (node:6608) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
    (Use `node --trace-warnings ...` to show where the warning was created)
    PASS tests/client/breadcrumbs.test.js
    (node:6609) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
    (Use `node --trace-warnings ...` to show where the warning was created)
    PASS tests/client/nav.test.js
    (node:6607) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
    (Use `node --trace-warnings ...` to show where the warning was created)
    PASS tests/client/ui-tabs.a11y.test.js
    PASS tests/client/analytics.ui.test.js
    PASS tests/client/toast.test.js
    
    Test Suites: 5 passed, 5 total
    Tests:       13 passed, 13 total
    Snapshots:   0 total
    Time:        5.796 s
    Ran all test suites.
## coverage-summary.json
    {"total": {"lines":{"total":828,"covered":170,"skipped":0,"pct":20.53},"statements":{"total":1040,"covered":202,"skipped":0,"pct":19.42},"functions":{"total":207,"covered":42,"skipped":0,"pct":20.28},"branches":{"total":606,"covered":105,"skipped":0,"pct":17.32},"branchesTrue":{"total":0,"covered":0,"skipped":0,"pct":100}}
    ,"/workspace/crypto-signals/client/public/assets/analytics.e2e-dataset.js": {"lines":{"total":1,"covered":0,"skipped":0,"pct":0},"functions":{"total":0,"covered":0,"skipped":0,"pct":100},"statements":{"total":1,"covered":0,"skipped":0,"pct":0},"branches":{"total":0,"covered":0,"skipped":0,"pct":100}}
    ,"/workspace/crypto-signals/client/public/assets/analytics.js": {"lines":{"total":129,"covered":117,"skipped":0,"pct":90.69},"functions":{"total":34,"covered":30,"skipped":0,"pct":88.23},"statements":{"total":161,"covered":139,"skipped":0,"pct":86.33},"branches":{"total":101,"covered":59,"skipped":0,"pct":58.41}}
    ,"/workspace/crypto-signals/client/public/assets/chart-globals.js": {"lines":{"total":10,"covered":0,"skipped":0,"pct":0},"functions":{"total":3,"covered":0,"skipped":0,"pct":0},"statements":{"total":10,"covered":0,"skipped":0,"pct":0},"branches":{"total":9,"covered":0,"skipped":0,"pct":0}}
    ,"/workspace/crypto-signals/client/public/assets/nav.js": {"lines":{"total":31,"covered":10,"skipped":0,"pct":32.25},"functions":{"total":6,"covered":1,"skipped":0,"pct":16.66},"statements":{"total":38,"covered":11,"skipped":0,"pct":28.94},"branches":{"total":29,"covered":8,"skipped":0,"pct":27.58}}
    ,"/workspace/crypto-signals/client/public/assets/ui-breadcrumbs.js": {"lines":{"total":12,"covered":11,"skipped":0,"pct":91.66},"functions":{"total":2,"covered":1,"skipped":0,"pct":50},"statements":{"total":16,"covered":13,"skipped":0,"pct":81.25},"branches":{"total":18,"covered":9,"skipped":0,"pct":50}}
    ,"/workspace/crypto-signals/client/public/assets/ui-lazy.js": {"lines":{"total":31,"covered":0,"skipped":0,"pct":0},"functions":{"total":7,"covered":0,"skipped":0,"pct":0},"statements":{"total":35,"covered":0,"skipped":0,"pct":0},"branches":{"total":22,"covered":0,"skipped":0,"pct":0}}
    ,"/workspace/crypto-signals/client/public/assets/ui-loader.js": {"lines":{"total":45,"covered":0,"skipped":0,"pct":0},"functions":{"total":6,"covered":0,"skipped":0,"pct":0},"statements":{"total":59,"covered":0,"skipped":0,"pct":0},"branches":{"total":25,"covered":0,"skipped":0,"pct":0}}
    ,"/workspace/crypto-signals/client/public/assets/ui-tabs.js": {"lines":{"total":20,"covered":19,"skipped":0,"pct":95},"functions":{"total":8,"covered":7,"skipped":0,"pct":87.5},"statements":{"total":30,"covered":26,"skipped":0,"pct":86.66},"branches":{"total":37,"covered":23,"skipped":0,"pct":62.16}}
    ,"/workspace/crypto-signals/client/public/assets/ui-toast.js": {"lines":{"total":18,"covered":13,"skipped":0,"pct":72.22},"functions":{"total":5,"covered":3,"skipped":0,"pct":60},"statements":{"total":21,"covered":13,"skipped":0,"pct":61.9},"branches":{"total":18,"covered":6,"skipped":0,"pct":33.33}}
    ,"/workspace/crypto-signals/client/public/assets/modules/analytics/csv.js": {"lines":{"total":11,"covered":0,"skipped":0,"pct":0},"functions":{"total":3,"covered":0,"skipped":0,"pct":0},"statements":{"total":12,"covered":0,"skipped":0,"pct":0},"branches":{"total":0,"covered":0,"skipped":0,"pct":100}}
    ,"/workspace/crypto-signals/client/public/assets/modules/analytics/overlays.js": {"lines":{"total":278,"covered":0,"skipped":0,"pct":0},"functions":{"total":54,"covered":0,"skipped":0,"pct":0},"statements":{"total":349,"covered":0,"skipped":0,"pct":0},"branches":{"total":243,"covered":0,"skipped":0,"pct":0}}
    ,"/workspace/crypto-signals/client/public/assets/modules/analytics/overview.js": {"lines":{"total":81,"covered":0,"skipped":0,"pct":0},"functions":{"total":27,"covered":0,"skipped":0,"pct":0},"statements":{"total":109,"covered":0,"skipped":0,"pct":0},"branches":{"total":46,"covered":0,"skipped":0,"pct":0}}
    ,"/workspace/crypto-signals/client/public/assets/modules/analytics/pva.js": {"lines":{"total":9,"covered":0,"skipped":0,"pct":0},"functions":{"total":2,"covered":0,"skipped":0,"pct":0},"statements":{"total":10,"covered":0,"skipped":0,"pct":0},"branches":{"total":4,"covered":0,"skipped":0,"pct":0}}
    ,"/workspace/crypto-signals/client/public/assets/modules/analytics/trades.js": {"lines":{"total":12,"covered":0,"skipped":0,"pct":0},"functions":{"total":3,"covered":0,"skipped":0,"pct":0},"statements":{"total":13,"covered":0,"skipped":0,"pct":0},"branches":{"total":2,"covered":0,"skipped":0,"pct":0}}
    ,"/workspace/crypto-signals/client/public/assets/modules/live/equity.js": {"lines":{"total":35,"covered":0,"skipped":0,"pct":0},"functions":{"total":7,"covered":0,"skipped":0,"pct":0},"statements":{"total":40,"covered":0,"skipped":0,"pct":0},"branches":{"total":20,"covered":0,"skipped":0,"pct":0}}
    ,"/workspace/crypto-signals/client/public/assets/modules/live/history.js": {"lines":{"total":12,"covered":0,"skipped":0,"pct":0},"functions":{"total":3,"covered":0,"skipped":0,"pct":0},"statements":{"total":13,"covered":0,"skipped":0,"pct":0},"branches":{"total":2,"covered":0,"skipped":0,"pct":0}}
    ,"/workspace/crypto-signals/client/public/assets/modules/live/orders.js": {"lines":{"total":15,"covered":0,"skipped":0,"pct":0},"functions":{"total":3,"covered":0,"skipped":0,"pct":0},"statements":{"total":17,"covered":0,"skipped":0,"pct":0},"branches":{"total":8,"covered":0,"skipped":0,"pct":0}}
    ,"/workspace/crypto-signals/client/public/assets/modules/live/risk.js": {"lines":{"total":7,"covered":0,"skipped":0,"pct":0},"functions":{"total":2,"covered":0,"skipped":0,"pct":0},"statements":{"total":7,"covered":0,"skipped":0,"pct":0},"branches":{"total":0,"covered":0,"skipped":0,"pct":100}}
    ,"/workspace/crypto-signals/client/public/assets/modules/portfolio/allocation.js": {"lines":{"total":19,"covered":0,"skipped":0,"pct":0},"functions":{"total":10,"covered":0,"skipped":0,"pct":0},"statements":{"total":31,"covered":0,"skipped":0,"pct":0},"branches":{"total":6,"covered":0,"skipped":0,"pct":0}}
    ,"/workspace/crypto-signals/client/public/assets/modules/portfolio/attribution.js": {"lines":{"total":19,"covered":0,"skipped":0,"pct":0},"functions":{"total":7,"covered":0,"skipped":0,"pct":0},"statements":{"total":26,"covered":0,"skipped":0,"pct":0},"branches":{"total":4,"covered":0,"skipped":0,"pct":0}}
    ,"/workspace/crypto-signals/client/public/assets/modules/portfolio/correlation.js": {"lines":{"total":17,"covered":0,"skipped":0,"pct":0},"functions":{"total":7,"covered":0,"skipped":0,"pct":0},"statements":{"total":21,"covered":0,"skipped":0,"pct":0},"branches":{"total":10,"covered":0,"skipped":0,"pct":0}}
    ,"/workspace/crypto-signals/client/public/assets/modules/portfolio/risk.js": {"lines":{"total":16,"covered":0,"skipped":0,"pct":0},"functions":{"total":8,"covered":0,"skipped":0,"pct":0},"statements":{"total":21,"covered":0,"skipped":0,"pct":0},"branches":{"total":2,"covered":0,"skipped":0,"pct":0}}
    }
