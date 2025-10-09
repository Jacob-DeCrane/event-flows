import type { IQuery, IQueryHandler } from './interfaces';

/**
 * Query execution callback type
 */
export type QueryExecutedCallback<TQuery extends IQuery = IQuery, TResult = any> = (
	query: TQuery,
	result: TResult
) => void | Promise<void>;

/**
 * Query publisher function type
 */
export type QueryPublisher<TQuery extends IQuery = IQuery> = (
	query: TQuery
) => void | Promise<void>;

/**
 * Framework-agnostic query bus for CQRS pattern.
 *
 * The QueryBus routes queries to their registered handlers and executes them,
 * returning the result data. It implements the Query side of CQRS, handling
 * read operations without modifying state.
 *
 * Key features:
 * - Direct handler registration (no decorators needed)
 * - Type-safe query execution with return values
 * - Optional query execution callbacks
 * - Publisher support for query monitoring/logging
 * - No framework lock-in
 *
 * @template QueryBase - Base query type (defaults to IQuery)
 *
 * @example
 * ```typescript
 * // Define queries
 * interface GetAccountBalanceQuery extends IQuery {
 *   queryName: 'GetAccountBalance';
 *   accountId: string;
 * }
 *
 * interface AccountBalanceResult {
 *   balance: number;
 *   currency: string;
 * }
 *
 * // Define handler
 * class GetAccountBalanceHandler implements IQueryHandler<GetAccountBalanceQuery, AccountBalanceResult> {
 *   async execute(query: GetAccountBalanceQuery): Promise<AccountBalanceResult> {
 *     const account = await getAccount(query.accountId);
 *     return {
 *       balance: account.balance,
 *       currency: account.currency
 *     };
 *   }
 * }
 *
 * // Use query bus
 * const queryBus = new QueryBus();
 * queryBus.register('GetAccountBalance', new GetAccountBalanceHandler());
 *
 * // Optional: Add callback for executed queries
 * queryBus.onQueryExecuted((query, result) => {
 *   console.log(`Query ${query.queryName} executed`);
 * });
 *
 * // Optional: Add publisher for monitoring
 * queryBus.addPublisher(async (query) => {
 *   await metrics.recordQuery(query.queryName);
 * });
 *
 * // Execute query
 * const result = await queryBus.execute({
 *   queryName: 'GetAccountBalance',
 *   accountId: 'acc-123'
 * });
 * console.log(`Balance: ${result.balance} ${result.currency}`);
 * ```
 */
export class QueryBus<QueryBase extends IQuery = IQuery> {
	private handlers = new Map<string, IQueryHandler<QueryBase, any>>();
	private publishers: QueryPublisher<QueryBase>[] = [];
	private executedCallback?: QueryExecutedCallback<QueryBase, any>;

	/**
	 * Registers a query handler for a specific query type.
	 *
	 * @param queryName - The query name to handle
	 * @param handler - The query handler instance
	 *
	 * @example
	 * ```typescript
	 * const bus = new QueryBus();
	 * bus.register('GetAccountBalance', new GetAccountBalanceHandler());
	 * bus.register('ListOrders', new ListOrdersHandler());
	 * ```
	 */
	register<TQuery extends QueryBase, TResult = any>(
		queryName: string,
		handler: IQueryHandler<TQuery, TResult>
	): void {
		this.handlers.set(queryName, handler);
	}

	/**
	 * Registers multiple query handlers at once.
	 *
	 * @param handlers - Array of [queryName, handler] tuples
	 *
	 * @example
	 * ```typescript
	 * bus.registerAll([
	 *   ['GetAccountBalance', new GetAccountBalanceHandler()],
	 *   ['ListOrders', new ListOrdersHandler()],
	 *   ['GetOrderDetails', new GetOrderDetailsHandler()]
	 * ]);
	 * ```
	 */
	registerAll(handlers: Array<[string, IQueryHandler<QueryBase, any>]>): void {
		for (const [queryName, handler] of handlers) {
			this.register(queryName, handler);
		}
	}

	/**
	 * Executes a query by routing it to the registered handler and returning the result.
	 *
	 * @param query - The query to execute
	 * @returns Promise resolving to the query result
	 * @throws Error if no handler is registered for the query
	 *
	 * @example
	 * ```typescript
	 * const result = await bus.execute({
	 *   queryName: 'GetAccountBalance',
	 *   accountId: 'acc-123'
	 * });
	 * console.log(`Balance: ${result.balance}`);
	 * ```
	 */
	async execute<TQuery extends QueryBase, TResult = any>(query: TQuery): Promise<TResult> {
		const handler = this.handlers.get(query.queryName);

		if (!handler) {
			throw new Error(
				`No handler registered for query: ${query.queryName}. ` +
				`Available queries: ${Array.from(this.handlers.keys()).join(', ')}`
			);
		}

		// Call publishers before execution
		await Promise.all(
			this.publishers.map(publisher => this.callPublisher(publisher, query))
		);

		const result = await handler.execute(query);

		// Call callback if registered
		if (this.executedCallback) {
			await this.executedCallback(query, result);
		}

		return result;
	}

	/**
	 * Adds a publisher that will be called before each query execution.
	 * Useful for monitoring, logging, or metrics.
	 *
	 * @param publisher - Function to call before query execution
	 *
	 * @example
	 * ```typescript
	 * bus.addPublisher(async (query) => {
	 *   console.log(`Executing query: ${query.queryName}`);
	 *   await metrics.recordQuery(query.queryName);
	 * });
	 * ```
	 */
	addPublisher(publisher: QueryPublisher<QueryBase>): void {
		this.publishers.push(publisher);
	}

	/**
	 * Sets a callback to be invoked after each query execution.
	 * Useful for logging, caching, metrics, etc.
	 *
	 * @param callback - Function to call after query execution
	 *
	 * @example
	 * ```typescript
	 * bus.onQueryExecuted(async (query, result) => {
	 *   console.log(`Query ${query.queryName} returned:`, result);
	 *   await cache.set(query, result);
	 * });
	 * ```
	 */
	onQueryExecuted<TResult = any>(
		callback: QueryExecutedCallback<QueryBase, TResult>
	): void {
		this.executedCallback = callback;
	}

	/**
	 * Checks if a handler is registered for a query name.
	 *
	 * @param queryName - The query name to check
	 * @returns true if handler exists, false otherwise
	 *
	 * @example
	 * ```typescript
	 * if (bus.hasHandler('GetAccountBalance')) {
	 *   const result = await bus.execute(getAccountBalanceQuery);
	 * }
	 * ```
	 */
	hasHandler(queryName: string): boolean {
		return this.handlers.has(queryName);
	}

	/**
	 * Gets all registered query names.
	 *
	 * @returns Array of query names
	 *
	 * @example
	 * ```typescript
	 * const queries = bus.getRegisteredQueries();
	 * console.log('Available queries:', queries);
	 * ```
	 */
	getRegisteredQueries(): string[] {
		return Array.from(this.handlers.keys());
	}

	/**
	 * Internal: Safely calls a publisher, swallowing errors to prevent
	 * publisher failures from blocking query execution.
	 */
	private async callPublisher(publisher: QueryPublisher<QueryBase>, query: QueryBase): Promise<void> {
		try {
			await publisher(query);
		} catch (error) {
			// Swallow error to prevent publisher from breaking query execution
			// Consider logging this in production
		}
	}
}
