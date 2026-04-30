import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

/**
 * Error type returned in JSON responses
 */
interface ErrorResponse {
  /** Error type/category */
  error: string;
  /** Human-readable error message */
  message: string;
  /** ISO 8601 timestamp when the error occurred */
  timestamp: string;
}

/**
 * Pattern-based error mappings for converting domain errors to HTTP status codes.
 * Each pattern is tested against the error message using case-insensitive regex matching.
 */
const ERROR_PATTERNS = [
  { pattern: /not found/i, status: 404, type: 'Not Found' },
  { pattern: /already in use|already exists|duplicate/i, status: 409, type: 'Conflict' },
  { pattern: /cannot be empty|invalid|required/i, status: 400, type: 'Bad Request' },
  { pattern: /unauthorized|not allowed|forbidden/i, status: 403, type: 'Forbidden' },
] as const;

/**
 * Maps an error message to an HTTP status code using pattern matching.
 *
 * Tests the error message against predefined patterns in order:
 * - "not found" -> 404
 * - "already in use/exists/duplicate" -> 409
 * - "cannot be empty/invalid/required" -> 400
 * - "unauthorized/not allowed/forbidden" -> 403
 * - Default -> 500
 *
 * @param message - The error message to analyze
 * @returns Object with HTTP status code and error type
 *
 * @example
 * ```typescript
 * mapErrorToStatus('User not found'); // { status: 404, type: 'Not Found' }
 * mapErrorToStatus('Email already in use'); // { status: 409, type: 'Conflict' }
 * mapErrorToStatus('Name cannot be empty'); // { status: 400, type: 'Bad Request' }
 * mapErrorToStatus('Unauthorized access'); // { status: 403, type: 'Forbidden' }
 * mapErrorToStatus('Database connection failed'); // { status: 500, type: 'Internal Server Error' }
 * ```
 */
export function mapErrorToStatus(message: string): { status: number; type: string } {
  for (const { pattern, status, type } of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return { status, type };
    }
  }
  return { status: 500, type: 'Internal Server Error' };
}

/**
 * Creates a Hono error handler for global error handling.
 *
 * Converts thrown errors into appropriate HTTP error responses with JSON format.
 *
 * Features:
 * - Pattern-based error message to HTTP status code mapping
 * - Consistent JSON error response format
 * - ISO 8601 timestamps
 * - Handles HTTPException errors with their native status codes
 *
 * @returns Hono error handler function
 *
 * @example
 * ```typescript
 * const server = new Hono();
 * server.onError(createErrorHandler());
 *
 * // Route handlers can throw plain errors
 * server.get('/users/:id', async (c) => {
 *   const user = await findUser(c.req.param('id'));
 *   if (!user) throw new Error('User not found');
 *   return c.json(user);
 * });
 * ```
 */
export function createErrorHandler() {
  return (error: Error, c: Context): Response => {
    // If it's already an HTTPException, use its status
    if (error instanceof HTTPException) {
      const errorResponse: ErrorResponse = {
        error: 'HTTP Error',
        message: error.message,
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, error.status as any);
    }

    // Map error message to status code
    const message = error.message || 'An unexpected error occurred';
    const { status, type } = mapErrorToStatus(message);

    const errorResponse: ErrorResponse = {
      error: type,
      message,
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, status as any);
  };
}
