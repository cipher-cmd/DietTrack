// src/utils/logger.ts
// Winston logger + robust global error/rejection handlers.
// - Pretty console logs in dev, JSON logs in prod
// - File logs when ./logs exists
// - Secret redaction + oversized payload scrubbing
// - Message-first, meta-second usage recommended: logger.info('msg', { meta })

import winston from 'winston';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

const logLevel = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

// Ensure logs dir exists (best effort)
const logsDir = path.join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  try {
    mkdirSync(logsDir, { recursive: true });
  } catch {
    /* ignore: logging still works to console */
  }
}

/** Keys we always redact (exact or case-insensitive match). */
const SECRET_KEYS = [
  'authorization',
  'x-api-key',
  'api_key',
  'apikey',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'jwt',
  'jwt_secret',
  'supabase_service_role_key',
  'supabase_key',
  'gemini_api_key',
  'openai_api_key',
  'anthropic_api_key',
];

/** Fields that often contain huge blobs; we truncate. */
const MAYBE_HUGE_FIELDS = [
  'image',
  'image_base64',
  'data',
  'payload',
  'body',
  'inlineData',
];

const MAX_STRING_LEN = 2000; // truncate very long strings in logs

function isPlainObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function truncateString(s: string) {
  if (s.length <= MAX_STRING_LEN) return s;
  return s.slice(0, MAX_STRING_LEN) + `… [${s.length - MAX_STRING_LEN} more]`;
}

/** Replace data URLs to avoid logging base64 images. */
function scrubDataUrl(s: string) {
  if (/^data:image\/[\w+.-]+;base64,/i.test(s))
    return '[image-data-url omitted]';
  if (/^data:application\/octet-stream;base64,/i.test(s))
    return '[binary-data-url omitted]';
  return s;
}

/** Deeply clone + redact + truncate. Avoid cycles. */
function scrubObject<T = any>(input: T, seen = new WeakSet()): T {
  if (input == null) return input;
  if (typeof input === 'string')
    return scrubDataUrl(truncateString(input)) as any;
  if (typeof input !== 'object') return input;

  if (seen.has(input as any)) return '[circular]' as any;
  seen.add(input as any);

  if (Array.isArray(input)) {
    return input.map((v) => scrubObject(v, seen)) as any;
  }
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(input as Record<string, any>)) {
    const lower = k.toLowerCase();

    // redact known secret keys
    if (SECRET_KEYS.includes(lower)) {
      out[k] = '***redacted***';
      continue;
    }

    // aggressively scrub large/known-blob fields
    if (MAYBE_HUGE_FIELDS.includes(lower)) {
      if (typeof v === 'string') {
        out[k] = scrubDataUrl(truncateString(v));
      } else if (Buffer.isBuffer(v)) {
        out[k] = `[buffer ${v.length} bytes]`;
      } else if (isPlainObject(v)) {
        const keys = Object.keys(v);
        out[k] =
          `{${keys.slice(0, 10).join(', ')}${keys.length > 10 ? ', …' : ''}}`;
      } else {
        out[k] = '[omitted-large-field]';
      }
      continue;
    }

    // recurse for plain objects / arrays
    out[k] = scrubObject(v, seen);
  }
  return out as T;
}

/** Redact environment when logging env blocks. */
export function redactEnv(env: Record<string, any>) {
  const copy: Record<string, any> = {};
  for (const k of Object.keys(env || {})) {
    if (SECRET_KEYS.includes(k.toLowerCase())) {
      copy[k] = '***redacted***';
    } else {
      copy[k] = env[k];
    }
  }
  return copy;
}

/** Winston format that scrubs info object fields before output. */
const scrubFormat = winston.format((info) => {
  // Winston passes info as a mutable object; scrub shallow + meta-like fields.
  const clone: any = { ...info };

  // Common places for big/meta payloads
  const META_KEYS = [
    'meta',
    'payload',
    'data',
    'body',
    'error',
    'err',
    'request',
    'response',
  ];
  for (const k of META_KEYS) {
    if (clone[k] !== undefined) clone[k] = scrubObject(clone[k]);
  }

  // Also scrub the whole thing to catch stray properties
  return scrubObject(clone);
});

// Build transports
const transports: winston.transport[] = [];

// File transports only if dir exists
if (existsSync(logsDir)) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      handleExceptions: true,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      handleExceptions: true,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
}

// Always have a console transport
transports.push(
  new winston.transports.Console({
    handleExceptions: true,
    format: !isProd
      ? // Dev: colorized, human-friendly
        winston.format.combine(
          scrubFormat(),
          winston.format.colorize(),
          winston.format.printf((info) => {
            const { level, message, ...meta } = info as any;
            const rest = Object.keys(meta).length
              ? ` ${JSON.stringify(meta)}`
              : '';
            return `[${level}] ${message}${rest}`;
          })
        )
      : // Prod: structured JSON
        winston.format.combine(
          scrubFormat(),
          winston.format.timestamp(),
          winston.format.json()
        ),
  })
);

// Create the logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    scrubFormat(), // final safety
    winston.format.json()
  ),
  defaultMeta: { service: 'diettrack-backend', env: NODE_ENV },
  transports,
  exitOnError: false, // don't crash on handled errors
});

// ---------- Global guards for visibility ----------
process.on('unhandledRejection', (reason: unknown) => {
  if (reason instanceof Error) {
    logger.error(`UNHANDLED_REJECTION: ${reason.message}`, {
      stack: reason.stack,
      name: reason.name,
    });
  } else {
    logger.error('UNHANDLED_REJECTION (non-error)', {
      reason: scrubObject(reason),
    });
  }
});

process.on('uncaughtException', (error: Error) => {
  logger.error(`UNCAUGHT_EXCEPTION: ${error.message}`, {
    stack: error.stack,
    name: error.name,
  });
  // Consider fail-fast in prod:
  // process.exit(1);
});

export default logger;
