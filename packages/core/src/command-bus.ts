import type { ICommand, ICommandHandler } from './interfaces';

/**
 * Command execution callback type
 */
export type CommandExecutedCallback<TCommand extends ICommand = ICommand, TResult = any> = (
	command: TCommand,
	result: TResult
) => void | Promise<void>;

/**
 * Framework-agnostic command bus for CQRS pattern.
 *
 * The CommandBus routes commands to their registered handlers and executes them.
 * It provides a simple, type-safe way to implement the command pattern without
 * framework dependencies.
 *
 * Key features:
 * - Direct handler registration (no decorators needed)
 * - Type-safe command execution
 * - Optional command execution callbacks
 * - No framework lock-in
 *
 * @template CommandBase - Base command type (defaults to ICommand)
 *
 * @example
 * ```typescript
 * // Define commands
 * interface CreateAccountCommand extends ICommand {
 *   commandName: 'CreateAccount';
 *   accountId: string;
 *   initialBalance: number;
 * }
 *
 * // Define handler
 * class CreateAccountHandler implements ICommandHandler<CreateAccountCommand, void> {
 *   async execute(command: CreateAccountCommand): Promise<void> {
 *     console.log(`Creating account ${command.accountId}`);
 *     // ... business logic
 *   }
 * }
 *
 * // Use command bus
 * const commandBus = new CommandBus();
 * commandBus.register('CreateAccount', new CreateAccountHandler());
 *
 * // Optional: Add callback for executed commands
 * commandBus.onCommandExecuted((command, result) => {
 *   console.log(`Executed: ${command.commandName}`);
 * });
 *
 * // Execute command
 * await commandBus.execute({
 *   commandName: 'CreateAccount',
 *   accountId: 'acc-123',
 *   initialBalance: 1000
 * });
 * ```
 */
export class CommandBus<CommandBase extends ICommand = ICommand> {
	private handlers = new Map<string, ICommandHandler<CommandBase, any>>();
	private executedCallback?: CommandExecutedCallback<CommandBase, any>;

	/**
	 * Registers a command handler for a specific command type.
	 *
	 * @param commandName - The command name to handle
	 * @param handler - The command handler instance
	 *
	 * @example
	 * ```typescript
	 * const bus = new CommandBus();
	 * bus.register('CreateAccount', new CreateAccountHandler());
	 * bus.register('DepositMoney', new DepositMoneyHandler());
	 * ```
	 */
	register<TCommand extends CommandBase, TResult = any>(
		commandName: string,
		handler: ICommandHandler<TCommand, TResult>
	): void {
		this.handlers.set(commandName, handler);
	}

	/**
	 * Registers multiple command handlers at once.
	 *
	 * @param handlers - Array of [commandName, handler] tuples
	 *
	 * @example
	 * ```typescript
	 * bus.registerAll([
	 *   ['CreateAccount', new CreateAccountHandler()],
	 *   ['DepositMoney', new DepositMoneyHandler()],
	 *   ['WithdrawMoney', new WithdrawMoneyHandler()]
	 * ]);
	 * ```
	 */
	registerAll(handlers: Array<[string, ICommandHandler<CommandBase, any>]>): void {
		for (const [commandName, handler] of handlers) {
			this.register(commandName, handler);
		}
	}

	/**
	 * Executes a command by routing it to the registered handler.
	 *
	 * @param command - The command to execute
	 * @returns Promise resolving to the handler's result
	 * @throws Error if no handler is registered for the command
	 *
	 * @example
	 * ```typescript
	 * const result = await bus.execute({
	 *   commandName: 'CreateAccount',
	 *   accountId: 'acc-123',
	 *   initialBalance: 1000
	 * });
	 * ```
	 */
	async execute<TCommand extends CommandBase, TResult = any>(command: TCommand): Promise<TResult> {
		const handler = this.handlers.get(command.commandName);

		if (!handler) {
			throw new Error(
				`No handler registered for command: ${command.commandName}. ` +
				`Available commands: ${Array.from(this.handlers.keys()).join(', ')}`
			);
		}

		const result = await handler.execute(command);

		// Call callback if registered
		if (this.executedCallback) {
			await this.executedCallback(command, result);
		}

		return result;
	}

	/**
	 * Sets a callback to be invoked after each command execution.
	 * Useful for logging, metrics, event publishing, etc.
	 *
	 * @param callback - Function to call after command execution
	 *
	 * @example
	 * ```typescript
	 * bus.onCommandExecuted(async (command, result) => {
	 *   console.log(`Command ${command.commandName} executed`);
	 *   await eventBus.publish({ type: 'CommandExecuted', command });
	 * });
	 * ```
	 */
	onCommandExecuted<TResult = any>(
		callback: CommandExecutedCallback<CommandBase, TResult>
	): void {
		this.executedCallback = callback;
	}

	/**
	 * Checks if a handler is registered for a command name.
	 *
	 * @param commandName - The command name to check
	 * @returns true if handler exists, false otherwise
	 *
	 * @example
	 * ```typescript
	 * if (bus.hasHandler('CreateAccount')) {
	 *   await bus.execute(createAccountCommand);
	 * }
	 * ```
	 */
	hasHandler(commandName: string): boolean {
		return this.handlers.has(commandName);
	}

	/**
	 * Gets all registered command names.
	 *
	 * @returns Array of command names
	 *
	 * @example
	 * ```typescript
	 * const commands = bus.getRegisteredCommands();
	 * console.log('Available commands:', commands);
	 * ```
	 */
	getRegisteredCommands(): string[] {
		return Array.from(this.handlers.keys());
	}
}