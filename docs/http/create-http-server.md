# createHttpServer()

Creates a Hono HTTP server instance from an EventFlows application. This function reads the route metadata from your modules and generates all the corresponding HTTP endpoints automatically.

## Basic Usage

```typescript
import { createEventFlowsApp } from '@eventflows/core';
import { createHttpServer } from '@eventflows/integrations/hono';

const app = createEventFlowsApp({
  eventStore,
  eventBus,
  modules: [userModule, orderModule] as const,
});

const server = createHttpServer(app, {
  basePath: '/api',
});

Bun.serve({ fetch: server.fetch, port: 3000 });
```

## Configuration

The `createHttpServer()` function accepts an `EventFlowsApp` instance and an `HttpServerConfig` object:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `basePath` | `string` | `'/api'` | Base path prefix for all generated routes |
| `middleware` | `MiddlewareHandler[]` | `[]` | Global Hono middleware applied before route handlers |
| `enableOpenAPI` | `boolean` | `false` | Enable OpenAPI spec at `/openapi.json` and Swagger UI at `/api-docs` |
| `openApiTitle` | `string` | `'EventFlows API'` | Title for the OpenAPI specification |
| `openApiVersion` | `string` | `'1.0.0'` | Version for the OpenAPI specification |
| `openApiDescription` | `string` | `undefined` | Description for the OpenAPI specification |

## What It Does

When you call `createHttpServer(app, config)`, the following happens in order:

1. **Creates a Hono instance** -- a new Hono server is initialized
2. **Sets up the error handler** -- the global error handler is registered to convert thrown errors into appropriate HTTP responses (see [Error Handling](./error-handling))
3. **Applies global middleware** -- any middleware from `config.middleware` is applied in the order provided
4. **Adds the health check endpoint** -- `GET /health` is registered
5. **Generates OpenAPI spec** -- if `enableOpenAPI` is true, the spec is generated and served at `/openapi.json` and `/api-docs`
6. **Auto-generates routes** -- iterates through `app.moduleRoutes` and registers all command and query routes

## Health Check

Every server includes a health check endpoint at `GET /health`:

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

This endpoint is always available regardless of your route configuration, and is not affected by the `basePath` setting.

## Global Middleware

Middleware is applied to all routes, in the order you provide it. This is useful for cross-cutting concerns like CORS, logging, or authentication:

```typescript
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const server = createHttpServer(app, {
  basePath: '/api',
  middleware: [
    cors(),
    logger(),
    async (c, next) => {
      const start = Date.now();
      await next();
      console.log(`${c.req.method} ${c.req.path} - ${Date.now() - start}ms`);
    },
  ],
});
```

Middleware runs before route handlers, so middleware order matters. For example, authentication middleware should come before authorization middleware.

## Multi-Module Routing

When your app has multiple modules with routes, each module's `basePath` is combined with the server's `basePath`:

```typescript
const userModule = createModule({
  name: 'users',
  setup: ({ eventStore }) => ({ /* handlers */ }),
  routes: {
    basePath: '/users',
    commands: {
      CreateUser: { method: 'POST', path: '/' },
    },
    queries: {
      GetUser: { method: 'GET', path: '/:userId' },
      ListUsers: { method: 'GET', path: '/' },
    },
  },
});

const orderModule = createModule({
  name: 'orders',
  setup: ({ eventStore }) => ({ /* handlers */ }),
  routes: {
    basePath: '/orders',
    commands: {
      PlaceOrder: { method: 'POST', path: '/' },
    },
    queries: {
      GetOrder: { method: 'GET', path: '/:orderId' },
    },
  },
});

const app = createEventFlowsApp({
  eventStore,
  eventBus,
  modules: [userModule, orderModule] as const,
});

const server = createHttpServer(app, { basePath: '/api' });
```

This produces the following route map:

| Method | Path | Handler |
|--------|------|---------|
| `GET` | `/health` | Health check |
| `POST` | `/api/users` | CreateUser |
| `GET` | `/api/users/:userId` | GetUser |
| `GET` | `/api/users` | ListUsers |
| `POST` | `/api/orders` | PlaceOrder |
| `GET` | `/api/orders/:orderId` | GetOrder |

## Running the Server

The `createHttpServer()` function returns a Hono instance. How you serve it depends on your runtime:

```typescript
// Bun
Bun.serve({ fetch: server.fetch, port: 3000 });

// Node.js (with @hono/node-server)
import { serve } from '@hono/node-server';
serve({ fetch: server.fetch, port: 3000 });
```

## Complete Example

```typescript
import { createModule, createEventFlowsApp, InMemoryEventBus } from '@eventflows/core';
import { createHttpServer, InMemoryEventStore } from '@eventflows/integrations';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const userModule = createModule({
  name: 'users',
  setup: ({ eventStore }) => {
    const userRepository = new UserRepository(eventStore);
    return {
      commandHandlers: {
        CreateUser: new CreateUserHandler(userRepository),
      },
      queryHandlers: {
        GetUser: new GetUserHandler(),
        ListUsers: new ListUsersHandler(),
      },
    };
  },
  routes: {
    basePath: '/users',
    commands: {
      CreateUser: {
        method: 'POST',
        path: '/',
        schema: createUserSchema,
        summary: 'Create a new user',
        tags: ['users'],
      },
    },
    queries: {
      GetUser: {
        method: 'GET',
        path: '/:userId',
        summary: 'Get user by ID',
        tags: ['users'],
      },
      ListUsers: {
        method: 'GET',
        path: '/',
        summary: 'List all users',
        tags: ['users'],
      },
    },
  },
});

const app = createEventFlowsApp({
  eventStore: new InMemoryEventStore(),
  eventBus: new InMemoryEventBus({}),
  modules: [userModule] as const,
});

const server = createHttpServer(app, {
  basePath: '/api',
  enableOpenAPI: true,
  openApiTitle: 'User Management API',
  openApiVersion: '1.0.0',
  openApiDescription: 'RESTful API for managing users',
});

Bun.serve({ fetch: server.fetch, port: 3000 });
```

## Next Steps

- [Error Handling](./error-handling) -- How domain errors become HTTP responses
- [OpenAPI & Swagger](./openapi) -- Generate API documentation
- [Custom Handlers](./custom-handlers) -- Build custom routes when you need full control

See implementation in `packages/integrations/src/hono/create-http-server.ts`
