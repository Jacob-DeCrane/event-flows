# Running Applications

`EventFlowsApp` provides the runtime interface for executing commands and queries.

## Executing Commands

```typescript
const result = await app.command<ResultType>(command);
```

Example:

```typescript
// Command with result
const { userId } = await app.command<{ userId: string }>({
  commandName: 'CreateUser',
  name: 'Alice',
  email: 'alice@example.com'
});

// Command without result
await app.command({
  commandName: 'DeleteUser',
  userId: '123'
});
```

## Executing Queries

```typescript
const result = await app.query<ResultType>(query);
```

Example:

```typescript
const user = await app.query<User | null>({
  queryName: 'GetUserById',
  userId: '123'
});

const users = await app.query<User[]>({
  queryName: 'ListUsers',
  limit: 10
});
```

## Introspection

### List Registered Modules

```typescript
const modules = app.getModules();
// ['users', 'orders', 'inventory']
```

### List Registered Commands

```typescript
const commands = app.getCommands();
// ['CreateUser', 'UpdateUser', 'DeleteUser', 'PlaceOrder', ...]
```

### List Registered Queries

```typescript
const queries = app.getQueries();
// ['GetUserById', 'ListUsers', 'GetOrder', ...]
```

## Direct Infrastructure Access

For advanced use cases, access underlying components:

```typescript
// Direct command bus access
app.commandBus.hasHandler('CreateUser'); // true
app.commandBus.onCommandExecuted((cmd, result) => {
  console.log(`Executed: ${cmd.commandName}`);
});

// Direct query bus access
app.queryBus.hasHandler('GetUserById'); // true

// Direct event bus access
app.eventBus.subscribe('UserCreated', async (envelope) => {
  // Custom subscription
});

// Direct event store access
const events = app.eventStore.getEvents(stream);
```

## Shutdown

Gracefully shut down the application:

```typescript
await app.shutdown();
```

This disconnects the event store and cleans up resources.

## Error Handling

### Command Errors

```typescript
try {
  await app.command({ commandName: 'CreateUser', ... });
} catch (error) {
  if (error.message.includes('No handler registered')) {
    // Unknown command
  }
  // Domain errors propagate from handlers
}
```

### Query Errors

```typescript
try {
  await app.query({ queryName: 'GetUser', ... });
} catch (error) {
  if (error.message.includes('No handler registered')) {
    // Unknown query
  }
}
```

## Integration Example

```typescript
// Express route handler
app.post('/users', async (req, res) => {
  try {
    const result = await eventFlowsApp.command({
      commandName: 'CreateUser',
      ...req.body
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/users/:id', async (req, res) => {
  const user = await eventFlowsApp.query({
    queryName: 'GetUserById',
    userId: req.params.id
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});
```

## Lifecycle

```typescript
// 1. Build the application
const app = await EventFlows.create()
  .withEventStore(eventStore)
  .withEventBus(eventBus)
  .withModule(userModule)
  .build();

// 2. Use the application
await app.command({ ... });
const result = await app.query({ ... });

// 3. Shutdown when done
process.on('SIGTERM', async () => {
  await app.shutdown();
  process.exit(0);
});
```

See implementation in `packages/core/src/module/eventflows-app.ts`
