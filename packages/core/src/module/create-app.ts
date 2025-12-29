import { CommandBus } from '../command-bus';
import { QueryBus } from '../query-bus';
import type { ICommand, IQuery } from '../interfaces';
import type {
	EventFlowsModule,
	ModuleDependencies,
	EventFlowsAppConfig,
	EventFlowsApp,
	ModuleCommandExecutors,
	ModuleQueryExecutors,
} from './types';
import { ModuleRegistrationError } from './errors';

/**
 * Internal tracking for which module registered each handler.
 * Used for providing helpful error messages on duplicate detection.
 */
interface HandlerRegistry {
	commands: Map<string, string>; // commandName -> moduleName
	queries: Map<string, string>; // queryName -> moduleName
}

/**
 * Creates a fully-configured EventFlows application from module factories.
 *
 * This function:
 * 1. Calls each module's `setup()` function with shared dependencies
 * 2. Registers all command handlers with an internal CommandBus
 * 3. Registers all query handlers with an internal QueryBus
 * 4. Subscribes all event handlers to the provided EventBus
 * 5. Wires the EventStore publisher to forward events to the EventBus
 * 6. Creates typed executor functions for commands and queries
 *
 * @template TModules - Tuple of module factories for type inference
 *
 * @param config - Application configuration
 * @param config.eventStore - The event store instance for persisting events
 * @param config.eventBus - The event bus instance for pub/sub
 * @param config.modules - Array of module factories to register (use `as const` for type inference)
 *
 * @returns A fully typed EventFlowsApp instance
 *
 * @throws {ModuleRegistrationError} If duplicate command or query handler names are detected
 *
 * @example
 * ```typescript
 * // Define modules
 * const userModule = createModule({
 *   name: 'users',
 *   setup: ({ eventStore }) => {
 *     const userRepository = new UserRepository(eventStore);
 *     return {
 *       commandHandlers: {
 *         CreateUser: new CreateUserHandler(userRepository),
 *       },
 *       queryHandlers: {
 *         GetUser: new GetUserHandler(),
 *       },
 *     };
 *   },
 * });
 *
 * const orderModule = createModule({
 *   name: 'orders',
 *   setup: ({ eventStore }) => {
 *     const orderRepository = new OrderRepository(eventStore);
 *     return {
 *       commandHandlers: {
 *         PlaceOrder: new PlaceOrderHandler(orderRepository),
 *       },
 *       eventHandlers: {
 *         UserCreated: [notifyNewUserHandler],
 *       },
 *     };
 *   },
 * });
 *
 * // Create application
 * const app = createEventFlowsApp({
 *   eventStore: myEventStore,
 *   eventBus: new InMemoryEventBus({}),
 *   modules: [userModule, orderModule] as const,
 * });
 *
 * // Execute commands with full type inference
 * await app.commands.CreateUser({ userId: 'user-123', name: 'John' });
 * await app.commands.PlaceOrder({ orderId: 'order-456', items: [] });
 *
 * // Execute queries with full type inference
 * const user = await app.queries.GetUser({ userId: 'user-123' });
 *
 * // Access infrastructure for advanced use cases
 * app.eventBus.subscribe('CustomEvent', handler);
 * ```
 */
export function createEventFlowsApp<TModules extends readonly EventFlowsModule[]>(
	config: EventFlowsAppConfig<TModules>
): EventFlowsApp<TModules> {
	const { eventStore, eventBus, modules } = config;

	// Create internal bus instances
	const commandBus = new CommandBus();
	const queryBus = new QueryBus();

	// Track which module registered each handler for error messages
	const registry: HandlerRegistry = {
		commands: new Map(),
		queries: new Map(),
	};

	// Build namespaced APIs during registration (single-pass)
	const commands: Record<string, (payload?: Record<string, unknown>) => Promise<unknown>> = {};
	const queries: Record<string, (payload?: Record<string, unknown>) => Promise<unknown>> = {};

	// Create dependencies object for module setup
	const deps: ModuleDependencies = { eventStore, eventBus };

	// Initialize modules, register handlers, and build executor APIs in a single pass
	for (const moduleFactory of modules) {
		// Call the module's setup function with dependencies
		const moduleDefinition = moduleFactory.setup(deps);
		const moduleName = moduleDefinition.name;

		// Register command handlers and build executors
		for (const [commandName, handler] of Object.entries(moduleDefinition.commandHandlers)) {
			// Check for duplicates
			const existingModule = registry.commands.get(commandName);
			if (existingModule !== undefined) {
				throw new ModuleRegistrationError('command', commandName, existingModule, moduleName);
			}

			// Register handler with bus
			commandBus.register(commandName, handler);
			registry.commands.set(commandName, moduleName);

			// Build executor function
			commands[commandName] = async (payload?: Record<string, unknown>) => {
				const command: ICommand = { commandName, ...payload };
				return commandBus.execute(command);
			};
		}

		// Register query handlers and build executors
		for (const [queryName, handler] of Object.entries(moduleDefinition.queryHandlers)) {
			// Check for duplicates
			const existingModule = registry.queries.get(queryName);
			if (existingModule !== undefined) {
				throw new ModuleRegistrationError('query', queryName, existingModule, moduleName);
			}

			// Register handler with bus
			queryBus.register(queryName, handler);
			registry.queries.set(queryName, moduleName);

			// Build executor function
			queries[queryName] = async (payload?: Record<string, unknown>) => {
				const query: IQuery = { queryName, ...payload };
				return queryBus.execute(query);
			};
		}

		// Subscribe event handlers
		for (const [eventName, handlers] of Object.entries(moduleDefinition.eventHandlers)) {
			for (const handler of handlers) {
				eventBus.subscribe(eventName, handler);
			}
		}
	}

	// Wire event store publisher to event bus
	eventStore.setPublisher(async (envelope) => {
		await eventBus.publish(envelope);
	});

	// Return the app instance with typed APIs
	return Object.freeze({
		commands: commands as ModuleCommandExecutors<TModules>,
		queries: queries as ModuleQueryExecutors<TModules>,
		commandBus,
		queryBus,
		eventBus,
		eventStore,
	});
}
