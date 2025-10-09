import { describe, test, expect, beforeEach } from 'bun:test';
import { CommandBus } from './command-bus';
import type { ICommand, ICommandHandler } from './interfaces';

// Test commands
interface CreateAccountCommand extends ICommand {
	commandName: 'CreateAccount';
	accountId: string;
	initialBalance: number;
}

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

// Test command handlers
class CreateAccountHandler implements ICommandHandler<CreateAccountCommand, { success: boolean }> {
	async execute(): Promise<{ success: boolean }> {
		// Simulate account creation
		return { success: true };
	}
}

class DepositMoneyHandler implements ICommandHandler<DepositMoneyCommand, { newBalance: number }> {
	async execute(command: DepositMoneyCommand): Promise<{ newBalance: number }> {
		// Simulate deposit
		return { newBalance: command.amount };
	}
}

class WithdrawMoneyHandler implements ICommandHandler<WithdrawMoneyCommand, void> {
	async execute(): Promise<void> {
		// Simulate withdrawal - no return value
	}
}

describe('CommandBus', () => {
	let commandBus: CommandBus;

	beforeEach(() => {
		commandBus = new CommandBus();
	});

	test('registers and executes a command handler', async () => {
		const handler = new CreateAccountHandler();
		commandBus.register('CreateAccount', handler);

		const command: CreateAccountCommand = {
			commandName: 'CreateAccount',
			accountId: 'acc-123',
			initialBalance: 1000
		};

		const result = await commandBus.execute(command);
		expect(result.success).toBe(true);
	});

	test('registers multiple handlers', () => {
		commandBus.register('CreateAccount', new CreateAccountHandler());
		commandBus.register('DepositMoney', new DepositMoneyHandler());

		expect(commandBus.hasHandler('CreateAccount')).toBe(true);
		expect(commandBus.hasHandler('DepositMoney')).toBe(true);
		expect(commandBus.hasHandler('NonExistent')).toBe(false);
	});

	test('registerAll registers multiple handlers at once', () => {
		commandBus.registerAll([
			['CreateAccount', new CreateAccountHandler()],
			['DepositMoney', new DepositMoneyHandler()],
			['WithdrawMoney', new WithdrawMoneyHandler()]
		]);

		const commands = commandBus.getRegisteredCommands();
		expect(commands).toHaveLength(3);
		expect(commands).toContain('CreateAccount');
		expect(commands).toContain('DepositMoney');
		expect(commands).toContain('WithdrawMoney');
	});

	test('executes command with return value', async () => {
		commandBus.register('DepositMoney', new DepositMoneyHandler());

		const command: DepositMoneyCommand = {
			commandName: 'DepositMoney',
			accountId: 'acc-123',
			amount: 500
		};

		const result = await commandBus.execute(command);
		expect(result.newBalance).toBe(500);
	});

	test('executes command with void return', async () => {
		commandBus.register('WithdrawMoney', new WithdrawMoneyHandler());

		const command: WithdrawMoneyCommand = {
			commandName: 'WithdrawMoney',
			accountId: 'acc-123',
			amount: 100
		};

		// Should not throw
		await commandBus.execute(command);
	});

	test('throws error when handler not found', async () => {
		const command: CreateAccountCommand = {
			commandName: 'CreateAccount',
			accountId: 'acc-123',
			initialBalance: 1000
		};

		expect(commandBus.execute(command)).rejects.toThrow(
			'No handler registered for command: CreateAccount'
		);
	});

	test('error message includes available commands', async () => {
		commandBus.register('DepositMoney', new DepositMoneyHandler());

		const command: CreateAccountCommand = {
			commandName: 'CreateAccount',
			accountId: 'acc-123',
			initialBalance: 1000
		};

		expect(commandBus.execute(command)).rejects.toThrow('Available commands: DepositMoney');
	});

	test('onCommandExecuted callback is called after execution', async () => {
		const executedCommands: ICommand[] = [];
		const executedResults: any[] = [];

		commandBus.onCommandExecuted((command, result) => {
			executedCommands.push(command);
			executedResults.push(result);
		});

		commandBus.register('CreateAccount', new CreateAccountHandler());

		const command: CreateAccountCommand = {
			commandName: 'CreateAccount',
			accountId: 'acc-123',
			initialBalance: 1000
		};

		await commandBus.execute(command);

		expect(executedCommands).toHaveLength(1);
		expect(executedCommands[0]).toEqual(command);
		expect(executedResults[0].success).toBe(true);
	});

	test('onCommandExecuted callback supports async operations', async () => {
		let callbackExecuted = false;

		commandBus.onCommandExecuted(async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
			callbackExecuted = true;
		});

		commandBus.register('CreateAccount', new CreateAccountHandler());

		await commandBus.execute({
			commandName: 'CreateAccount',
			accountId: 'acc-123',
			initialBalance: 1000
		});

		expect(callbackExecuted).toBe(true);
	});

	test('hasHandler checks for registered handlers', () => {
		expect(commandBus.hasHandler('CreateAccount')).toBe(false);

		commandBus.register('CreateAccount', new CreateAccountHandler());

		expect(commandBus.hasHandler('CreateAccount')).toBe(true);
	});

	test('getRegisteredCommands returns all command names', () => {
		expect(commandBus.getRegisteredCommands()).toEqual([]);

		commandBus.register('CreateAccount', new CreateAccountHandler());
		commandBus.register('DepositMoney', new DepositMoneyHandler());

		const commands = commandBus.getRegisteredCommands();
		expect(commands).toHaveLength(2);
		expect(commands).toContain('CreateAccount');
		expect(commands).toContain('DepositMoney');
	});

	test('handles multiple executions of same command', async () => {
		const handler = new DepositMoneyHandler();
		commandBus.register('DepositMoney', handler);

		const result1 = await commandBus.execute({
			commandName: 'DepositMoney',
			accountId: 'acc-1',
			amount: 100
		});

		const result2 = await commandBus.execute({
			commandName: 'DepositMoney',
			accountId: 'acc-2',
			amount: 200
		});

		expect(result1.newBalance).toBe(100);
		expect(result2.newBalance).toBe(200);
	});

	test('callback receives correct command and result for each execution', async () => {
		const executions: Array<{ command: ICommand; result: any }> = [];

		commandBus.onCommandExecuted((command, result) => {
			executions.push({ command, result });
		});

		commandBus.register('CreateAccount', new CreateAccountHandler());
		commandBus.register('DepositMoney', new DepositMoneyHandler());

		await commandBus.execute({
			commandName: 'CreateAccount',
			accountId: 'acc-123',
			initialBalance: 1000
		});

		await commandBus.execute({
			commandName: 'DepositMoney',
			accountId: 'acc-123',
			amount: 500
		});

		expect(executions).toHaveLength(2);
		expect(executions[0].command.commandName).toBe('CreateAccount');
		expect(executions[0].result.success).toBe(true);
		expect(executions[1].command.commandName).toBe('DepositMoney');
		expect(executions[1].result.newBalance).toBe(500);
	});
});
