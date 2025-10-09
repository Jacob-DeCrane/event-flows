/**
 * Base interface for all commands in CQRS pattern.
 *
 * Commands represent intentions to change state in the system. They are:
 * - Imperative: Named as actions (e.g., "CreateAccount", "DepositMoney")
 * - Self-identifying: Include a commandName property
 * - Data carriers: Contain all information needed for the operation
 *
 * @example
 * ```typescript
 * interface CreateAccountCommand extends ICommand {
 *   commandName: 'CreateAccount';
 *   accountId: string;
 *   initialBalance: number;
 * }
 *
 * interface DepositMoneyCommand extends ICommand {
 *   commandName: 'DepositMoney';
 *   accountId: string;
 *   amount: number;
 * }
 * ```
 */
export interface ICommand {
	/**
	 * Unique identifier for the command type.
	 * Convention: Use PascalCase imperative verbs (e.g., 'CreateUser', 'UpdateProfile')
	 */
	commandName: string;
}