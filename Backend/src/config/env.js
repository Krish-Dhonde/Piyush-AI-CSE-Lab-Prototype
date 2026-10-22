import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env if present
dotenv.config();

/**
 * Strict integer schema: rejects malformed numeric strings like '5000abc' or '123xyz'
 */
const strictInteger = (defaultValue, min = 1, max = Number.MAX_SAFE_INTEGER) =>
  z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return defaultValue;
      if (typeof val === 'number') {
        return Number.isInteger(val) ? String(val) : 'invalid_float';
      }
      return val;
    },
    z
      .string()
      .refine((val) => /^\d+$/.test(val.trim()), {
        message: 'Must be a valid integer containing only digits'
      })
      .transform((val) => Number(val.trim()))
      .pipe(z.number().int().min(min).max(max))
  );

const originFormatRegex = /^(https?:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?|\*)$/;

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: strictInteger('5000', 1, 65535),
  HOST: z.string().default('127.0.0.1'),
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required')
    .refine(
      (uri) => uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'),
      { message: 'MONGODB_URI must start with mongodb:// or mongodb+srv://' }
    )
    .refine(
      (uri) => {
        try {
          const parsed = new URL(uri);
          return (
            (parsed.protocol === 'mongodb:' || parsed.protocol === 'mongodb+srv:') &&
            Boolean(parsed.hostname || parsed.host)
          );
        } catch {
          return /^(mongodb(?:\+srv)?:\/\/)(?:[^:]+:[^@]+@)?[a-zA-Z0-9.-]+(?:(?::\d+)?(?:,[a-zA-Z0-9.-]+(?::\d+)?)*)(?:\/[a-zA-Z0-9_.-]*)?(?:\?.*)?$/.test(uri);
        }
      },
      { message: 'MONGODB_URI must be a valid MongoDB connection string' }
    ),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000,http://localhost:5173')
    .refine(
      (val) => {
        const origins = val.split(',').map((o) => o.trim()).filter(Boolean);
        if (origins.length === 0) return false;
        return origins.every((o) => originFormatRegex.test(o));
      },
      { message: 'CORS_ORIGIN must be a comma-separated list of valid origins (e.g. http://localhost:3000) or *' }
    ),
  RATE_LIMIT_WINDOW_MS: strictInteger('900000', 1),
  RATE_LIMIT_MAX: strictInteger('100', 1),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info')
});

/**
 * Validates provided environment object against the schema and environment-specific security rules.
 * Throws a formatted error if validation fails.
 *
 * @param {Record<string, unknown>} rawEnv
 * @returns {z.infer<typeof envSchema>}
 */
export function validateEnv(rawEnv = process.env) {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errorDetails = result.error.errors.map((err) => ({
      variable: err.path.join('.'),
      message: err.message
    }));

    const formattedMessage = errorDetails
      .map((e) => `  - ${e.variable}: ${e.message}`)
      .join('\n');

    throw new Error(
      `Environment validation failed:\n${formattedMessage}\nCheck your .env file or environment settings.`
    );
  }

  const data = result.data;

  // Environment-specific security requirements
  const additionalErrors = [];

  if (data.NODE_ENV === 'production') {
    const origins = data.CORS_ORIGIN.split(',').map((o) => o.trim());
    if (origins.includes('*')) {
      additionalErrors.push({
        variable: 'CORS_ORIGIN',
        message: 'Wildcard origin "*" is prohibited in production when credentialed requests are enabled'
      });
    }

    if (/test/i.test(data.MONGODB_URI)) {
      additionalErrors.push({
        variable: 'MONGODB_URI',
        message: 'Production MONGODB_URI must not point to a test database'
      });
    }
  }

  if (data.NODE_ENV === 'test') {
    if (!/test/i.test(data.MONGODB_URI)) {
      additionalErrors.push({
        variable: 'MONGODB_URI',
        message: 'Test environment must use a dedicated test database (URI must contain "test")'
      });
    }
  }

  if (additionalErrors.length > 0) {
    const formattedMessage = additionalErrors
      .map((e) => `  - ${e.variable}: ${e.message}`)
      .join('\n');

    throw new Error(
      `Environment validation failed:\n${formattedMessage}\nCheck your .env file or environment settings.`
    );
  }

  return data;
}

// In test environment, enforce isolated test MONGODB_URI
const defaultEnv = {
  ...process.env,
  MONGODB_URI:
    process.env.NODE_ENV === 'test'
      ? (process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/virtual_cse_lab_test')
      : (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/virtual_cse_lab')
};

export const env = validateEnv(defaultEnv);

