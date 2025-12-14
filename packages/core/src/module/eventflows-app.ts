import type { ICommand, IQuery, IEventBus } from '../interfaces';
import type { EventStore } from '../event-store';
import type { CommandBus } from '../command-bus';
import type { QueryBus } from '../query-bus';

/**
 * Configuration for creating an EventFlowsApp instance.
 * Used internally by EventFlowsBuilder.
 */
export interface EventFlowsAppConfig {
	eventStore: EventStore;
	eventBus: IEventBus;
	commandBus: CommandBus;
	queryBus: QueryBus;
	modules: string[];
}

/**
 * The runtime application created by EventFlowsBuilder.
 *
 * Provides a unified interface for executing commands and queries,
 * with access to the underlying infrastructure for advanced use cases.
 *
 * @example
 * ```typescript
 * const app = await EventFlows.create()
 *   .withEventStore(eventStore)
 *   .withEventBus(eventBus)
 *   .withModule(userModule)
 *   .build();
 *
 * // Execute commands and queries
 * await app.command({ commandName: 'CreateUser', ... });
 * const user = await app.query({ queryName: 'GetUserById', ... });
 *
 * // Introspection
 * console.log('Modules:', app.getModules());
 * console.log('Commands:', app.getCommands());
 *
 * // Shutdown
 * await app.shutdown();
 * ```
 */
export class EventFlowsApp {
	private readonly _eventStore: EventStore;
	private readonly _eventBus: IEventBus;
	private readonly _commandBus: CommandBus;
	private readonly _queryBus: QueryBus;
	private readonly _modules: string[];

	constructor(config: EventFlowsAppConfig) {
		this._eventStore = config.eventStore;
		this._eventBus = config.eventBus;
		this._commandBus = config.commandBus;
		this._queryBus = config.queryBus;
		this._modules = config.modules;
	}

	/**
	 * Direct access to the event store for advanced use cases.
	 */
	get eventStore(): EventStore {
		return this._eventStore;
	}

	/**
	 * Direct access to the event bus for advanced use cases.
	 */
	get eventBus(): IEventBus {
		return this._eventBus;
	}

	/**
	 * Direct access to the command bus for advanced use cases.
	 */
	get commandBus(): CommandBus {
		return this._commandBus;
	}

	/**
	 * Direct access to the query bus for advanced use cases.
	 */
	get queryBus(): QueryBus {
		return this._queryBus;
	}

	/**
	 * Executes a command via the command bus.
	 *
	 * @param command - The command to execute
	 * @returns The result from the command handler
	 */
	async command<TResult = any>(command: ICommand): Promise<TResult> {
		return this._commandBus.execute(command);
	}

	/**
	 * Executes a query via the query bus.
	 *
	 * @param query - The query to execute
	 * @returns The result from the query handler
	 */
	async query<TResult = any>(query: IQuery): Promise<TResult> {
		return this._queryBus.execute(query);
	}

	/**
	 * Returns the names of all registered modules.
	 */
	getModules(): string[] {
		return [...this._modules];
	}

	/**
	 * Returns the names of all registered commands.
	 */
	getCommands(): string[] {
		return this._commandBus.getRegisteredCommands();
	}

	/**
	 * Returns the names of all registered queries.
	 */
	getQueries(): string[] {
		return this._queryBus.getRegisteredQueries();
	}

	/**
	 * Gracefully shuts down the application.
	 * Disconnects the event store and cleans up resources.
	 */
	async shutdown(): Promise<void> {
		await this._eventStore.disconnect();
	}
}
