# CQRS (Command Query Responsibility Segregation)

CQRS separates **write operations** (commands) from **read operations** (queries), allowing each to be optimized independently.

## Core Concept

Traditional architecture uses same model for reads and writes. CQRS splits them:

```
Traditional:              CQRS:
┌────────────┐           ┌─────────┐  ┌────────┐
│  Model     │           │ Write   │  │ Read   │
│            │           │ Model   │  │ Model  │
└────────────┘           └─────────┘  └────────┘
```

## Commands (Write Side)

Commands express **intent to change state**:

```typescript
interface DepositMoneyCommand extends ICommand {
  commandName: 'DepositMoney';
  accountId: string;
  amount: number;
}

class DepositMoneyHandler implements ICommandHandler {
  async execute(command: DepositMoneyCommand): Promise<void> {
    const account = await repository.load(command.accountId);
    account.deposit(command.amount);
    await repository.save(account);
  }
}
```

## Queries (Read Side)

Queries request **data without side effects**:

```typescript
interface GetAccountBalanceQuery extends IQuery {
  queryName: 'GetAccountBalance';
  accountId: string;
}

class GetAccountBalanceHandler implements IQueryHandler {
  async execute(query: GetAccountBalanceQuery) {
    return await readModel.getBalance(query.accountId);
  }
}
```

## Benefits

- **Independent Scaling**: Scale reads and writes separately
- **Optimized Models**: Different models for different needs
- **Simpler Logic**: Each side has clear responsibility
- **Performance**: Optimize queries without affecting writes

Documentation will be expanded soon.
