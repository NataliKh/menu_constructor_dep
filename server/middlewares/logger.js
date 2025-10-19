export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  const { method, originalUrl } = req;
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1e6;
    const user = (req.user && req.user.username) ? ` user=${req.user.username}` : '';
    // eslint-disable-next-line no-console
    console.log(`${method} ${originalUrl} -> ${res.statusCode} ${ms.toFixed(1)}ms${user}`);
  });
  next();
}

