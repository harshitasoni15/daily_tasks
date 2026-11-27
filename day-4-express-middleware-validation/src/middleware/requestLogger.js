function requestLogger(req, res, next) {
  const startedAt = Date.now();

  res.once('finish', () => {
    console.info(JSON.stringify({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt
    }));
  });

  next();
}

module.exports = requestLogger;

