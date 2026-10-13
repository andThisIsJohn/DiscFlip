import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VITE_ENVIRONMENT || 'production',
    tracesSampleRate: 1.0,
  });
}

export const wrapApiHandler = (handler: (req: any, res: any) => any) => {
  return async (req: any, res: any) => {
    const traceId = Math.random().toString(36).substring(7);
    const start = Date.now();

    try {
      const result = await handler(req, res);

      // Structured JSON log for success
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          path: req.url,
          method: req.method,
          traceId,
          durationMs: Date.now() - start,
          status: res.statusCode,
        })
      );

      return result;
    } catch (error: any) {
      // Structured JSON log for failure
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          path: req.url,
          method: req.method,
          traceId,
          durationMs: Date.now() - start,
          error: error.message,
          stack: error.stack,
        })
      );

      // Report to Sentry Node
      Sentry.withScope((scope) => {
        scope.setTag('traceId', traceId);
        scope.setExtra('body', req.body);
        Sentry.captureException(error);
      });

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Vault Error',
          traceId,
          message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  };
};
