# Commands & Command Handlers

Commands represent **intent to change state** in the system.

## Command Interface

```typescript
interface ICommand {
  commandName: string; // Required identifier
}
```

## Example Commands

```typescript
interface DepositMoneyCommand extends ICommand {
  commandName: 'DepositMoney';
  accountId: string;
  amount: number;
}

interface WithdrawMoneyCommand extends ICommand {
  commandName: 'WithdrawMoney';
  accountId: string;
  amount: number;
}
```

## Command Handler

```typescript
class DepositMoneyHandler implements ICommandHandler<DepositMoneyCommand, void> {
  constructor(private readonly repository: IAccountRepository) {}

  async execute(command: DepositMoneyCommand): Promise<void> {
    // 1. Load aggregate
    const account = await this.repository.findById(command.accountId);
    if (!account) throw new Error('Account not found');

    // 2. Execute domain logic
    account.deposit(command.amount);

    // 3. Save aggregate
    await this.repository.save(account);
  }
}
```

## Handler Registration

```typescript
const commandBus = new CommandBus();
commandBus.register('DepositMoney', new DepositMoneyHandler(repository));
```

## Execution

```typescript
await commandBus.execute({
  commandName: 'DepositMoney',
  accountId: 'acc-123',
  amount: 100
});
```

## Best Practices

- **Commands are DTOs**: Simple data transfer objects
- **Validation**: Validate in handler or aggregate
- **One Handler Per Command**: 1:1 mapping
- **Return Void or ID**: Commands modify state, don't return data

See implementation in `packages/core/src/command-bus.ts`

Documentation will be expanded soon.
