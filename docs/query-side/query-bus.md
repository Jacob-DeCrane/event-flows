# Query Bus

The Query Bus routes queries to their registered handlers and returns results.

## Basic Usage

```typescript
import { QueryBus } from '@eventflow/core';

const queryBus = new QueryBus();

// Register handler
queryBus.register('GetAccountBalance', new GetAccountBalanceHandler(readRepo));

// Execute query
const balance = await queryBus.execute({
  queryName: 'GetAccountBalance',
  accountId: 'acc-123'
});
```

## Batch Registration

```typescript
queryBus.registerAll([
  ['GetAccountBalance', balanceHandler],
  ['ListAccounts', listHandler],
  ['SearchAccounts', searchHandler]
]);
```

## Query Execution Callback

```typescript
queryBus.onQueryExecuted((query, result) => {
  console.log(`Query: ${query.queryName}, Result:`, result);
  // Logging, metrics, caching, etc.
});
```

## Publishers (Before Execution)

```typescript
queryBus.addPublisher((query) => {
  // Called before query execution
  metrics.recordQuery(query.queryName);
});
```

## Type Safety

```typescript
interface GetAccountBalanceQuery extends IQuery {
  queryName: 'GetAccountBalance';
  accountId: string;
}

class GetBalanceHandler implements IQueryHandler<GetAccountBalanceQuery, number> {
  async execute(query: GetAccountBalanceQuery): Promise<number> {
    // query is fully typed
    return await repo.getBalance(query.accountId);
  }
}

// Execution is type-safe
const balance: number = await queryBus.execute({
  queryName: 'GetAccountBalance',
  accountId: 'acc-123'
});
```

## Error Handling

```typescript
try {
  const result = await queryBus.execute(query);
} catch (error) {
  if (error.message.includes('No handler registered')) {
    // Handle missing handler
  }
  // Handle other errors
}
```

See implementation in `packages/core/src/query-bus.ts`

Documentation will be expanded soon.
