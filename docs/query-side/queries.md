# Queries & Query Handlers

Queries represent **requests for data** without modifying state.

## Query Interface

```typescript
interface IQuery {
  queryName: string; // Required identifier
}
```

## Example Queries

```typescript
interface GetAccountBalanceQuery extends IQuery {
  queryName: 'GetAccountBalance';
  accountId: string;
}

interface ListAccountsQuery extends IQuery {
  queryName: 'ListAccounts';
  limit: number;
  offset: number;
}
```

## Query Handler

```typescript
class GetAccountBalanceHandler implements IQueryHandler<GetAccountBalanceQuery, number> {
  constructor(
    private readonly readRepository: IAccountBalanceReadRepository
  ) {}

  async execute(query: GetAccountBalanceQuery): Promise<number> {
    return await this.readRepository.getBalance(query.accountId);
  }
}
```

## Complex Query Example

```typescript
interface SearchAccountsQuery extends IQuery {
  queryName: 'SearchAccounts';
  minBalance?: number;
  maxBalance?: number;
  currency?: string;
  limit: number;
  offset: number;
}

interface AccountSearchResult {
  accounts: AccountSummary[];
  total: number;
  hasMore: boolean;
}

class SearchAccountsHandler implements IQueryHandler<SearchAccountsQuery, AccountSearchResult> {
  constructor(private readonly readRepository: IAccountReadRepository) {}

  async execute(query: SearchAccountsQuery): Promise<AccountSearchResult> {
    const accounts = await this.readRepository.search({
      minBalance: query.minBalance,
      maxBalance: query.maxBalance,
      currency: query.currency,
      limit: query.limit,
      offset: query.offset
    });

    const total = await this.readRepository.count({
      minBalance: query.minBalance,
      maxBalance: query.maxBalance,
      currency: query.currency
    });

    return {
      accounts,
      total,
      hasMore: query.offset + query.limit < total
    };
  }
}
```

## Handler Registration

```typescript
const queryBus = new QueryBus();
queryBus.register('GetAccountBalance', new GetAccountBalanceHandler(readRepo));
queryBus.register('SearchAccounts', new SearchAccountsHandler(readRepo));
```

## Execution

```typescript
const balance = await queryBus.execute({
  queryName: 'GetAccountBalance',
  accountId: 'acc-123'
});

const results = await queryBus.execute({
  queryName: 'SearchAccounts',
  minBalance: 1000,
  limit: 20,
  offset: 0
});
```

See implementation in `packages/core/src/query-bus.ts`

Documentation will be expanded soon.
