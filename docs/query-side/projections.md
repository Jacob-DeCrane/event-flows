# Projections

Projections build **read models** from event streams, transforming write-optimized events into read-optimized views.

## Purpose

- Transform events into queryable data structures
- Create denormalized views for fast reads
- Build multiple views from same events

## Basic Projection

```typescript
// Subscribe to events and update read model
eventBus.subscribe('MoneyDeposited', async (envelope) => {
  await db.query(`
    UPDATE account_balances
    SET balance = balance + $1,
        updated_at = NOW()
    WHERE account_id = $2
  `, [envelope.payload.amount, envelope.metadata.aggregateId]);
});

eventBus.subscribe('MoneyWithdrawn', async (envelope) => {
  await db.query(`
    UPDATE account_balances
    SET balance = balance - $1,
        updated_at = NOW()
    WHERE account_id = $2
  `, [envelope.payload.amount, envelope.metadata.aggregateId]);
});
```

## Projection Handler

```typescript
class AccountBalanceProjection {
  constructor(private readonly db: Database) {}

  async onMoneyDeposited(event: EventEnvelope<MoneyDeposited>) {
    await this.db.query(`
      INSERT INTO account_balances (account_id, balance, currency)
      VALUES ($1, $2, 'USD')
      ON CONFLICT (account_id)
      DO UPDATE SET
        balance = account_balances.balance + $2,
        updated_at = NOW()
    `, [event.metadata.aggregateId, event.payload.amount]);
  }

  async onMoneyWithdrawn(event: EventEnvelope<MoneyWithdrawn>) {
    await this.db.query(`
      UPDATE account_balances
      SET balance = balance - $1,
          updated_at = NOW()
      WHERE account_id = $2
    `, [event.payload.amount, event.metadata.aggregateId]);
  }
}

// Register projection
const projection = new AccountBalanceProjection(db);
eventBus.subscribe('MoneyDeposited', (e) => projection.onMoneyDeposited(e));
eventBus.subscribe('MoneyWithdrawn', (e) => projection.onMoneyWithdrawn(e));
```

## Multiple Projections

Build different views from same events:

```typescript
// View 1: Current balances (for queries)
class BalanceProjection {
  async onMoneyDeposited(event) {
    await db.updateBalance(event.metadata.aggregateId, event.payload.amount);
  }
}

// View 2: Transaction history (for audit)
class TransactionHistoryProjection {
  async onMoneyDeposited(event) {
    await db.insertTransaction({
      accountId: event.metadata.aggregateId,
      type: 'deposit',
      amount: event.payload.amount,
      timestamp: event.metadata.occurredOn
    });
  }
}

// View 3: Analytics (for reporting)
class AnalyticsProjection {
  async onMoneyDeposited(event) {
    await db.incrementMetric('total_deposits', event.payload.amount);
  }
}
```

## Rebuilding Projections

Replay events to rebuild view:

```typescript
async function rebuildProjection(projection: AccountBalanceProjection) {
  // Clear existing data
  await db.query('TRUNCATE account_balances');

  // Replay all events
  const events = eventStore.getAllEvents();
  for await (const batch of events) {
    for (const event of batch) {
      if (event.type === 'MoneyDeposited') {
        await projection.onMoneyDeposited(event);
      }
      // ... handle other events
    }
  }
}
```

Documentation will be expanded soon.
