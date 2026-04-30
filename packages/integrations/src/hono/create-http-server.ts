import { Hono } from 'hono';
import type { HttpServerConfig } from './types';
import { createErrorHandler } from './error-handler';
import { generateRoutes } from './route-generator';
import { generateOpenAPISpec } from './openapi-generator';

// TODO: Import EventFlowsApp type from @eventflows/core once exports are fixed
type EventFlowsApp = any;

/**
 * Creates a Hono HTTP server instance from an EventFlows application
 *
 * @param app - The EventFlows application instance
 * @param config - HTTP server configuration options
 * @returns A configured Hono server instance
 *
 * @example
 * ```typescript
 * const app = createEventFlowsApp({
 *   eventStore,
 *   eventBus,
 *   modules: [userModule] as const,
 * });
 *
 * const server = createHttpServer(app, {
 *   basePath: '/api',
 *   middleware: [cors(), logger()],
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With OpenAPI documentation
 * const server = createHttpServer(app, {
 *   basePath: '/api',
 *   enableOpenAPI: true,  // Serves spec at /openapi.json
 * });
 * ```
 */
export function createHttpServer(app: EventFlowsApp, config: HttpServerConfig): Hono {
  // Create Hono instance
  const server = new Hono();

  // Set up error handler
  server.onError(createErrorHandler());

  // Apply global middleware before route handlers
  if (config.middleware && config.middleware.length > 0) {
    for (const middleware of config.middleware) {
      server.use('*', middleware);
    }
  }

  // Add automatic health check endpoint
  server.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // Generate and serve OpenAPI spec if enabled
  if (config.enableOpenAPI) {
    const openApiSpec = generateOpenAPISpec(app, {
      title: config.openApiTitle || 'EventFlows API',
      version: config.openApiVersion || '1.0.0',
      description: config.openApiDescription,
      basePath: config.basePath,
    });

    // Serve OpenAPI spec at /openapi.json
    server.get('/openapi.json', (c) => {
      return c.json(openApiSpec);
    });

    // Serve Swagger UI at /api-docs (simple HTML with Swagger UI CDN)
    server.get('/api-docs', (c) => {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
      `;
      return c.html(html);
    });
  }

  // Generate routes from module metadata
  generateRoutes(server, app, config);

  return server;
}
