# Error Handling

EventFlows automatically converts errors thrown by your domain handlers into appropriate HTTP responses. You write natural domain error messages, and the HTTP Integration maps them to the correct status codes.

## How It Works

When a command or query handler throws an error, the global error handler catches it, analyzes the error message using pattern matching, and returns a structured JSON response with the appropriate HTTP status code.

This means your domain code stays clean -- you throw errors with meaningful domain messages, and the HTTP layer handles the translation:

```typescript
class GetUserHandler implements IQueryHandler<GetUserQuery> {
  async execute(query: GetUserQuery): Promise<User> {
    const user = await this.repository.findById(query.userId);
    if (!user) {
      throw new Error('User not found');  // Becomes 404
    }
    return user;
  }
}
```

## Error Pattern Mapping

The error handler matches error messages against these patterns (tested in order):

| Pattern | Status Code | Error Type | Example Messages |
|---------|-------------|------------|------------------|
| `/not found/i` | `404` | Not Found | "User not found", "Order not found" |
| `/already in use\|already exists\|duplicate/i` | `409` | Conflict | "Email already in use", "User already exists", "Duplicate entry" |
| `/cannot be empty\|invalid\|required/i` | `400` | Bad Request | "Name cannot be empty", "Invalid email format", "Field required" |
| `/unauthorized\|not allowed\|forbidden/i` | `403` | Forbidden | "Unauthorized access", "Action not allowed", "Forbidden" |
| (no match) | `500` | Internal Server Error | "Database connection failed", any unrecognized error |

Patterns are case-insensitive. The first matching pattern wins.

## Error Response Format

All error responses follow the same JSON structure:

```json
{
  "error": "Not Found",
  "message": "User not found",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `error` | `string` | Error category (e.g., "Not Found", "Conflict", "Bad Request") |
| `message` | `string` | The original error message from your handler |
| `timestamp` | `string` | ISO 8601 timestamp of when the error occurred |

## Practical Examples

Here are common patterns showing handler code and the resulting HTTP responses:

### Not Found (404)

```typescript
// Handler
throw new Error('User not found');

// HTTP Response: 404
{
  "error": "Not Found",
  "message": "User not found",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Conflict (409)

```typescript
// Handler
throw new Error('Email already in use');

// HTTP Response: 409
{
  "error": "Conflict",
  "message": "Email already in use",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Bad Request (400)

```typescript
// Handler
throw new Error('Name cannot be empty');

// HTTP Response: 400
{
  "error": "Bad Request",
  "message": "Name cannot be empty",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Forbidden (403)

```typescript
// Handler
throw new Error('Action not allowed for this account');

// HTTP Response: 403
{
  "error": "Forbidden",
  "message": "Action not allowed for this account",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Internal Server Error (500)

```typescript
// Handler
throw new Error('Database connection failed');

// HTTP Response: 500
{
  "error": "Internal Server Error",
  "message": "Database connection failed",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Validation Errors

Validation errors from Zod schemas (configured in route definitions) are handled separately from the error handler. When request body validation fails, the route generator returns a `400 Bad Request` directly, before the handler is even called:

```json
{
  "error": "Validation failed",
  "details": {
    "fieldErrors": {
      "email": ["Invalid email format"]
    },
    "formErrors": []
  }
}
```

This is distinct from domain validation errors thrown by your handlers. See [Defining Routes](./defining-routes) for more on schema validation.

## mapErrorToStatus()

If you need to use the same error mapping logic in your own code, the `mapErrorToStatus` function is exported:

```typescript
import { mapErrorToStatus } from '@eventflows/integrations/hono';

const { status, type } = mapErrorToStatus('User not found');
// { status: 404, type: 'Not Found' }

const { status, type } = mapErrorToStatus('Email already in use');
// { status: 409, type: 'Conflict' }

const { status, type } = mapErrorToStatus('Something unexpected');
// { status: 500, type: 'Internal Server Error' }
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | `string` | The error message to analyze |
| **Returns** | `{ status: number, type: string }` | HTTP status code and error type |

## Best Practices

- **Use domain language in error messages.** Write "Order not found" rather than "404". Your domain code should not know about HTTP status codes.
- **Let the error handler do the mapping.** Resist the urge to throw `HTTPException` from your domain handlers -- that couples your domain to HTTP concerns.
- **Be specific in your messages.** "User not found" is better than "Not found" because it gives the API consumer context about what was missing.
- **Use Zod schemas for input validation.** Let the route generator handle malformed request bodies before they reach your handlers.

## Next Steps

- [OpenAPI & Swagger](./openapi) -- Document your API endpoints
- [Custom Handlers](./custom-handlers) -- Override default error handling for specific routes

See implementation in `packages/integrations/src/hono/error-handler.ts`
