export function asyncHandler(fn) {
  return function asyncWrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFound(req, res, next) {
  res.status(404).json({ message: 'Ресурс не найден' });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Внутренняя ошибка сервера';
  const payload = { message };
  if (err.code) payload.code = err.code;
  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
}
