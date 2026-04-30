import type { Context, Handler } from 'hono';
import type { EventFlowsApp } from '@eventflows/core';

/**
 * Options for configuring a query handler.
 *
 * @template TInput - The input type for the query
 * @template TResult - The result type returned by the query
 */
export interface QueryHandlerOptions<TInput = any, TResult = any> {
  /**
   * Maps the Hono context to the query input payload.
   * This function extracts data from the request (headers, params, query string)
   * and transforms it into the expected query input format.
   *
   * @param c - The Hono context
   * @returns The query input payload or a promise resolving to it
   *
   * @example
   * ```typescript
   * mapRequest: (c) => ({
   *   userId: c.req.param('userId'),
   *   includeDetails: c.req.query('details') === 'true'
   * })
   * ```
   */
  mapRequest: (c: Context) => TInput | Promise<TInput>;

  /**
   * Optional function to transform the query result before returning it as JSON.
   * Use this to customize the response shape or add metadata.
   *
   * @param result - The result returned by the query handler
   * @returns The transformed response
   *
   * @example
   * ```typescript
   * mapResponse: (result) => ({
   *   data: result,
   *   timestamp: new Date().toISOString()
   * })
   * ```
   */
  mapResponse?: (result: TResult) => any;

  /**
   * Optional HTTP status code to return on success.
   * If not specified, defaults to 200 (OK).
   *
   * @default 200
   *
   * @example
   * ```typescript
   * status: 206 // Return 206 Partial Content
   * ```
   */
  status?: number;
}

/**
 * Creates a type-safe Hono handler for a query with custom request/response mapping.
 *
 * This helper provides full control over how the HTTP request is mapped to the query input
 * and how the query result is transformed into the HTTP response. It's useful when you need
 * custom logic beyond what the automatic route generation provides.
 *
 * Features:
 * - Full TypeScript inference for query names, input types, and result types
 * - Custom request mapping (extract data from headers, params, query string)
 * - Optional response transformation
 * - Optional custom status code
 * - Automatic error propagation to Hono's error handler
 *
 * @template TModuleName - The module name (inferred from second argument)
 * @template TQueryName - The query name (inferred from third argument)
 *
 * @param app - The EventFlows application instance
 * @param moduleName - The name of the module containing the query
 * @param queryName - The name of the query handler
 * @param options - Configuration options for request/response mapping
 * @returns A Hono handler function
 *
 * @example
 * ```typescript
 * // Basic usage with request mapping
 * const handler = queryHandler(app, 'users', 'GetUser', {
 *   mapRequest: (c) => ({
 *     userId: c.req.param('userId')
 *   })
 * });
 *
 * server.get('/users/:userId', handler);
 * ```
 *
 * @example
 * ```typescript
 * // With response transformation and custom status
 * const handler = queryHandler(app, 'users', 'GetUser', {
 *   mapRequest: (c) => ({
 *     userId: c.req.param('userId')
 *   }),
 *   mapResponse: (result) => ({
 *     user: result,
 *     retrieved: true,
 *     timestamp: new Date().toISOString()
 *   }),
 *   status: 200
 * });
 *
 * server.get('/users/:userId', handler);
 * ```
 *
 * @example
 * ```typescript
 * // Extracting query string parameters
 * const handler = queryHandler(app, 'users', 'ListUsers', {
 *   mapRequest: (c) => ({
 *     page: parseInt(c.req.query('page') || '1'),
 *     limit: parseInt(c.req.query('limit') || '10'),
 *     filter: c.req.query('filter')
 *   })
 * });
 *
 * server.get('/users', handler);
 * ```
 */
export function queryHandler<
  TModuleName extends string = string,
  TQueryName extends string = string,
>(
  app: EventFlowsApp,
  _moduleName: TModuleName,
  queryName: TQueryName,
  options: QueryHandlerOptions
): Handler {
  const { mapRequest, mapResponse, status = 200 } = options;

  return async (c: Context) => {
    // Map request to query input
    const input = await mapRequest(c);

    // Execute query
    const queryExecutor = (app.queries as Record<string, (payload: any) => Promise<any>>)[
      queryName
    ];
    const result = await queryExecutor(input);

    // Transform response if mapResponse is provided
    const response = mapResponse ? mapResponse(result) : result;

    // Return with configured status code
    return c.json(response, status as any);
  };
}
