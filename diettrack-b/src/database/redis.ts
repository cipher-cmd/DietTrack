// src/database/redis.ts
// Centralized cache helper with CACHE_ENABLED flag support.
// - If CACHE_ENABLED=false  → cacheGet returns null; cacheSet/cacheDel do nothing.
// - If CACHE_ENABLED=true and REDIS_URL is set → use Redis.
// - If CACHE_ENABLED=true and REDIS_URL is missing → use in-memory fallback.

import Redis from 'ioredis';
import logger from '@/utils/logger';

type MemEntry = { value: any; expiresAt?: number };
const memStore = new Map<string, MemEntry>();

let redisClient: Redis | null = null;
let redisHealthy = false;

/** Parse env boolean */
function asBool(v: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test(String(v || ''));
}

/** Is caching enabled at all? */
function isCachingEnabled(): boolean {
  return asBool(process.env.CACHE_ENABLED) || !!process.env.REDIS_URL;
}

/** Create or reuse a Redis client if REDIS_URL is present. */
function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (redisClient) return redisClient;

  try {
    redisClient = new Redis(process.env.REDIS_URL);
    redisClient.on('connect', () => {
      redisHealthy = true;
      logger.info('Redis connected');
    });
    redisClient.on('error', (err) => {
      redisHealthy = false;
      logger.warn('Redis error', { err });
    });
    redisClient.on('end', () => {
      redisHealthy = false;
      logger.warn('Redis connection closed');
    });
  } catch (err) {
    redisHealthy = false;
    logger.warn('Redis init failed; falling back to memory cache', { err });
    redisClient = null;
  }
  return redisClient;
}

/** Memory cache helpers (used when enabled but no REDIS_URL) */
function memGet<T = any>(key: string): T | null {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt <= now) {
    memStore.delete(key);
    return null;
  }
  return entry.value as T;
}
function memSet<T = any>(key: string, value: T, ttlSec?: number) {
  const expiresAt = ttlSec ? Date.now() + ttlSec * 1000 : undefined;
  memStore.set(key, { value, expiresAt });
}
function memDel(key: string) {
  memStore.delete(key);
}

/** Public API – safe in all modes */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  if (!isCachingEnabled()) return null;

  const client = getRedisClient();
  if (!client || !redisHealthy) {
    // Memory fallback
    return memGet<T>(key);
  }

  try {
    const raw = await client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    logger.warn('Cache GET error', { err, key });
    return null;
  }
}

export async function cacheSet<T = any>(
  key: string,
  value: T,
  ttlSec?: number
): Promise<void> {
  if (!isCachingEnabled()) return;

  const client = getRedisClient();
  if (!client || !redisHealthy) {
    memSet(key, value, ttlSec);
    return;
  }

  try {
    const payload = JSON.stringify(value);
    if (ttlSec && ttlSec > 0) {
      await client.set(key, payload, 'EX', ttlSec);
    } else {
      await client.set(key, payload);
    }
  } catch (err) {
    logger.warn('Cache SET error', { err, key });
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!isCachingEnabled()) return;

  const client = getRedisClient();
  if (!client || !redisHealthy) {
    memDel(key);
    return;
  }
  try {
    await client.del(key);
  } catch (err) {
    logger.warn('Cache DEL error', { err, key });
  }
}

/** Optional: clear all memory entries (dev only) */
export function cacheFlushMemory(): void {
  memStore.clear();
}

/** Optional: health/ping for diagnostics */
export async function cachePing(): Promise<string> {
  if (!isCachingEnabled()) return 'DISABLED';
  const client = getRedisClient();
  if (!client || !redisHealthy) return 'MEMORY';
  try {
    return await client.ping();
  } catch (err) {
    logger.warn('Cache PING error', { err });
    return 'ERROR';
  }
}

/** Optional: graceful shutdown */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (err) {
      logger.warn('Redis quit error', { err });
    } finally {
      redisClient = null;
      redisHealthy = false;
    }
  }
}
