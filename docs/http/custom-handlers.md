# Custom Handlers

The automatic route generation covers the common case -- extract parameters, parse body, call handler, return result. But sometimes you need more control. Custom handler helpers let you define exactly how HTTP requests map to your commands and queries, while still benefiting from the error handling and server infrastructure.

## When to Use Custom Handlers

Use custom handlers when you need to:

- Extract data from headers, cookies, or other non-standard locations
- Transform the response shape before returning it
- Apply custom authentication logic per route
- Implement pagination with computed metadata
- Combine data from multiple request sources (params, body, headers)
- Return a custom HTTP status code

## commandHandler()

Creates a Hono handler that maps an HTTP request to a command execution with custom request/response mapping.

### Basic Usage

```typescript
import { commandHandler } from '@eventflows/integrations/hono';

const handler = commandHandler(app, 'users', 'CreateUser', {
  mapRequest: async (c) => ({
    name: (await c.req.json()).name,
    email: (await c.req.json()).email,
  }),
});

server.post('/users', handler);
```

### CommandHandlerOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `mapRequest` | `(c: Context) => TInput \| Promise<TInput>` | (required) | Maps the Hono context to the command input payload |
| `mapResponse` | `(result: TResult) => any` | Identity | Transforms the command result before returning it as JSON |
| `status` | `number` | `200` | HTTP status code to return on success |

### Examples

**Extracting from headers and body:**

```typescript
const handler = commandHandler(app, 'users', 'CreateUser', {
  mapRequest: async (c) => {
    const body = await c.req.json();
    return {
      name: body.name,
      email: body.email,
      createdBy: c.req.header('X-User-Id') || 'anonymous',
    };
  },
  status: 201,
});

server.post('/users', handler);
```

**Transforming the response:**

```typescript
const handler = commandHandler(app, 'users', 'CreateUser', {
  mapRequest: async (c) => await c.req.json(),
  mapResponse: (result) => ({
    data: result,
    created: true,
    timestamp: new Date().toISOString(),
  }),
  status: 201,
});

server.post('/users', handler);
```

**Combining URL params and body:**

```typescript
const handler = commandHandler(app, 'users', 'UpdateUser', {
  mapRequest: async (c) => {
    const body = await c.req.json();
    return {
      userId: c.req.param('userId'),
      ...body,
    };
  },
});

server.put('/users/:userId', handler);
```

## queryHandler()

Creates a Hono handler that maps an HTTP request to a query execution with custom request/response mapping.

### Basic Usage

```typescript
import { queryHandler } from '@eventflows/integrations/hono';

const handler = queryHandler(app, 'users', 'GetUser', {
  mapRequest: (c) => ({
    userId: c.req.param('userId'),
  }),
});

server.get('/users/:userId', handler);
```

### QueryHandlerOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `mapRequest` | `(c: Context) => TInput \| Promise<TInput>` | (required) | Maps the Hono context to the query input payload |
| `mapResponse` | `(result: TResult) => any` | Identity | Transforms the query result before returning it as JSON |
| `status` | `number` | `200` | HTTP status code to return on success |

### Pagination Example

```typescript
const handler = queryHandler(app, 'users', 'ListUsers', {
  mapRequest: (c) => ({
    page: parseInt(c.req.query('page') || '1'),
    limit: parseInt(c.req.query('limit') || '10'),
    filter: c.req.query('filter'),
  }),
  mapResponse: (result) => ({
    data: result.items,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      hasMore: result.page * result.limit < result.total,
    },
  }),
});

server.get('/users', handler);
```

**Including details based on query string:**

```typescript
const handler = queryHandler(app, 'users', 'GetUser', {
  mapRequest: (c) => ({
    userId: c.req.param('userId'),
    includeOrders: c.req.query('include') === 'orders',
  }),
});

server.get('/users/:userId', handler);
```

## Registering Custom Handlers

Custom handlers return standard Hono handler functions, so you register them on the Hono server instance directly:

```typescript
const server = createHttpServer(app, { basePath: '/api' });

// Register custom handlers on the server
server.post('/custom/users', commandHandler(app, 'users', 'CreateUser', {
  mapRequest: async (c) => await c.req.json(),
  status: 201,
}));

server.get('/custom/users/:userId', queryHandler(app, 'users', 'GetUser', {
  mapRequest: (c) => ({ userId: c.req.param('userId') }),
}));
```

Custom handlers benefit from the same global error handler as auto-generated routes. If your command or query handler throws an error, it is caught and converted to the appropriate HTTP response automatically.

## Combining Auto-Generated and Custom Routes

You can use both auto-generated routes (from module `routes` configuration) and custom handlers on the same server. This is useful when most of your endpoints follow the standard pattern, but a few need special treatment:

```typescript
const userModule = createModule({
  name: 'users',
  setup: ({ eventStore }) => ({
    commandHandlers: {
      CreateUser: new CreateUserHandler(new UserRepository(eventStore)),
      UpdateUser: new UpdateUserHandler(new UserRepository(eventStore)),
    },
    queryHandlers: {
      GetUser: new GetUserHandler(),
      ListUsers: new ListUsersHandler(),
    },
  }),
  // Auto-generated routes for standard CRUD
  routes: {
    basePath: '/users',
    commands: {
      CreateUser: { method: 'POST', path: '/', schema: createUserSchema },
      UpdateUser: { method: 'PUT', path: '/:userId', schema: updateUserSchema },
    },
    queries: {
      GetUser: { method: 'GET', path: '/:userId' },
    },
  },
});

const app = createEventFlowsApp({
  eventStore, eventBus,
  modules: [userModule] as const,
});

const server = createHttpServer(app, { basePath: '/api' });

// Add a custom handler for ListUsers with pagination logic
server.get('/api/users', queryHandler(app, 'users', 'ListUsers', {
  mapRequest: (c) => ({
    page: parseInt(c.req.query('page') || '1'),
    limit: parseInt(c.req.query('limit') || '20'),
  }),
  mapResponse: (result) => ({
    users: result.items,
    total: result.total,
  }),
}));
```

In this example, `CreateUser`, `UpdateUser`, and `GetUser` use the standard auto-generated routes, while `ListUsers` uses a custom handler with pagination logic.

## Next Steps

- [Defining Routes](./defining-routes) -- Configure auto-generated routes
- [Error Handling](./error-handling) -- How errors are handled in both auto-generated and custom routes
- [HTTP Integration Overview](./overview) -- Full feature overview

See implementation in `packages/integrations/src/hono/command-handler.ts` and `packages/integrations/src/hono/query-handler.ts`
