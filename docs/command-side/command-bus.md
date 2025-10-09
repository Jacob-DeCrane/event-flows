# Command Bus

The Command Bus routes commands to their registered handlers.

## Basic Usage

```typescript
import { CommandBus } from '@eventflow/core';

const commandBus = new CommandBus();

// Register handler
commandBus.register('DepositMoney', new DepositMoneyHandler(repository));

// Execute command
await commandBus.execute({
  commandName: 'DepositMoney',
  accountId: 'acc-123',
  amount: 100
});
```

## Batch Registration

```typescript
commandBus.registerAll([
  ['DepositMoney', depositHandler],
  ['WithdrawMoney', withdrawHandler],
  ['TransferMoney', transferHandler]
]);
```

## Execution Callback

```typescript
commandBus.onCommandExecuted((command, result) => {
  console.log(`Executed: ${command.commandName}`);
  // Log, metrics, audit trail, etc.
});
```

## Error Handling

```typescript
try {
  await commandBus.execute(command);
} catch (error) {
  if (error.message === 'No handler registered') {
    // Handle missing handler
  }
  // Handle other errors
}
```

## Type Safety

```typescript
interface DepositMoneyCommand extends ICommand {
  commandName: 'DepositMoney';
  accountId: string;
  amount: number;
}

class DepositHandler implements ICommandHandler<DepositMoneyCommand, void> {
  async execute(command: DepositMoneyCommand): Promise<void> {
    // command is fully typed
    console.log(command.accountId); // ✅ Type-safe
  }
}
```

See implementation in `packages/core/src/command-bus.ts`

Documentation will be expanded soon.
