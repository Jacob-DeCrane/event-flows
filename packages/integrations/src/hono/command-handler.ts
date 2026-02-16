import type { Context, Handler } from 'hono';
import type { EventFlowsApp } from '@eventflows/core';

/**
 * Options for configuring a command handler.
 *
 * @template TInput - The input type for the command
 * @template TResult - The result type returned by the command
 */
export interface CommandHandlerOptions<TInput = any, TResult = any> {
  /**
   * Maps the Hono context to the command input payload.
   * This function extracts data from the request (headers, body, params, query)
   * and transforms it into the expected command input format.
   *
   * @param c - The Hono context
   * @returns The command input payload or a promise resolving to it
   *
   * @example
   * ```typescript
   * mapRequest: async (c) => ({
   *   userId: c.req.param('userId'),
   *   name: (await c.req.json()).name
   * })
   * ```
   */
  mapRequest: (c: Context) => TInput | Promise<TInput>;

  /**
   * Optional function to transform the command result before returning it as JSON.
   * Use this to customize the response shape or add metadata.
   *
   * @param result - The result returned by the command handler
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
   * status: 201 // Return 201 Created for POST requests
   * ```
   */
  status?: number;
}

/**
 * Creates a type-safe Hono handler for a command with custom request/response mapping.
 *
 * This helper provides full control over how the HTTP request is mapped to the command input
 * and how the command result is transformed into the HTTP response. It's useful when you need
 * custom logic beyond what the automatic route generation provides.
 *
 * Features:
 * - Full TypeScript inference for command names, input types, and result types
 * - Custom request mapping (extract data from headers, body, params, query)
 * - Optional response transformation
 * - Optional custom status code
 * - Automatic error propagation to Hono's error handler
 *
 * @template TModuleName - The module name (inferred from second argument)
 * @template TCommandName - The command name (inferred from third argument)
 *
 * @param app - The EventFlows application instance
 * @param moduleName - The name of the module containing the command
 * @param commandName - The name of the command handler
 * @param options - Configuration options for request/response mapping
 * @returns A Hono handler function
 *
 * @example
 * ```typescript
 * // Basic usage with request mapping
 * const handler = commandHandler(app, 'users', 'CreateUser', {
 *   mapRequest: async (c) => ({
 *     name: c.req.header('X-User-Name') || 'Unknown',
 *     email: c.req.query('email') || ''
 *   })
 * });
 *
 * server.post('/users', handler);
 * ```
 *
 * @example
 * ```typescript
 * // With response transformation and custom status
 * const handler = commandHandler(app, 'users', 'CreateUser', {
 *   mapRequest: async (c) => await c.req.json(),
 *   mapResponse: (result) => ({
 *     userId: result.id,
 *     created: true,
 *     timestamp: new Date().toISOString()
 *   }),
 *   status: 201
 * });
 *
 * server.post('/users', handler);
 * ```
 *
 * @example
 * ```typescript
 * // Extracting URL params and body
 * const handler = commandHandler(app, 'users', 'UpdateUser', {
 *   mapRequest: async (c) => {
 *     const body = await c.req.json();
 *     return {
 *       userId: c.req.param('userId'),
 *       ...body
 *     };
 *   }
 * });
 *
 * server.put('/users/:userId', handler);
 * ```
 */
export function commandHandler<
  TModuleName extends string = string,
  TCommandName extends string = string,
>(
  app: EventFlowsApp,
  _moduleName: TModuleName,
  commandName: TCommandName,
  options: CommandHandlerOptions
): Handler {
  const { mapRequest, mapResponse, status = 200 } = options;

  return async (c: Context) => {
    // Map request to command input
    const input = await mapRequest(c);

    // Execute command
    const commandExecutor = (app.commands as Record<string, (payload: any) => Promise<any>>)[
      commandName
    ];
    const result = await commandExecutor(input);

    // Transform response if mapResponse is provided
    const response = mapResponse ? mapResponse(result) : result;

    // Return with configured status code
    return c.json(response, status as any);
  };
}
