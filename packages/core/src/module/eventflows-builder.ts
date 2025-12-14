import type { IEventBus, EventHandler } from '../interfaces';
import type { EventStore } from '../event-store';
import { CommandBus } from '../command-bus';
import { QueryBus } from '../query-bus';
import { EventFlowsApp } from './eventflows-app';
import type {
	EventFlowsModule,
	ModuleContext,
	ModuleRegistration
} from './interfaces';

/**
 * Builder for creating EventFlows applications.
 *
 * Provides a fluent API for configuring and wiring up CQRS/ES applications
 * with modules, handlers, and infrastructure.
 *
 * @example
 * ```typescript
 * const app = await EventFlows.create()
 *   .withEventStore(new PostgresEventStore(config))
 *   .withEventBus(new RabbitMQEventBus(config))
 *   .withModule(userModule)
 *   .withModule(orderModule)
 *   .withDebug(process.env.NODE_ENV === 'development')
 *   .build();
 * ```
 */
export class EventFlowsBuilder {
	private _eventStore?: EventStore;
	private _eventBus?: IEventBus;
	private _modules: EventFlowsModule[] = [];
	private _globalEventHandlers: EventHandler[] = [];

	/**
	 * Configures the event store for persistence.
	 * Required before calling build().
	 */
	withEventStore(eventStore: EventStore): this {
		this._eventStore = eventStore;
		return this;
	}

	/**
	 * Configures the event bus for pub/sub.
	 * Required before calling build().
	 */
	withEventBus(eventBus: IEventBus): this {
		this._eventBus = eventBus;
		return this;
	}

	/**
	 * Enables or disables debug logging.
	 * @param _enabled - Whether to enable debug mode (defaults to true)
	 */
	withDebug(_enabled = true): this {
		// Debug logging not yet implemented
		return this;
	}

	/**
	 * Registers a single module.
	 */
	withModule(module: EventFlowsModule): this {
		this._modules.push(module);
		return this;
	}

	/**
	 * Registers multiple modules at once.
	 */
	withModules(modules: EventFlowsModule[]): this {
		this._modules.push(...modules);
		return this;
	}

	/**
	 * Adds a global event handler that receives all events.
	 */
	withGlobalEventHandler(handler: EventHandler): this {
		this._globalEventHandlers.push(handler);
		return this;
	}

	/**
	 * Builds and returns the configured EventFlowsApp.
	 *
	 * Build sequence:
	 * 1. Validate configuration
	 * 2. Connect event store
	 * 3. Link event store to event bus
	 * 4. Initialize modules
	 * 5. Register command handlers
	 * 6. Register query handlers
	 * 7. Subscribe projection handlers
	 * 8. Subscribe event handlers
	 * 9. Register global handlers
	 *
	 * @throws Error if event store or event bus is not configured
	 * @throws Error if duplicate module names are found
	 * @throws Error if duplicate command/query handlers are found
	 */
	async build(): Promise<EventFlowsApp> {
		// Step 1: Validate configuration
		this.validate();

		const eventStore = this._eventStore!;
		const eventBus = this._eventBus!;

		// Step 2: Connect event store
		await eventStore.connect();

		// Step 3: Link event store to event bus
		eventStore.setPublisher((envelope) => eventBus.publish(envelope));

		// Create internal buses
		const commandBus = new CommandBus();
		const queryBus = new QueryBus();

		// Step 4: Initialize modules and collect registrations
		const moduleContext: ModuleContext = { eventStore, eventBus };
		const registrations: Array<{ name: string; registration: ModuleRegistration }> = [];

		for (const module of this._modules) {
			const registration = await module.register(moduleContext);
			registrations.push({ name: module.name, registration });
		}

		// Step 5 & 6: Register command and query handlers with duplicate checking
		const registeredCommands = new Set<string>();
		const registeredQueries = new Set<string>();

		for (const { registration } of registrations) {
			for (const { commandName, handler } of registration.commandHandlers) {
				if (registeredCommands.has(commandName)) {
					throw new Error(`Duplicate command handler: ${commandName}`);
				}
				commandBus.register(commandName, handler);
				registeredCommands.add(commandName);
			}

			for (const { queryName, handler } of registration.queryHandlers) {
				if (registeredQueries.has(queryName)) {
					throw new Error(`Duplicate query handler: ${queryName}`);
				}
				queryBus.register(queryName, handler);
				registeredQueries.add(queryName);
			}
		}

		// Step 7: Subscribe projection handlers
		for (const { registration } of registrations) {
			for (const projection of registration.projections) {
				for (const [eventType, handler] of Object.entries(projection.handlers)) {
					// TODO: Wrap with retry logic (Task 4)
					eventBus.subscribe(eventType, handler);
				}
			}
		}

		// Step 8: Subscribe cross-context event handlers
		for (const { registration } of registrations) {
			if (registration.eventHandlers) {
				for (const { eventType, handler } of registration.eventHandlers) {
					// TODO: Add fromContext filtering if needed
					eventBus.subscribe(eventType, handler);
				}
			}
		}

		// Step 9: Register global event handlers
		for (const handler of this._globalEventHandlers) {
			eventBus.subscribeAll(handler);
		}

		// Return configured app
		return new EventFlowsApp({
			eventStore,
			eventBus,
			commandBus,
			queryBus,
			modules: this._modules.map(m => m.name)
		});
	}

	/**
	 * Validates the builder configuration before building.
	 */
	private validate(): void {
		if (!this._eventStore) {
			throw new Error('EventStore is required. Call withEventStore() before build().');
		}

		if (!this._eventBus) {
			throw new Error('EventBus is required. Call withEventBus() before build().');
		}

		// Check for duplicate module names
		const moduleNames = new Set<string>();
		for (const module of this._modules) {
			if (moduleNames.has(module.name)) {
				throw new Error(`Duplicate module name: ${module.name}`);
			}
			moduleNames.add(module.name);
		}
	}
}

/**
 * Factory class for creating EventFlows applications.
 *
 * @example
 * ```typescript
 * const app = await EventFlows.create()
 *   .withEventStore(eventStore)
 *   .withEventBus(eventBus)
 *   .withModule(userModule)
 *   .build();
 * ```
 */
export class EventFlows {
	/**
	 * Creates a new EventFlowsBuilder for configuring an application.
	 */
	static create(): EventFlowsBuilder {
		return new EventFlowsBuilder();
	}
}
