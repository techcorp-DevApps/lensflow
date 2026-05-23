const buckets = new Map();

const sweep = () => {
  const now = Date.now();
  for (const [k, b] of buckets.entries()) {
    if (b.reset < now) buckets.delete(k);
  }
};

export const createRateLimiter = ({ windowMs, max, keyFn, namespace = 'default' }) => {
  return (req, res, next) => {
    if (Math.random() < 0.01) sweep();
    const baseKey = keyFn(req);
    if (!baseKey) return next();
    // Namespacing prevents one endpoint's limiter from eating into another's
    // budget when they share the same per-user/per-IP key.
    const key = `${namespace}:${baseKey}`;
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || b.reset < now) {
      buckets.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    b.count += 1;
    if (b.count > max) {
      const retryAfter = Math.max(1, Math.ceil((b.reset - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too Many Requests', retry_after: retryAfter });
    }
    next();
  };
};

export const resetRateLimits = () => buckets.clear();
