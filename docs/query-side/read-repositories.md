# Read Repositories

Read Repositories provide access to read models for queries.

## Purpose

- Abstract read model storage details
- Provide query-oriented API
- Separate from write repositories

## Interface

```typescript
interface IAccountBalanceReadRepository {
  getBalance(accountId: string): Promise<number>;
  getBalanceWithCurrency(accountId: string): Promise<{ balance: number; currency: string }>;
  findHighBalanceAccounts(minBalance: number): Promise<AccountBalance[]>;
}
```

## Implementation

```typescript
class AccountBalanceReadRepository implements IAccountBalanceReadRepository {
  constructor(private readonly db: Database) {}

  async getBalance(accountId: string): Promise<number> {
    const result = await this.db.query(
      'SELECT balance FROM account_balances WHERE account_id = $1',
      [accountId]
    );
    return result.rows[0]?.balance ?? 0;
  }

  async getBalanceWithCurrency(accountId: string) {
    const result = await this.db.query(
      'SELECT balance, currency FROM account_balances WHERE account_id = $1',
      [accountId]
    );
    return result.rows[0] ?? { balance: 0, currency: 'USD' };
  }

  async findHighBalanceAccounts(minBalance: number): Promise<AccountBalance[]> {
    const result = await this.db.query(
      'SELECT account_id, balance FROM account_balances WHERE balance >= $1 ORDER BY balance DESC LIMIT 100',
      [minBalance]
    );
    return result.rows;
  }
}
```

## Usage in Query Handlers

```typescript
class GetAccountBalanceHandler {
  constructor(
    private readonly readRepository: IAccountBalanceReadRepository
  ) {}

  async execute(query: GetAccountBalanceQuery) {
    return await this.readRepository.getBalance(query.accountId);
  }
}
```

## Read vs Write Repositories

```typescript
// Write Repository: Load aggregates, save events
interface IAccountWriteRepository {
  findById(id: string): Promise<BankAccount>;
  save(account: BankAccount): Promise<void>;
}

// Read Repository: Query denormalized data
interface IAccountReadRepository {
  getBalance(id: string): Promise<number>;
  searchAccounts(criteria: SearchCriteria): Promise<AccountSummary[]>;
}
```

Documentation will be expanded soon.
