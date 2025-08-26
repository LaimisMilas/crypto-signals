# Front-end Observability

## Debug mode
- Append `?debug=1` to the URL or run with `NODE_ENV=development` to force-enable widgets.

## Correlation Bar
- Call `CorrelationBar.init({ enabled: true, env: NODE_ENV });`.
- Shows last 5 events (`overlay`, `trade`, `ping`, `http`).
- Click the `req`/`trace` labels to copy identifiers for logs or trace search.

## Network Inspector
- Active only in development or with `?debug=1`.
- Toggle with `Ctrl+~` to view the last HTTP requests and copy generated cURL.

## Incident codes
- User-visible errors display a toast with an incident code (request id).
- "Copy incident code" copies the code to clipboard.
- Use the code (`reqId`) to search server logs and traces.
- Server logs include `reqId` and `traceId` fields which can be searched in Grafana or the log store to inspect the correlated trace.

## Privacy
- RUM metrics avoid any PII or user identifiers and do not include URL parameters.
