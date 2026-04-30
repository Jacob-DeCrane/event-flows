import type { Hono, Context } from 'hono';
import type { EventFlowsApp, HttpRouteConfig } from '@eventflows/core';
import type { HttpServerConfig } from './types';

/**
 * Generates a command route handler and registers it with the Hono server.
 *
 * Command routes:
 * - Extract URL parameters from the path (e.g., `:userId` -> `userId`)
 * - Parse JSON request body for POST/PUT/PATCH methods
 * - Validate request body using Zod schema if provided
 * - Merge URL params with validated body to create command input
 * - Execute command via app.commands[commandName]
 * - Return appropriate HTTP status code:
 *   - POST: 201 (Created) with JSON body
 *   - DELETE: 204 (No Content) with no body
 *   - PUT/PATCH: 200 (OK) with JSON body
 *
 * @param server - The Hono server instance
 * @param app - The EventFlows application instance
 * @param moduleName - Name of the module owning the command
 * @param commandName - Name of the command handler
 * @param config - HTTP route configuration
 *
 * @example
 * ```typescript
 * generateCommandRoute(
 *   server,
 *   app,
 *   'users',
 *   'CreateUser',
 *   { method: 'POST', path: '/', schema: createUserSchema }
 * );
 * ```
 */
export function generateCommandRoute(
  server: Hono,
  app: EventFlowsApp,
  _moduleName: string,
  commandName: string,
  config: HttpRouteConfig
): void {
  const { method, path, schema } = config;
  const lowercaseMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';

  const handler = async (c: Context) => {
    // Extract URL parameters
    const urlParams = c.req.param();

    // For methods that expect a body, parse and validate it
    let body = {};
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      try {
        body = await c.req.json();
      } catch (error) {
        return c.json({ error: 'Invalid JSON body' }, 400);
      }

      // Validate body using schema if provided
      if (schema) {
        const result = schema.safeParse(body);
        if (!result.success) {
          return c.json(
            {
              error: 'Validation failed',
              details: result.error.flatten(),
            },
            400
          );
        }
        body = result.data;
      }
    }

    // Merge URL params with body to create command input
    const input = { ...urlParams, ...body };

    // Execute command
    const commandExecutor = (app.commands as Record<string, (payload: any) => Promise<any>>)[commandName];
    const result = await commandExecutor(input);

    // Return appropriate status code based on method
    if (method === 'POST') {
      return c.json(result, 201);
    } else if (method === 'DELETE') {
      return c.body(null, 204);
    } else {
      return c.json(result, 200);
    }
  };

  // Register the route with Hono
  server[lowercaseMethod](path, handler);
}

/**
 * Generates a query route handler and registers it with the Hono server.
 *
 * Query routes:
 * - Extract URL parameters from the path (e.g., `:userId` -> `userId`)
 * - Extract query string parameters from the request
 * - Merge URL params with query string params to create query input
 * - No validation on query parameters (pass through as-is)
 * - Execute query via app.queries[queryName]
 * - Return 200 (OK) status with JSON result
 *
 * @param server - The Hono server instance
 * @param app - The EventFlows application instance
 * @param moduleName - Name of the module owning the query
 * @param queryName - Name of the query handler
 * @param config - HTTP route configuration
 *
 * @example
 * ```typescript
 * generateQueryRoute(
 *   server,
 *   app,
 *   'users',
 *   'GetUser',
 *   { method: 'GET', path: '/:userId' }
 * );
 * ```
 */
export function generateQueryRoute(
  server: Hono,
  app: EventFlowsApp,
  _moduleName: string,
  queryName: string,
  config: HttpRouteConfig
): void {
  const { method, path } = config;
  const lowercaseMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';

  const handler = async (c: Context) => {
    // Extract URL parameters
    const urlParams = c.req.param();

    // Extract query string parameters
    const queryParams = c.req.query();

    // Merge URL params with query string params
    const input = { ...urlParams, ...queryParams };

    // Execute query
    const queryExecutor = (app.queries as Record<string, (payload: any) => Promise<any>>)[queryName];
    const result = await queryExecutor(input);

    // Always return 200 for queries
    return c.json(result, 200);
  };

  // Register the route with Hono
  server[lowercaseMethod](path, handler);
}

/**
 * Generates all routes from module metadata and registers them with the Hono server.
 *
 * This function:
 * 1. Iterates through app.moduleRoutes
 * 2. Combines module basePath with server basePath
 * 3. Registers all command routes using generateCommandRoute
 * 4. Registers all query routes using generateQueryRoute
 *
 * @param server - The Hono server instance
 * @param app - The EventFlows application instance
 * @param config - HTTP server configuration containing basePath
 *
 * @example
 * ```typescript
 * const server = new Hono();
 * generateRoutes(server, app, { basePath: '/api' });
 * // Routes now registered: POST /api/users/, GET /api/users/:userId, etc.
 * ```
 */
export function generateRoutes(
  server: Hono,
  app: EventFlowsApp,
  config: HttpServerConfig
): void {
  const serverBasePath = config.basePath || '';

  // Handle case where moduleRoutes might not be defined (backward compatibility)
  if (!app.moduleRoutes || app.moduleRoutes.length === 0) {
    return;
  }

  // Iterate through all module routes
  for (const moduleRoute of app.moduleRoutes) {
    const { moduleName, basePath, commands, queries } = moduleRoute;

    // Combine server basePath with module basePath
    const fullBasePath = combineBasePaths(serverBasePath, basePath);

    // Register command routes
    for (const [commandName, routeConfig] of Object.entries(commands)) {
      const fullPath = combineBasePaths(fullBasePath, routeConfig.path);
      generateCommandRoute(
        server,
        app,
        moduleName,
        commandName,
        { ...routeConfig, path: fullPath }
      );
    }

    // Register query routes
    for (const [queryName, routeConfig] of Object.entries(queries)) {
      const fullPath = combineBasePaths(fullBasePath, routeConfig.path);
      generateQueryRoute(
        server,
        app,
        moduleName,
        queryName,
        { ...routeConfig, path: fullPath }
      );
    }
  }
}

/**
 * Combines two base paths, handling leading/trailing slashes correctly.
 *
 * Special case: If path2 is just '/', it means "root of path1", so return path1 without trailing slash.
 *
 * @param path1 - First path segment
 * @param path2 - Second path segment
 * @returns Combined path with proper slash handling
 *
 * @example
 * ```typescript
 * combineBasePaths('/api', '/users') // '/api/users'
 * combineBasePaths('/api', 'users')  // '/api/users'
 * combineBasePaths('', '/users')     // '/users'
 * combineBasePaths('/api', '/')      // '/api'
 * combineBasePaths('/api/users', '/') // '/api/users'
 * ```
 */
function combineBasePaths(path1: string | undefined, path2: string | undefined): string {
  if (!path1 && !path2) return '';
  if (!path1) return path2 === '/' ? '' : (path2 || '');
  if (!path2 || path2 === '/') return path1;

  // Remove trailing slash from path1
  const normalizedPath1 = path1.endsWith('/') ? path1.slice(0, -1) : path1;

  // Ensure path2 starts with slash
  const normalizedPath2 = path2.startsWith('/') ? path2 : `/${path2}`;

  return normalizedPath1 + normalizedPath2;
}
