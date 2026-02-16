import type { EventFlowsApp, HttpRouteConfig, ModuleRouteMetadata } from '@eventflows/core';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Configuration options for OpenAPI specification generation.
 */
export interface OpenAPIConfig {
  /**
   * The title of the API
   * @example 'EventFlows User API'
   */
  title: string;

  /**
   * The version of the API
   * @example '1.0.0'
   */
  version: string;

  /**
   * Optional description of the API
   * @example 'A RESTful API for managing users and accounts'
   */
  description?: string;

  /**
   * Optional base path for all routes (used for server URL)
   * @default '/'
   */
  basePath?: string;
}

/**
 * OpenAPI specification object (OpenAPI 3.0)
 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, any>;
  components?: Record<string, any>;
  servers?: Array<{ url: string }>;
}

/**
 * Generates an OpenAPI 3.0 specification from EventFlows module routes.
 *
 * This function:
 * 1. Creates a base OpenAPI 3.0 spec structure
 * 2. Iterates through app.moduleRoutes
 * 3. For each route:
 *    - Converts path with params to OpenAPI format (`:userId` -> `{userId}`)
 *    - Adds path and method to spec
 *    - Includes `summary`, `description`, `tags` from route config if present
 *    - Converts Zod request schema to OpenAPI schema object
 *    - Converts Zod response schema to OpenAPI schema object if present
 *    - Adds parameter definitions for URL params
 * 4. Returns complete OpenAPI spec object
 *
 * @param app - The EventFlows application instance
 * @param config - OpenAPI configuration (title, version, description)
 * @returns Complete OpenAPI 3.0 specification object
 *
 * @example
 * ```typescript
 * const spec = generateOpenAPISpec(app, {
 *   title: 'User Management API',
 *   version: '1.0.0',
 *   description: 'RESTful API for user management',
 *   basePath: '/api'
 * });
 *
 * // Serve the spec
 * server.get('/openapi.json', (c) => c.json(spec));
 * ```
 *
 * @example
 * ```typescript
 * // Route with metadata becomes OpenAPI path
 * const userModule = createModule({
 *   name: 'users',
 *   routes: {
 *     basePath: '/users',
 *     commands: {
 *       CreateUser: {
 *         method: 'POST',
 *         path: '/',
 *         schema: z.object({ name: z.string(), email: z.string().email() }),
 *         summary: 'Create a new user',
 *         description: 'Creates a user account with the provided information',
 *         tags: ['users'],
 *         responseSchema: z.object({ id: z.string(), name: z.string() })
 *       }
 *     }
 *   }
 * });
 *
 * // Generated OpenAPI spec includes:
 * // - POST /users/ endpoint
 * // - Request body schema from Zod schema
 * // - Response schema (200) from responseSchema
 * // - Summary, description, and tags
 * ```
 */
export function generateOpenAPISpec(app: EventFlowsApp, config: OpenAPIConfig): OpenAPISpec {
  const paths: Record<string, any> = {};

  // Process each module's routes
  if (app.moduleRoutes && app.moduleRoutes.length > 0) {
    for (const moduleRoute of app.moduleRoutes) {
      processModuleRoutes(paths, moduleRoute);
    }
  }

  // Create the OpenAPI spec
  const spec: OpenAPISpec = {
    openapi: '3.0.0',
    info: {
      title: config.title,
      version: config.version,
      description: config.description,
    },
    paths,
  };

  if (config.basePath) {
    spec.servers = [{ url: config.basePath }];
  }

  return spec;
}

/**
 * Processes routes from a single module and adds them to the paths object.
 *
 * @param paths - The paths object to add routes to
 * @param moduleRoute - The module route metadata
 */
function processModuleRoutes(paths: Record<string, any>, moduleRoute: ModuleRouteMetadata): void {
  const { basePath, commands, queries } = moduleRoute;

  // Process command routes
  for (const [commandName, routeConfig] of Object.entries(commands)) {
    const fullPath = combineBasePaths(basePath, routeConfig.path);
    addRouteToSpec(paths, fullPath, routeConfig, commandName);
  }

  // Process query routes
  for (const [queryName, routeConfig] of Object.entries(queries)) {
    const fullPath = combineBasePaths(basePath, routeConfig.path);
    addRouteToSpec(paths, fullPath, routeConfig, queryName);
  }
}

/**
 * Adds a single route to the OpenAPI paths object.
 *
 * @param paths - The paths object to add the route to
 * @param path - The full path for the route
 * @param config - The route configuration
 * @param operationId - The operation ID (command/query name)
 */
function addRouteToSpec(
  paths: Record<string, any>,
  path: string,
  config: HttpRouteConfig,
  operationId: string
): void {
  // Convert path params from :param to {param}
  const openApiPath = convertPathParams(path);

  // Extract path parameters
  const pathParams = extractPathParams(path);

  // Build the method
  const method = config.method.toLowerCase();

  // Initialize path if it doesn't exist
  if (!paths[openApiPath]) {
    paths[openApiPath] = {};
  }

  // Build the operation object
  const operation: any = {
    operationId,
  };

  if (config.summary) {
    operation.summary = config.summary;
  }

  if (config.description) {
    operation.description = config.description;
  }

  if (config.tags) {
    operation.tags = config.tags;
  }

  // Add path parameters if present
  if (pathParams.length > 0) {
    operation.parameters = pathParams.map((param) => ({
      name: param,
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));
  }

  // Add request body for methods that expect one
  if (config.schema && (method === 'post' || method === 'put' || method === 'patch')) {
    try {
      const jsonSchema = zodToJsonSchema(config.schema, {
        $refStrategy: 'none',
        target: 'openApi3',
      });

      // Remove $schema property as it's not needed in OpenAPI
      const { $schema, ...schemaObject } = jsonSchema as any;

      operation.requestBody = {
        content: {
          'application/json': {
            schema: schemaObject,
          },
        },
      };
    } catch (error) {
      // If schema conversion fails, add a generic object schema
      operation.requestBody = {
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      };
    }
  }

  // Add response schema
  operation.responses = {};

  if (config.responseSchema) {
    try {
      const jsonSchema = zodToJsonSchema(config.responseSchema, {
        $refStrategy: 'none',
        target: 'openApi3',
      });

      // Remove $schema property as it's not needed in OpenAPI
      const { $schema, ...schemaObject } = jsonSchema as any;

      operation.responses['200'] = {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: schemaObject,
          },
        },
      };
    } catch (error) {
      // If schema conversion fails, add a generic response
      operation.responses['200'] = {
        description: 'Successful response',
      };
    }
  } else {
    // Default response
    const statusCode = method === 'post' ? '201' : method === 'delete' ? '204' : '200';
    operation.responses[statusCode] = {
      description: 'Successful response',
    };
  }

  // Add the operation to the path
  paths[openApiPath][method] = operation;
}

/**
 * Converts path parameters from Express/Hono format to OpenAPI format.
 *
 * @param path - Path with colon-prefixed params (e.g., '/users/:userId')
 * @returns Path with curly-brace params (e.g., '/users/{userId}')
 *
 * @example
 * convertPathParams('/users/:userId') // '/users/{userId}'
 * convertPathParams('/users/:userId/posts/:postId') // '/users/{userId}/posts/{postId}'
 */
function convertPathParams(path: string): string {
  return path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
}

/**
 * Extracts path parameter names from a path string.
 *
 * @param path - Path with colon-prefixed params
 * @returns Array of parameter names
 *
 * @example
 * extractPathParams('/users/:userId') // ['userId']
 * extractPathParams('/users/:userId/posts/:postId') // ['userId', 'postId']
 */
function extractPathParams(path: string): string[] {
  const matches = path.match(/:([a-zA-Z0-9_]+)/g);
  if (!matches) return [];
  return matches.map((match) => match.substring(1));
}

/**
 * Combines two base paths, handling leading/trailing slashes correctly.
 *
 * @param path1 - First path segment
 * @param path2 - Second path segment
 * @returns Combined path with proper slash handling
 */
function combineBasePaths(path1: string | undefined, path2: string | undefined): string {
  if (!path1 && !path2) return '';
  if (!path1) return path2 || '';
  if (!path2) return path1;

  // Remove trailing slash from path1
  const normalizedPath1 = path1.endsWith('/') ? path1.slice(0, -1) : path1;

  // Ensure path2 starts with slash
  const normalizedPath2 = path2.startsWith('/') ? path2 : `/${path2}`;

  return normalizedPath1 + normalizedPath2;
}
