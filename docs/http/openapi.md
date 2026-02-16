# OpenAPI & Swagger

EventFlows can automatically generate an OpenAPI 3.0 specification from your module route definitions. When enabled, your API gets machine-readable documentation and a Swagger UI for interactive exploration -- with no extra configuration files to maintain.

## Enabling OpenAPI

Pass `enableOpenAPI: true` to `createHttpServer()`:

```typescript
const server = createHttpServer(app, {
  basePath: '/api',
  enableOpenAPI: true,
  openApiTitle: 'My API',
  openApiVersion: '1.0.0',
  openApiDescription: 'A RESTful API for managing users and orders',
});
```

## Generated Endpoints

When OpenAPI is enabled, two additional endpoints are served:

| Endpoint | Description |
|----------|-------------|
| `GET /openapi.json` | The OpenAPI 3.0 specification as JSON |
| `GET /api-docs` | Swagger UI for interactive API exploration |

Both endpoints are served at the root level (not under `basePath`), so they are always at `/openapi.json` and `/api-docs` regardless of your base path setting.

## Configuration Options

OpenAPI configuration is set through `HttpServerConfig`:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enableOpenAPI` | `boolean` | `false` | Enable OpenAPI spec and Swagger UI endpoints |
| `openApiTitle` | `string` | `'EventFlows API'` | Title displayed in the specification |
| `openApiVersion` | `string` | `'1.0.0'` | API version string |
| `openApiDescription` | `string` | `undefined` | Description of the API |

## How Routes Become Spec Entries

Each route in your modules becomes an operation in the OpenAPI spec. The generator:

1. Converts path parameters from Express/Hono format to OpenAPI format (`:userId` becomes `{userId}`)
2. Adds the route's `summary`, `description`, and `tags` if provided
3. Converts Zod request schemas to JSON Schema for the request body
4. Converts Zod response schemas to JSON Schema for the response
5. Adds path parameter definitions with `required: true`
6. Assigns appropriate default response status codes (201 for POST, 204 for DELETE, 200 for others)

For example, this route definition:

```typescript
routes: {
  basePath: '/users',
  commands: {
    CreateUser: {
      method: 'POST',
      path: '/',
      schema: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      summary: 'Create a new user',
      description: 'Creates a user account with the provided information',
      tags: ['users'],
      responseSchema: z.object({
        userId: z.string(),
      }),
    },
  },
},
```

Produces this OpenAPI path entry:

```json
{
  "/users/": {
    "post": {
      "operationId": "CreateUser",
      "summary": "Create a new user",
      "description": "Creates a user account with the provided information",
      "tags": ["users"],
      "requestBody": {
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "email": { "type": "string", "format": "email" }
              },
              "required": ["name", "email"]
            }
          }
        }
      },
      "responses": {
        "200": {
          "description": "Successful response",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "userId": { "type": "string" }
                },
                "required": ["userId"]
              }
            }
          }
        }
      }
    }
  }
}
```

## Schema Conversion

Zod schemas are converted to JSON Schema using `zod-to-json-schema`. Common Zod types map naturally:

| Zod Type | JSON Schema |
|----------|-------------|
| `z.string()` | `{ "type": "string" }` |
| `z.number()` | `{ "type": "number" }` |
| `z.boolean()` | `{ "type": "boolean" }` |
| `z.string().email()` | `{ "type": "string", "format": "email" }` |
| `z.string().min(1)` | `{ "type": "string", "minLength": 1 }` |
| `z.number().positive()` | `{ "type": "number", "exclusiveMinimum": 0 }` |
| `z.object({ ... })` | `{ "type": "object", "properties": { ... } }` |
| `z.array(z.string())` | `{ "type": "array", "items": { "type": "string" } }` |
| `z.string().optional()` | Property omitted from `required` array |

If schema conversion fails for any reason, the generator falls back to a generic `{ "type": "object" }` schema rather than failing the entire spec.

## Tags and Grouping

Use the `tags` field on routes to group related endpoints in Swagger UI:

```typescript
routes: {
  commands: {
    CreateUser: {
      method: 'POST',
      path: '/',
      tags: ['users'],
      summary: 'Create a new user',
    },
    UpdateUser: {
      method: 'PUT',
      path: '/:userId',
      tags: ['users'],
      summary: 'Update a user',
    },
  },
},
```

In Swagger UI, all routes with the same tag are grouped together, making it easy to navigate large APIs.

## generateOpenAPISpec()

If you need to generate the OpenAPI spec directly (without creating a full HTTP server), you can use the `generateOpenAPISpec` function:

```typescript
import { generateOpenAPISpec } from '@eventflows/integrations/hono';

const spec = generateOpenAPISpec(app, {
  title: 'User Management API',
  version: '1.0.0',
  description: 'RESTful API for user management',
  basePath: '/api',
});

// Use the spec object directly
console.log(JSON.stringify(spec, null, 2));
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `app` | `EventFlowsApp` | The EventFlows application instance |
| `config.title` | `string` | API title |
| `config.version` | `string` | API version |
| `config.description` | `string` (optional) | API description |
| `config.basePath` | `string` (optional) | Base path for server URL |
| **Returns** | `OpenAPISpec` | Complete OpenAPI 3.0 specification object |

## Full Example

```typescript
import { createModule, createEventFlowsApp } from '@eventflows/core';
import { createHttpServer } from '@eventflows/integrations/hono';
import { z } from 'zod';

const createOrderSchema = z.object({
  customerId: z.string(),
  items: z.array(z.object({
    sku: z.string(),
    quantity: z.number().positive(),
  })),
});

const orderModule = createModule({
  name: 'orders',
  setup: ({ eventStore }) => ({
    commandHandlers: {
      PlaceOrder: new PlaceOrderHandler(new OrderRepository(eventStore)),
    },
    queryHandlers: {
      GetOrder: new GetOrderHandler(),
      ListOrders: new ListOrdersHandler(),
    },
  }),
  routes: {
    basePath: '/orders',
    commands: {
      PlaceOrder: {
        method: 'POST',
        path: '/',
        schema: createOrderSchema,
        summary: 'Place a new order',
        description: 'Creates a new order for the specified customer with the given items.',
        tags: ['orders'],
        responseSchema: z.object({ orderId: z.string() }),
      },
    },
    queries: {
      GetOrder: {
        method: 'GET',
        path: '/:orderId',
        summary: 'Get order by ID',
        tags: ['orders'],
      },
      ListOrders: {
        method: 'GET',
        path: '/',
        summary: 'List all orders',
        description: 'Returns a list of orders. Supports filtering by customerId query parameter.',
        tags: ['orders'],
      },
    },
  },
});

const app = createEventFlowsApp({
  eventStore,
  eventBus,
  modules: [orderModule] as const,
});

const server = createHttpServer(app, {
  basePath: '/api',
  enableOpenAPI: true,
  openApiTitle: 'Order Management API',
  openApiVersion: '2.0.0',
  openApiDescription: 'API for placing and tracking orders',
});

// Swagger UI available at http://localhost:3000/api-docs
Bun.serve({ fetch: server.fetch, port: 3000 });
```

## Next Steps

- [Custom Handlers](./custom-handlers) -- Build custom routes when auto-generation is not enough
- [Defining Routes](./defining-routes) -- Route configuration reference

See implementation in `packages/integrations/src/hono/openapi-generator.ts`
