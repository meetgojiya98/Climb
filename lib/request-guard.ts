type Bucket = {
  count: number
  resetAt: number
}

const inMemoryBuckets = new Map<string, Bucket>()

export function checkRateLimit(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now()
  const bucket = inMemoryBuckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    inMemoryBuckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    }
  }

  if (bucket.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.resetAt,
    }
  }

  bucket.count += 1
  inMemoryBuckets.set(key, bucket)

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - bucket.count),
    resetAt: bucket.resetAt,
  }
}
