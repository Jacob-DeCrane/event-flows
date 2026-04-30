# Defining Routes

Routes are defined as part of your module configuration, right alongside your handlers. This keeps your HTTP layer co-located with the domain logic it exposes, while maintaining a clean separation -- routes are metadata, not behavior.

## Basic Usage

Add a `routes` property to your `createModule()` call:

```typescript
import { createModule } from '@eventflows/core';

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
      CreateUser: { method: 'POST', path: '/' },
    },
    queries: {
      GetUser: { method: 'GET', path: '/:userId' },
    },
  },
});
```

The `routes` property is entirely optional. Modules without routes continue to work exactly as before.

## HttpRouteConfig

Each route is described by an `HttpRouteConfig` object:

| Property | Type | Description |
|----------|------|-------------|
| `method` | `'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE'` | HTTP method for this route |
| `path` | `string` | URL path with optional colon-prefixed parameters (e.g., `'/:userId'`) |
| `schema` | `z.ZodSchema` (optional) | Zod schema for request body validation (POST, PUT, PATCH) |
| `summary` | `string` (optional) | OpenAPI summary for documentation |
| `description` | `string` (optional) | OpenAPI description for documentation |
| `tags` | `string[]` (optional) | OpenAPI tags for grouping routes |
| `responseSchema` | `z.ZodSchema` (optional) | Zod schema for response body documentation |

## ModuleRoutes

The `routes` property on a module has the following shape:

| Property | Type | Description |
|----------|------|-------------|
| `basePath` | `string` (optional) | Base path prefix for all routes in this module |
| `commands` | `Partial<Record<keyof TCommandHandlers, HttpRouteConfig>>` | Route configurations for command handlers |
| `queries` | `Partial<Record<keyof TQueryHandlers, HttpRouteConfig>>` | Route configurations for query handlers |

## Type Safety

Route keys are constrained to your handler names at compile time. If you reference a handler that does not exist, TypeScript will catch it:

```typescript
const userModule = createModule({
  name: 'users',
  setup: ({ eventStore }) => ({
    commandHandlers: {
      CreateUser: new CreateUserHandler(new UserRepository(eventStore)),
    },
    queryHandlers: {},
  }),
  routes: {
    commands: {
      CreateUser: { method: 'POST', path: '/' },  // OK
      DeleteUser: { method: 'DELETE', path: '/' }, // TypeScript error: 'DeleteUser' is not a key of commandHandlers
    },
  },
});
```

This compile-time constraint prevents a common class of bugs where routes reference handlers that were renamed or removed.

## Command Routes

Command routes map HTTP requests to command handler executions. The HTTP method determines the response behavior:

- **POST** returns `201 Created` with the handler result as JSON
- **PUT / PATCH** returns `200 OK` with the handler result as JSON
- **DELETE** returns `204 No Content` with no body

For POST, PUT, and PATCH requests, the route generator automatically parses the JSON request body. URL parameters are extracted from the path and merged with the body to form the command input:

```typescript
routes: {
  commands: {
    CreateUser: { method: 'POST', path: '/' },
    // POST /users with body { name: 'Alice', email: 'alice@example.com' }
    // -> handler receives { name: 'Alice', email: 'alice@example.com' }

    UpdateUser: { method: 'PUT', path: '/:userId' },
    // PUT /users/123 with body { name: 'Alice Updated' }
    // -> handler receives { userId: '123', name: 'Alice Updated' }

    DeleteUser: { method: 'DELETE', path: '/:userId' },
    // DELETE /users/123
    // -> handler receives { userId: '123' }
  },
},
```

## Query Routes

Query routes map HTTP requests to query handler executions. They always return `200 OK` with the handler result as JSON.

URL parameters and query string parameters are both extracted and merged to form the query input:

```typescript
routes: {
  queries: {
    GetUser: { method: 'GET', path: '/:userId' },
    // GET /users/123
    // -> handler receives { userId: '123' }

    ListUsers: { method: 'GET', path: '/' },
    // GET /users?limit=10&offset=20
    // -> handler receives { limit: '10', offset: '20' }
  },
},
```

Note that query string parameters are passed as strings. Your query handler is responsible for parsing them to the appropriate types.

## Schema Validation

You can attach a Zod schema to any command route to validate the request body before the handler is called. If validation fails, the server returns a `400 Bad Request` response with error details:

```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty'),
  email: z.string().email('Invalid email format'),
});

routes: {
  commands: {
    CreateUser: {
      method: 'POST',
      path: '/',
      schema: createUserSchema,
    },
  },
},
```

When validation fails, the response looks like:

```json
{
  "error": "Validation failed",
  "details": {
    "fieldErrors": {
      "name": ["Name cannot be empty"],
      "email": ["Invalid email format"]
    },
    "formErrors": []
  }
}
```

If the request body is not valid JSON at all, the server returns:

```json
{
  "error": "Invalid JSON body"
}
```

## Path Composition

The final URL for each route is composed from three parts:

1. **Server basePath** -- set in `createHttpServer()` config (e.g., `/api`)
2. **Module basePath** -- set in the module's `routes.basePath` (e.g., `/users`)
3. **Route path** -- set on each individual route (e.g., `/:userId`)

These are concatenated with proper slash handling:

```
Server basePath + Module basePath + Route path = Final URL
/api            + /users          + /:userId   = /api/users/:userId
/api            + /users          + /           = /api/users
(none)          + /orders         + /:orderId  = /orders/:orderId
```

## OpenAPI Metadata

Each route can include optional metadata used to generate OpenAPI documentation. These fields have no effect on runtime behavior -- they are purely informational:

```typescript
commands: {
  CreateUser: {
    method: 'POST',
    path: '/',
    schema: createUserSchema,
    summary: 'Create a new user',
    description: 'Creates a new user account with the provided details',
    tags: ['users'],
    responseSchema: z.object({ userId: z.string() }),
  },
},
```

See [OpenAPI & Swagger](./openapi) for details on how this metadata is used.

## Full Example

```typescript
import { createModule } from '@eventflows/core';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty'),
  email: z.string().email('Invalid email format'),
});

const updateUserSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty'),
  email: z.string().email('Invalid email format').optional(),
});

const userModule = createModule({
  name: 'users',
  setup: ({ eventStore }) => {
    const userRepository = new UserRepository(eventStore);
    return {
      commandHandlers: {
        CreateUser: new CreateUserHandler(userRepository),
        UpdateUser: new UpdateUserHandler(userRepository),
        DeleteUser: new DeleteUserHandler(userRepository),
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
      UpdateUser: {
        method: 'PUT',
        path: '/:userId',
        schema: updateUserSchema,
        summary: 'Update a user',
        tags: ['users'],
      },
      DeleteUser: {
        method: 'DELETE',
        path: '/:userId',
        summary: 'Delete a user',
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
        description: 'Returns a paginated list of users. Supports limit and offset query parameters.',
        tags: ['users'],
      },
    },
  },
});
```

## Next Steps

- [createHttpServer()](./create-http-server) -- Create the HTTP server from your app
- [Error Handling](./error-handling) -- How domain errors become HTTP responses
- [OpenAPI & Swagger](./openapi) -- Generate API documentation from route metadata

See implementation in `packages/core/src/module/types.ts`
