# HTTP Integration

The HTTP Integration turns your EventFlows module definitions into a fully functional REST API. Instead of manually creating routes, parsing requests, and wiring handlers, you define routes alongside your modules and let EventFlows generate everything automatically.

## The Core Idea

EventFlows modules already know about your command and query handlers. The HTTP Integration uses that knowledge to generate REST endpoints, validate requests, handle errors, and even produce OpenAPI documentation -- all from a single configuration.

```
                                          POST /api/users
Module Definition                         GET  /api/users/:userId
  commands: { CreateUser, UpdateUser }    PUT  /api/users/:userId
  queries:  { GetUser, ListUsers }   -->  GET  /api/users
  routes:   { basePath: '/users' }        DELETE /api/users/:userId
                    |                              |
                    v                              v
           createHttpServer(app)          Hono HTTP Server
```

## Why Not Manual Route Setup?

You could certainly create routes by hand with Hono, Express, or any other framework. But manual route setup means duplicating knowledge that already exists in your module definitions:

```typescript
// Manual approach: repetitive and error-prone
server.post('/api/users', async (c) => {
  const body = await c.req.json();
  // validate body...
  // extract params...
  // call handler...
  // map errors to status codes...
  // return response...
});

// Repeat for every single endpoint
```

With the HTTP Integration, your module definition _is_ your route configuration:

```typescript
// EventFlows approach: define once, generate everything
const userModule = createModule({
  name: 'users',
  setup: ({ eventStore }) => ({
    commandHandlers: {
      CreateUser: new CreateUserHandler(new UserRepository(eventStore)),
    },
    queryHandlers: {
      GetUser: new GetUserHandler(),
    },
  }),
  routes: {
    basePath: '/users',
    commands: {
      CreateUser: { method: 'POST', path: '/', schema: createUserSchema },
    },
    queries: {
      GetUser: { method: 'GET', path: '/:userId' },
    },
  },
});
```

## What You Get

- **Automatic route generation** from module definitions
- **Request validation** using Zod schemas
- **Error-to-status mapping** -- domain errors like "User not found" become 404 responses automatically
- **OpenAPI documentation** with Swagger UI, generated from your route metadata
- **Global middleware support** for CORS, logging, authentication, and more
- **Health check endpoint** at `/health` out of the box
- **Type-safe handler helpers** for custom routes when you need full control

## Quick Example

```typescript
import { createModule, createEventFlowsApp } from '@eventflows/core';
import { createHttpServer } from '@eventflows/integrations/hono';
import { z } from 'zod';

// 1. Define your module with routes
const userModule = createModule({
  name: 'users',
  setup: ({ eventStore }) => ({
    commandHandlers: {
      CreateUser: new CreateUserHandler(new UserRepository(eventStore)),
    },
    queryHandlers: {
      GetUser: new GetUserHandler(),
    },
  }),
  routes: {
    basePath: '/users',
    commands: {
      CreateUser: { method: 'POST', path: '/', schema: z.object({ name: z.string(), email: z.string().email() }) },
    },
    queries: {
      GetUser: { method: 'GET', path: '/:userId' },
    },
  },
});

// 2. Create the app
const app = createEventFlowsApp({
  eventStore,
  eventBus,
  modules: [userModule] as const,
});

// 3. Create the HTTP server
const server = createHttpServer(app, {
  basePath: '/api',
  enableOpenAPI: true,
});

// 4. Start serving
Bun.serve({ fetch: server.fetch, port: 3000 });
```

Your API is now live with `POST /api/users`, `GET /api/users/:userId`, a health check at `/health`, and Swagger UI at `/api-docs`.

## Prerequisites

Before using the HTTP Integration, you should be familiar with:

- [Modules Overview](../modules/overview) -- How to organize your application into modules
- [createModule()](../modules/create-module) -- How to define modules with handlers
- [createEventFlowsApp()](../modules/create-app) -- How to compose modules into an application

## Next Steps

- [Defining Routes](./defining-routes) -- Learn how to configure HTTP routes on your modules
- [createHttpServer()](./create-http-server) -- Configure and create the HTTP server
- [Error Handling](./error-handling) -- Understand automatic error-to-status mapping
- [OpenAPI & Swagger](./openapi) -- Generate API documentation
- [Custom Handlers](./custom-handlers) -- Build custom route handlers when you need full control

See implementation in `packages/integrations/src/hono/`
