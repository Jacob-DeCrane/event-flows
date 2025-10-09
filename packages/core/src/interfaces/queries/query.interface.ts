/**
 * Base interface for all queries in CQRS pattern.
 *
 * Queries represent read operations that fetch data from the system without
 * modifying state. They are part of the Query side of CQRS (Command Query
 * Responsibility Segregation).
 *
 * Key characteristics:
 * - Read-only: Do not modify system state
 * - Return data: Always return a result
 * - Named descriptively: Use noun phrases (e.g., 'GetAccount', 'ListOrders')
 *
 * @example
 * ```typescript
 * // Define a specific query type
 * interface GetAccountBalanceQuery extends IQuery {
 *   queryName: 'GetAccountBalance';
 *   accountId: string;
 * }
 *
 * const query: GetAccountBalanceQuery = {
 *   queryName: 'GetAccountBalance',
 *   accountId: 'acc-123'
 * };
 * ```
 *
 * @example
 * ```typescript
 * // List query with pagination
 * interface ListOrdersQuery extends IQuery {
 *   queryName: 'ListOrders';
 *   customerId: string;
 *   limit: number;
 *   offset: number;
 * }
 * ```
 */
export interface IQuery {
	/**
	 * Query name identifier (should be unique).
	 * Convention: Use PascalCase noun phrases (e.g., 'GetAccount', 'ListOrders')
	 */
	queryName: string;
}
