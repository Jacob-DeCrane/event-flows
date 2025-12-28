import type { ICommand, ICommandHandler, IQuery, IQueryHandler, EventHandler } from '../interfaces';
import type { EventBus } from '../event-bus';
import type { EventStore } from '../event-store';
import type { CommandBus } from '../command-bus';
import type { QueryBus } from '../query-bus';

// =============================================================================
// Module Dependencies Types
// =============================================================================

/**
 * Dependencies injected into the module setup function.
 *
 * These dependencies are provided by the application infrastructure
 * and allow modules to create repositories and other dependencies
 * that need access to the event store or event bus.
 *
 * @example
 * ```typescript
 * const module = createModule({
 *   name: 'users',
 *   setup: ({ eventStore, eventBus }) => {
 *     const userRepository = new UserRepository(eventStore);
 *     return {
 *       commandHandlers: {
 *         CreateUser: new CreateUserHandler(userRepository),
 *       },
 *     };
 *   },
 * });
 * ```
 */
export interface ModuleDependencies {
	/** The event store instance for persisting and retrieving events */
	eventStore: EventStore;
	/** The event bus instance for pub/sub */
	eventBus: EventBus;
}

/**
 * The handlers returned by a module's setup function.
 *
 * @template TCommandHandlers - Record mapping command names to command handlers
 * @template TQueryHandlers - Record mapping query names to query handlers
 * @template TEventHandlers - Record mapping event names to arrays of event handlers
 */
export interface ModuleHandlers<
	TCommandHandlers extends Record<string, ICommandHandler> = Record<string, ICommandHandler>,
	TQueryHandlers extends Record<string, IQueryHandler> = Record<string, IQueryHandler>,
	TEventHandlers extends Record<string, EventHandler[]> = Record<string, EventHandler[]>,
> {
	/** Map of command names to their handlers */
	commandHandlers?: TCommandHandlers;
	/** Map of query names to their handlers */
	queryHandlers?: TQueryHandlers;
	/** Map of event names to arrays of event handlers */
	eventHandlers?: TEventHandlers;
}

// =============================================================================
// Module Factory Types
// =============================================================================

/**
 * A module factory that can be initialized with dependencies.
 *
 * This is what `createModule()` returns. The factory holds the module name
 * and a setup function that, when called with dependencies, returns the
 * full module definition with all handlers.
 *
 * @template TName - The module name as a string literal type
 * @template TCommandHandlers - Record mapping command names to command handlers
 * @template TQueryHandlers - Record mapping query names to query handlers
 * @template TEventHandlers - Record mapping event names to arrays of event handlers
 *
 * @example
 * ```typescript
 * const userModule: ModuleFactory<'users', { CreateUser: CreateUserHandler }, {}, {}> = {
 *   name: 'users',
 *   setup: (deps) => ({
 *     name: 'users',
 *     commandHandlers: { CreateUser: new CreateUserHandler(deps.eventStore) },
 *     queryHandlers: {},
 *     eventHandlers: {},
 *   }),
 * };
 * ```
 */
export interface ModuleFactory<
	TName extends string = string,
	TCommandHandlers extends Record<string, ICommandHandler> = Record<string, ICommandHandler>,
	TQueryHandlers extends Record<string, IQueryHandler> = Record<string, IQueryHandler>,
	TEventHandlers extends Record<string, EventHandler[]> = Record<string, EventHandler[]>,
> {
	/** Unique name identifying this module */
	readonly name: TName;
	/** Setup function that returns the full module definition when called with dependencies */
	readonly setup: (deps: ModuleDependencies) => ModuleDefinition<TName, TCommandHandlers, TQueryHandlers, TEventHandlers>;
}

// =============================================================================
// Module Definition Types
// =============================================================================

/**
 * Represents a domain module containing handlers for commands, queries, and events.
 *
 * Modules provide a structured way to organize CQRS/ES application code by domain.
 * Each module encapsulates related command handlers, query handlers, and event handlers.
 *
 * This is what the setup function returns after being called with dependencies.
 *
 * @template TName - The module name as a string literal type
 * @template TCommandHandlers - Record mapping command names to command handlers
 * @template TQueryHandlers - Record mapping query names to query handlers
 * @template TEventHandlers - Record mapping event names to arrays of event handlers
 *
 * @example
 * ```typescript
 * const accountModule: ModuleDefinition<
 *   'accounts',
 *   { CreateAccount: CreateAccountHandler },
 *   { GetAccountBalance: GetAccountBalanceHandler },
 *   { AccountCreated: [logAccountCreated] }
 * > = {
 *   name: 'accounts',
 *   commandHandlers: { CreateAccount: createAccountHandler },
 *   queryHandlers: { GetAccountBalance: getAccountBalanceHandler },
 *   eventHandlers: { AccountCreated: [logAccountCreated] }
 * };
 * ```
 */
export interface ModuleDefinition<
	TName extends string = string,
	TCommandHandlers extends Record<string, ICommandHandler> = Record<string, ICommandHandler>,
	TQueryHandlers extends Record<string, IQueryHandler> = Record<string, IQueryHandler>,
	TEventHandlers extends Record<string, EventHandler[]> = Record<string, EventHandler[]>,
> {
	/** Unique name identifying this module */
	readonly name: TName;
	/** Map of command names to their handlers */
	readonly commandHandlers: TCommandHandlers;
	/** Map of query names to their handlers */
	readonly queryHandlers: TQueryHandlers;
	/** Map of event names to arrays of event handlers */
	readonly eventHandlers: TEventHandlers;
}

// =============================================================================
// Utility Types for Handler Extraction
// =============================================================================

/**
 * Extracts the command interface type from a command handler.
 *
 * @template T - A command handler type
 *
 * @example
 * ```typescript
 * type Handler = ICommandHandler<CreateAccountCommand, void>;
 * type Command = ExtractCommand<Handler>; // CreateAccountCommand
 * ```
 */
export type ExtractCommand<T> = T extends ICommandHandler<infer TCommand, any> ? TCommand : never;

/**
 * Extracts the query interface type from a query handler.
 *
 * @template T - A query handler type
 *
 * @example
 * ```typescript
 * type Handler = IQueryHandler<GetAccountBalanceQuery, number>;
 * type Query = ExtractQuery<Handler>; // GetAccountBalanceQuery
 * ```
 */
export type ExtractQuery<T> = T extends IQueryHandler<infer TQuery, any> ? TQuery : never;

/**
 * Extracts the command name string literal type from a command handler.
 *
 * @template T - A command handler type
 *
 * @example
 * ```typescript
 * type Handler = ICommandHandler<{ commandName: 'CreateAccount'; accountId: string }, void>;
 * type Name = ExtractCommandName<Handler>; // 'CreateAccount'
 * ```
 */
export type ExtractCommandName<T> = T extends ICommandHandler<infer TCommand, any>
	? TCommand extends ICommand
		? TCommand['commandName']
		: never
	: never;

/**
 * Extracts the query name string literal type from a query handler.
 *
 * @template T - A query handler type
 *
 * @example
 * ```typescript
 * type Handler = IQueryHandler<{ queryName: 'GetAccountBalance'; accountId: string }, number>;
 * type Name = ExtractQueryName<Handler>; // 'GetAccountBalance'
 * ```
 */
export type ExtractQueryName<T> = T extends IQueryHandler<infer TQuery, any>
	? TQuery extends IQuery
		? TQuery['queryName']
		: never
	: never;

/**
 * Extracts the payload type from a command by omitting the `commandName` property.
 * This is used to create typed executor functions that only require the payload.
 *
 * @template T - A command type extending ICommand
 *
 * @example
 * ```typescript
 * interface CreateAccountCommand extends ICommand {
 *   commandName: 'CreateAccount';
 *   accountId: string;
 *   initialBalance: number;
 * }
 * type Payload = CommandPayload<CreateAccountCommand>;
 * // { accountId: string; initialBalance: number }
 * ```
 */
export type CommandPayload<T extends ICommand> = Omit<T, 'commandName'>;

/**
 * Extracts the payload type from a query by omitting the `queryName` property.
 * This is used to create typed executor functions that only require the payload.
 *
 * @template T - A query type extending IQuery
 *
 * @example
 * ```typescript
 * interface GetAccountBalanceQuery extends IQuery {
 *   queryName: 'GetAccountBalance';
 *   accountId: string;
 * }
 * type Payload = QueryPayload<GetAccountBalanceQuery>;
 * // { accountId: string }
 * ```
 */
export type QueryPayload<T extends IQuery> = Omit<T, 'queryName'>;

/**
 * Extracts the return type from a command or query handler's `execute()` method.
 *
 * @template T - A handler with an `execute` method returning a Promise
 *
 * @example
 * ```typescript
 * type Handler = ICommandHandler<CreateAccountCommand, { id: string }>;
 * type Result = HandlerResult<Handler>; // { id: string }
 * ```
 */
export type HandlerResult<T> = T extends { execute: (...args: any[]) => Promise<infer R> } ? R : never;

// =============================================================================
// Mapped Types for Namespaced Executor API
// =============================================================================

/**
 * Helper type that extracts command handlers from a module factory.
 */
type ModuleFactoryCommandHandlers<T> = T extends ModuleFactory<any, infer TCommands, any, any> ? TCommands : never;

/**
 * Helper type that extracts query handlers from a module factory.
 */
type ModuleFactoryQueryHandlers<T> = T extends ModuleFactory<any, any, infer TQueries, any> ? TQueries : never;

/**
 * Helper type that extracts command handlers from a single module definition.
 */
type ModuleCommandHandlers<T> = T extends ModuleDefinition<any, infer TCommands, any, any> ? TCommands : never;

/**
 * Helper type that extracts query handlers from a single module definition.
 */
type ModuleQueryHandlers<T> = T extends ModuleDefinition<any, any, infer TQueries, any> ? TQueries : never;

/**
 * Merges command handlers from a tuple/array of module factories into a single record.
 * Supports union of multiple modules.
 *
 * @template TModules - Tuple or array of module factories
 */
export type MergeCommandHandlersFromFactories<TModules extends readonly ModuleFactory[]> = TModules extends readonly [
	infer First,
	...infer Rest,
]
	? Rest extends readonly ModuleFactory[]
		? ModuleFactoryCommandHandlers<First> & MergeCommandHandlersFromFactories<Rest>
		: ModuleFactoryCommandHandlers<First>
	: // biome-ignore lint/complexity/noBannedTypes: Empty object is intended for base case
		{};

/**
 * Merges query handlers from a tuple/array of module factories into a single record.
 * Supports union of multiple modules.
 *
 * @template TModules - Tuple or array of module factories
 */
export type MergeQueryHandlersFromFactories<TModules extends readonly ModuleFactory[]> = TModules extends readonly [
	infer First,
	...infer Rest,
]
	? Rest extends readonly ModuleFactory[]
		? ModuleFactoryQueryHandlers<First> & MergeQueryHandlersFromFactories<Rest>
		: ModuleFactoryQueryHandlers<First>
	: // biome-ignore lint/complexity/noBannedTypes: Empty object is intended for base case
		{};

/**
 * Merges command handlers from a tuple/array of modules into a single record.
 * Supports union of multiple modules.
 *
 * @template TModules - Tuple or array of module definitions
 */
export type MergeCommandHandlers<TModules extends readonly ModuleDefinition[]> = TModules extends readonly [
	infer First,
	...infer Rest,
]
	? Rest extends readonly ModuleDefinition[]
		? ModuleCommandHandlers<First> & MergeCommandHandlers<Rest>
		: ModuleCommandHandlers<First>
	: // biome-ignore lint/complexity/noBannedTypes: Empty object is intended for base case
		{};

/**
 * Merges query handlers from a tuple/array of modules into a single record.
 * Supports union of multiple modules.
 *
 * @template TModules - Tuple or array of module definitions
 */
export type MergeQueryHandlers<TModules extends readonly ModuleDefinition[]> = TModules extends readonly [
	infer First,
	...infer Rest,
]
	? Rest extends readonly ModuleDefinition[]
		? ModuleQueryHandlers<First> & MergeQueryHandlers<Rest>
		: ModuleQueryHandlers<First>
	: // biome-ignore lint/complexity/noBannedTypes: Empty object is intended for base case
		{};

/**
 * Creates a typed executor function signature for a command handler.
 * The executor takes the command payload (without commandName) and returns
 * a Promise of the handler's result type.
 *
 * @template THandler - A command handler type
 *
 * @example
 * ```typescript
 * type Handler = ICommandHandler<CreateAccountCommand, { id: string }>;
 * type Executor = CommandExecutorFn<Handler>;
 * // (payload: { accountId: string; initialBalance: number }) => Promise<{ id: string }>
 * ```
 */
export type CommandExecutorFn<THandler> = THandler extends ICommandHandler<infer TCommand, infer TResult>
	? TCommand extends ICommand
		? keyof CommandPayload<TCommand> extends never
			? () => Promise<TResult>
			: (payload: CommandPayload<TCommand>) => Promise<TResult>
		: never
	: never;

/**
 * Creates a typed executor function signature for a query handler.
 * The executor takes the query payload (without queryName) and returns
 * a Promise of the handler's result type.
 *
 * @template THandler - A query handler type
 *
 * @example
 * ```typescript
 * type Handler = IQueryHandler<GetAccountBalanceQuery, number>;
 * type Executor = QueryExecutorFn<Handler>;
 * // (payload: { accountId: string }) => Promise<number>
 * ```
 */
export type QueryExecutorFn<THandler> = THandler extends IQueryHandler<infer TQuery, infer TResult>
	? TQuery extends IQuery
		? keyof QueryPayload<TQuery> extends never
			? () => Promise<TResult>
			: (payload: QueryPayload<TQuery>) => Promise<TResult>
		: never
	: never;

/**
 * Maps command handlers from module factories into typed executor functions.
 * Each key is a command name and each value is a typed executor function.
 *
 * @template TModules - Tuple or array of module factories
 *
 * @example
 * ```typescript
 * type Executors = CommandExecutorsFromFactories<[AccountModuleFactory, OrderModuleFactory]>;
 * // {
 * //   CreateAccount: (payload: { accountId: string; initialBalance: number }) => Promise<void>;
 * //   PlaceOrder: (payload: { orderId: string; items: Item[] }) => Promise<{ orderId: string }>;
 * // }
 * ```
 */
export type CommandExecutorsFromFactories<TModules extends readonly ModuleFactory[]> = {
	[K in keyof MergeCommandHandlersFromFactories<TModules>]: CommandExecutorFn<MergeCommandHandlersFromFactories<TModules>[K]>;
};

/**
 * Maps query handlers from module factories into typed executor functions.
 * Each key is a query name and each value is a typed executor function.
 *
 * @template TModules - Tuple or array of module factories
 *
 * @example
 * ```typescript
 * type Executors = QueryExecutorsFromFactories<[AccountModuleFactory, OrderModuleFactory]>;
 * // {
 * //   GetAccountBalance: (payload: { accountId: string }) => Promise<number>;
 * //   GetOrderDetails: (payload: { orderId: string }) => Promise<Order>;
 * // }
 * ```
 */
export type QueryExecutorsFromFactories<TModules extends readonly ModuleFactory[]> = {
	[K in keyof MergeQueryHandlersFromFactories<TModules>]: QueryExecutorFn<MergeQueryHandlersFromFactories<TModules>[K]>;
};

/**
 * Maps command handlers from modules into typed executor functions.
 * Each key is a command name and each value is a typed executor function.
 *
 * @template TModules - Tuple or array of module definitions
 *
 * @example
 * ```typescript
 * type Executors = CommandExecutors<[AccountModule, OrderModule]>;
 * // {
 * //   CreateAccount: (payload: { accountId: string; initialBalance: number }) => Promise<void>;
 * //   PlaceOrder: (payload: { orderId: string; items: Item[] }) => Promise<{ orderId: string }>;
 * // }
 * ```
 */
export type CommandExecutors<TModules extends readonly ModuleDefinition[]> = {
	[K in keyof MergeCommandHandlers<TModules>]: CommandExecutorFn<MergeCommandHandlers<TModules>[K]>;
};

/**
 * Maps query handlers from modules into typed executor functions.
 * Each key is a query name and each value is a typed executor function.
 *
 * @template TModules - Tuple or array of module definitions
 *
 * @example
 * ```typescript
 * type Executors = QueryExecutors<[AccountModule, OrderModule]>;
 * // {
 * //   GetAccountBalance: (payload: { accountId: string }) => Promise<number>;
 * //   GetOrderDetails: (payload: { orderId: string }) => Promise<Order>;
 * // }
 * ```
 */
export type QueryExecutors<TModules extends readonly ModuleDefinition[]> = {
	[K in keyof MergeQueryHandlers<TModules>]: QueryExecutorFn<MergeQueryHandlers<TModules>[K]>;
};

// =============================================================================
// Application Configuration Types
// =============================================================================

/**
 * Configuration object for creating an EventFlows application.
 *
 * @template TModules - Tuple of module factories for type inference
 *
 * @example
 * ```typescript
 * const config: EventFlowsAppConfig<[typeof accountModule, typeof orderModule]> = {
 *   eventStore: myEventStore,
 *   eventBus: myEventBus,
 *   modules: [accountModule, orderModule] as const
 * };
 * ```
 */
export interface EventFlowsAppConfig<TModules extends readonly ModuleFactory[] = readonly ModuleFactory[]> {
	/** The event store instance for persisting events */
	eventStore: EventStore;
	/** The event bus instance for pub/sub */
	eventBus: EventBus;
	/** Array of module factories to register. Use `as const` for type inference. */
	modules: TModules;
}

/**
 * The EventFlows application instance with typed command/query access.
 *
 * Provides:
 * - `commands`: Namespaced access to all registered command executors with full type inference
 * - `queries`: Namespaced access to all registered query executors with full type inference
 * - Direct access to underlying infrastructure (commandBus, queryBus, eventBus, eventStore)
 *
 * @template TModules - Tuple of module factories for type inference
 *
 * @example
 * ```typescript
 * const app: EventFlowsApp<[typeof accountModule]> = createEventFlowsApp({
 *   eventStore,
 *   eventBus,
 *   modules: [accountModule] as const
 * });
 *
 * // Typed command execution with intellisense
 * await app.commands.CreateAccount({ accountId: 'acc-123', initialBalance: 1000 });
 *
 * // Typed query execution with intellisense
 * const balance = await app.queries.GetAccountBalance({ accountId: 'acc-123' });
 *
 * // Direct infrastructure access for advanced use cases
 * app.eventBus.subscribe('AccountCreated', handleAccountCreated);
 * ```
 */
export interface EventFlowsApp<TModules extends readonly ModuleFactory[] = readonly ModuleFactory[]> {
	/** Namespaced command executors with full type inference */
	readonly commands: CommandExecutorsFromFactories<TModules>;
	/** Namespaced query executors with full type inference */
	readonly queries: QueryExecutorsFromFactories<TModules>;
	/** Internal command bus instance for advanced use cases */
	readonly commandBus: CommandBus;
	/** Internal query bus instance for advanced use cases */
	readonly queryBus: QueryBus;
	/** Event bus instance for subscribing to events */
	readonly eventBus: EventBus;
	/** Event store instance for direct event access */
	readonly eventStore: EventStore;
}

// =============================================================================
// Type-level Test Utilities
// =============================================================================

/**
 * Type-level assertion that two types are exactly equal.
 * Used for compile-time type testing.
 *
 * @example
 * ```typescript
 * type Test = Expect<Equal<string, string>>; // true
 * type Test2 = Expect<Equal<string, number>>; // false (compile error)
 * ```
 */
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

/**
 * Compile-time assertion that a type equals `true`.
 * Causes a compile error if the type is not `true`.
 *
 * @example
 * ```typescript
 * type Test = Expect<true>; // OK
 * type Test2 = Expect<false>; // Compile error
 * ```
 */
export type Expect<T extends true> = T;
