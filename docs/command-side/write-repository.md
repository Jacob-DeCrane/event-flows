# Write Repository

Repositories provide an abstraction for loading and saving aggregates.

## Purpose

- Hide event store complexity from application layer
- Provide clean aggregate-oriented API
- Handle event stream management

## Interface

```typescript
interface IAccountRepository {
  findById(id: string): Promise<BankAccount | null>;
  save(account: BankAccount): Promise<void>;
}
```

## Implementation

```typescript
class AccountRepository implements IAccountRepository {
  constructor(private readonly eventStore: EventStore) {}

  async findById(id: string): Promise<BankAccount | null> {
    const stream = EventStream.for('BankAccount', id);
    const events = [];

    try {
      for await (const batch of this.eventStore.getEvents(stream)) {
        events.push(...batch);
      }
    } catch (error) {
      return null; // Aggregate not found
    }

    if (events.length === 0) return null;

    const account = new BankAccount(id);
    account.loadFromHistory(events);
    return account;
  }

  async save(account: BankAccount): Promise<void> {
    const stream = EventStream.for('BankAccount', account.id);
    const events = account.commit();
    const version = account.version - events.length;

    await this.eventStore.appendEvents(stream, version, events);
  }
}
```

## Usage in Handlers

```typescript
class DepositMoneyHandler {
  constructor(private readonly repository: IAccountRepository) {}

  async execute(command: DepositMoneyCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId);
    if (!account) throw new Error('Account not found');

    account.deposit(command.amount);

    await this.repository.save(account);
  }
}
```

Documentation will be expanded soon.
