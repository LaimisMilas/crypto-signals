import express from 'express';
import { requestId } from './middleware/request-id.js';
import { loggerContext } from './middleware/logger-context.js';
import { errorHandler } from './middleware/error-handler.js';
import { metricsRouter, httpDuration, httpRequests } from './observability/metrics.js';
import { sseRoutes } from './routes/sse.js';
import { healthRoutes } from './routes/health.js';
import { rumRouter } from './routes/rum.js';

const app = express();

app.use(requestId);
app.use(loggerContext);
app.use(express.json());
app.use((req, res, next) => {
  const end = httpDuration.startTimer({ method: req.method, route: req.route?.path || req.path });
  res.on('finish', () => {
    httpRequests.inc({ method: req.method, route: req.route?.path || req.path, status: res.statusCode });
    end({ status: res.statusCode });
  });
  next();
});

sseRoutes(app);
healthRoutes(app);
metricsRouter(app);
app.use('/rum', rumRouter);

app.get('/api/ping', (req, res) => {
  res.json({ reqId: req.reqId, pong: true });
});

app.use(errorHandler);

export default app;
