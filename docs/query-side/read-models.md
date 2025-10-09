# Read Models

Read Models are **denormalized views** optimized for queries, built from events via projections.

## Purpose

- Optimize for read performance
- Provide query-friendly data structures
- Support complex queries without joins

## Example: Account Balance Read Model

```typescript
interface AccountBalanceReadModel {
  accountId: string;
  balance: number;
  currency: string;
  lastTransactionAt: Date;
  transactionCount: number;
}
```

## Read Model Table

```sql
CREATE TABLE account_balances (
  account_id VARCHAR(255) PRIMARY KEY,
  balance BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL,
  last_transaction_at TIMESTAMP,
  transaction_count INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_balance ON account_balances(balance);
CREATE INDEX idx_currency ON account_balances(currency);
```

## Building Read Model

Projections populate the read model:

```typescript
// Event → Read Model
eventBus.subscribe('MoneyDeposited', async (event) => {
  await db.query(`
    INSERT INTO account_balances (account_id, balance, currency, transaction_count, last_transaction_at)
    VALUES ($1, $2, 'USD', 1, NOW())
    ON CONFLICT (account_id)
    DO UPDATE SET
      balance = account_balances.balance + $2,
      transaction_count = account_balances.transaction_count + 1,
      last_transaction_at = NOW()
  `, [event.metadata.aggregateId, event.payload.amount]);
});
```

## Querying Read Model

```typescript
class AccountBalanceQuery {
  constructor(private readonly db: Database) {}

  async getBalance(accountId: string): Promise<AccountBalanceReadModel> {
    const result = await this.db.query(
      'SELECT * FROM account_balances WHERE account_id = $1',
      [accountId]
    );
    return result.rows[0];
  }

  async getHighBalanceAccounts(minBalance: number): Promise<AccountBalanceReadModel[]> {
    const result = await this.db.query(
      'SELECT * FROM account_balances WHERE balance >= $1 ORDER BY balance DESC',
      [minBalance]
    );
    return result.rows;
  }
}
```

## Multiple Read Models

Different models for different queries:

```typescript
// Model 1: Fast balance lookup
interface AccountBalance {
  accountId: string;
  balance: number;
}

// Model 2: Transaction history
interface TransactionHistory {
  accountId: string;
  transactions: Transaction[];
}

// Model 3: Analytics dashboard
interface AccountAnalytics {
  totalDeposits: number;
  totalWithdrawals: number;
  avgTransactionAmount: number;
}
```

Documentation will be expanded soon.
