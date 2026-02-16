import type { MiddlewareHandler } from 'hono';

/**
 * Configuration options for creating an HTTP server with Hono
 */
export interface HttpServerConfig {
  /**
   * Base path prefix for all routes
   * @default '/api'
   */
  basePath?: string;

  /**
   * Global middleware handlers to apply before route handlers
   * Middleware is applied in the order provided
   */
  middleware?: MiddlewareHandler[];

  /**
   * Enable OpenAPI documentation generation
   * When enabled, serves OpenAPI spec at /openapi.json and Swagger UI at /api-docs
   * @default false
   */
  enableOpenAPI?: boolean;

  /**
   * Title for the OpenAPI specification
   * Only used when enableOpenAPI is true
   * @default 'EventFlows API'
   */
  openApiTitle?: string;

  /**
   * Version for the OpenAPI specification
   * Only used when enableOpenAPI is true
   * @default '1.0.0'
   */
  openApiVersion?: string;

  /**
   * Description for the OpenAPI specification
   * Only used when enableOpenAPI is true
   */
  openApiDescription?: string;
}
