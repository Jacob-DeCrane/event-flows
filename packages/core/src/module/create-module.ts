import type { ICommandHandler, IQueryHandler, EventHandler } from '../interfaces';
import type { ModuleDependencies, ModuleFactory } from './types';

/**
 * Configuration options for creating a module factory.
 *
 * @template TName - The module name as a string literal type
 * @template TCommandHandlers - Record mapping command names to command handlers
 * @template TQueryHandlers - Record mapping query names to query handlers
 * @template TEventHandlers - Record mapping event names to arrays of event handlers
 */
export interface CreateModuleConfig<
	TName extends string,
	TCommandHandlers extends Record<string, ICommandHandler> = Record<string, never>,
	TQueryHandlers extends Record<string, IQueryHandler> = Record<string, never>,
	TEventHandlers extends Record<string, EventHandler[]> = Record<string, never>,
> {
	/** Unique name identifying this module */
	name: TName;
	/** Setup function that receives dependencies and returns handlers */
	setup: (deps: ModuleDependencies) => {
		commandHandlers?: TCommandHandlers;
		queryHandlers?: TQueryHandlers;
		eventHandlers?: TEventHandlers;
	};
}

/**
 * Creates a typed module factory for organizing domain handlers.
 *
 * Modules provide a structured way to organize CQRS/ES application code by domain.
 * Each module encapsulates related command handlers, query handlers, and event handlers.
 *
 * The setup function receives dependencies (eventStore, eventBus) and returns
 * the handlers. This allows for dependency injection and lazy initialization.
 *
 * @template TName - The module name as a string literal type
 * @template TCommandHandlers - Record mapping command names to command handlers
 * @template TQueryHandlers - Record mapping query names to query handlers
 * @template TEventHandlers - Record mapping event names to arrays of event handlers
 *
 * @param config - Configuration object for the module
 * @returns A frozen, immutable module factory
 *
 * @throws {Error} If module name is empty or whitespace-only
 *
 * @example
 * ```typescript
 * // Create a module with command handlers using dependency injection
 * const accountModule = createModule({
 *   name: 'accounts',
 *   setup: ({ eventStore }) => {
 *     const accountRepository = new AccountRepository(eventStore);
 *     return {
 *       commandHandlers: {
 *         CreateAccount: new CreateAccountHandler(accountRepository),
 *         DepositMoney: new DepositMoneyHandler(accountRepository),
 *       },
 *     };
 *   },
 * });
 *
 * // Create a full-featured module
 * const orderModule = createModule({
 *   name: 'orders',
 *   setup: ({ eventStore, eventBus }) => {
 *     const orderRepository = new OrderRepository(eventStore);
 *     return {
 *       commandHandlers: {
 *         PlaceOrder: new PlaceOrderHandler(orderRepository),
 *       },
 *       queryHandlers: {
 *         GetOrderDetails: new GetOrderDetailsHandler(),
 *       },
 *       eventHandlers: {
 *         OrderPlaced: [logOrderPlaced, notifyCustomer],
 *       },
 *     };
 *   },
 * });
 * ```
 */
export function createModule<
	TName extends string,
	TCommandHandlers extends Record<string, ICommandHandler> = Record<string, never>,
	TQueryHandlers extends Record<string, IQueryHandler> = Record<string, never>,
	TEventHandlers extends Record<string, EventHandler[]> = Record<string, never>,
>(
	config: CreateModuleConfig<TName, TCommandHandlers, TQueryHandlers, TEventHandlers>
): ModuleFactory<TName, TCommandHandlers, TQueryHandlers, TEventHandlers> {
	const { name, setup } = config;

	// Validate module name is non-empty string
	if (!name || typeof name !== 'string' || name.trim().length === 0) {
		throw new Error('Module name must be a non-empty string');
	}

	// Create module factory with setup function
	const moduleFactory: ModuleFactory<TName, TCommandHandlers, TQueryHandlers, TEventHandlers> = {
		name,
		setup: (deps: ModuleDependencies) => {
			const handlers = setup(deps);
			return Object.freeze({
				name,
				commandHandlers: (handlers.commandHandlers ?? {}) as TCommandHandlers,
				queryHandlers: (handlers.queryHandlers ?? {}) as TQueryHandlers,
				eventHandlers: (handlers.eventHandlers ?? {}) as TEventHandlers,
			});
		},
	};

	// Return frozen module factory object
	return Object.freeze(moduleFactory);
}
