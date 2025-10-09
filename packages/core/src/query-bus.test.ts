import { describe, test, expect, beforeEach } from 'bun:test';
import { QueryBus } from './query-bus';
import type { IQuery, IQueryHandler } from './interfaces';

// Test queries
interface GetAccountBalanceQuery extends IQuery {
	queryName: 'GetAccountBalance';
	accountId: string;
}

interface ListOrdersQuery extends IQuery {
	queryName: 'ListOrders';
	customerId: string;
	limit: number;
}

interface GetOrderDetailsQuery extends IQuery {
	queryName: 'GetOrderDetails';
	orderId: string;
}

// Test result types
interface AccountBalanceResult {
	balance: number;
	currency: string;
}

interface OrdersListResult {
	orders: Array<{ id: string; total: number }>;
	hasMore: boolean;
}

// Test query handlers
class GetAccountBalanceHandler implements IQueryHandler<GetAccountBalanceQuery, AccountBalanceResult> {
	async execute(query: GetAccountBalanceQuery): Promise<AccountBalanceResult> {
		// Simulate fetching account data
		return {
			balance: 1000 + query.accountId.length, // Simple mock logic
			currency: 'USD'
		};
	}
}

class ListOrdersHandler implements IQueryHandler<ListOrdersQuery, OrdersListResult> {
	async execute(query: ListOrdersQuery): Promise<OrdersListResult> {
		// Simulate listing orders
		const orders = Array.from({ length: query.limit }, (_, i) => ({
			id: `order-${i}`,
			total: (i + 1) * 100
		}));
		return {
			orders,
			hasMore: true
		};
	}
}

class GetOrderDetailsHandler implements IQueryHandler<GetOrderDetailsQuery, { id: string; status: string }> {
	async execute(query: GetOrderDetailsQuery): Promise<{ id: string; status: string }> {
		return {
			id: query.orderId,
			status: 'shipped'
		};
	}
}

describe('QueryBus', () => {
	let queryBus: QueryBus;

	beforeEach(() => {
		queryBus = new QueryBus();
	});

	test('registers and executes a query handler', async () => {
		const handler = new GetAccountBalanceHandler();
		queryBus.register('GetAccountBalance', handler);

		const query: GetAccountBalanceQuery = {
			queryName: 'GetAccountBalance',
			accountId: 'acc-123'
		};

		const result = await queryBus.execute(query);
		expect(result.balance).toBe(1007); // 1000 + 'acc-123'.length
		expect(result.currency).toBe('USD');
	});

	test('registers multiple handlers', () => {
		queryBus.register('GetAccountBalance', new GetAccountBalanceHandler());
		queryBus.register('ListOrders', new ListOrdersHandler());

		expect(queryBus.hasHandler('GetAccountBalance')).toBe(true);
		expect(queryBus.hasHandler('ListOrders')).toBe(true);
		expect(queryBus.hasHandler('NonExistent')).toBe(false);
	});

	test('registerAll registers multiple handlers at once', () => {
		queryBus.registerAll([
			['GetAccountBalance', new GetAccountBalanceHandler()],
			['ListOrders', new ListOrdersHandler()],
			['GetOrderDetails', new GetOrderDetailsHandler()]
		]);

		const queries = queryBus.getRegisteredQueries();
		expect(queries).toHaveLength(3);
		expect(queries).toContain('GetAccountBalance');
		expect(queries).toContain('ListOrders');
		expect(queries).toContain('GetOrderDetails');
	});

	test('executes query and returns correct result type', async () => {
		queryBus.register('ListOrders', new ListOrdersHandler());

		const query: ListOrdersQuery = {
			queryName: 'ListOrders',
			customerId: 'cust-456',
			limit: 3
		};

		const result = await queryBus.execute(query);
		expect(result.orders).toHaveLength(3);
		expect(result.orders[0].id).toBe('order-0');
		expect(result.orders[0].total).toBe(100);
		expect(result.hasMore).toBe(true);
	});

	test('throws error when handler not found', async () => {
		const query: GetAccountBalanceQuery = {
			queryName: 'GetAccountBalance',
			accountId: 'acc-123'
		};

		expect(queryBus.execute(query)).rejects.toThrow(
			'No handler registered for query: GetAccountBalance'
		);
	});

	test('error message includes available queries', async () => {
		queryBus.register('ListOrders', new ListOrdersHandler());

		const query: GetAccountBalanceQuery = {
			queryName: 'GetAccountBalance',
			accountId: 'acc-123'
		};

		expect(queryBus.execute(query)).rejects.toThrow('Available queries: ListOrders');
	});

	test('onQueryExecuted callback is called after execution', async () => {
		const executedQueries: IQuery[] = [];
		const executedResults: any[] = [];

		queryBus.onQueryExecuted((query, result) => {
			executedQueries.push(query);
			executedResults.push(result);
		});

		queryBus.register('GetAccountBalance', new GetAccountBalanceHandler());

		const query: GetAccountBalanceQuery = {
			queryName: 'GetAccountBalance',
			accountId: 'acc-123'
		};

		await queryBus.execute(query);

		expect(executedQueries).toHaveLength(1);
		expect(executedQueries[0]).toEqual(query);
		expect(executedResults[0].balance).toBe(1007);
		expect(executedResults[0].currency).toBe('USD');
	});

	test('onQueryExecuted callback supports async operations', async () => {
		let callbackExecuted = false;

		queryBus.onQueryExecuted(async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
			callbackExecuted = true;
		});

		queryBus.register('GetAccountBalance', new GetAccountBalanceHandler());

		await queryBus.execute({
			queryName: 'GetAccountBalance',
			accountId: 'acc-123'
		});

		expect(callbackExecuted).toBe(true);
	});

	test('addPublisher calls publisher before execution', async () => {
		const publishedQueries: IQuery[] = [];

		queryBus.addPublisher((query) => {
			publishedQueries.push(query);
		});

		queryBus.register('GetAccountBalance', new GetAccountBalanceHandler());

		const query: GetAccountBalanceQuery = {
			queryName: 'GetAccountBalance',
			accountId: 'acc-123'
		};

		await queryBus.execute(query);

		expect(publishedQueries).toHaveLength(1);
		expect(publishedQueries[0]).toEqual(query);
	});

	test('multiple publishers are called', async () => {
		const publisher1Queries: IQuery[] = [];
		const publisher2Queries: IQuery[] = [];

		queryBus.addPublisher((query) => {
			publisher1Queries.push(query);
		});

		queryBus.addPublisher((query) => {
			publisher2Queries.push(query);
		});

		queryBus.register('GetAccountBalance', new GetAccountBalanceHandler());

		const query: GetAccountBalanceQuery = {
			queryName: 'GetAccountBalance',
			accountId: 'acc-123'
		};

		await queryBus.execute(query);

		expect(publisher1Queries).toHaveLength(1);
		expect(publisher2Queries).toHaveLength(1);
	});

	test('publisher error does not break query execution', async () => {
		queryBus.addPublisher(() => {
			throw new Error('Publisher failed');
		});

		queryBus.register('GetAccountBalance', new GetAccountBalanceHandler());

		const query: GetAccountBalanceQuery = {
			queryName: 'GetAccountBalance',
			accountId: 'acc-123'
		};

		// Should not throw despite publisher error
		const result = await queryBus.execute(query);
		expect(result.balance).toBe(1007);
	});

	test('hasHandler checks for registered handlers', () => {
		expect(queryBus.hasHandler('GetAccountBalance')).toBe(false);

		queryBus.register('GetAccountBalance', new GetAccountBalanceHandler());

		expect(queryBus.hasHandler('GetAccountBalance')).toBe(true);
	});

	test('getRegisteredQueries returns all query names', () => {
		expect(queryBus.getRegisteredQueries()).toEqual([]);

		queryBus.register('GetAccountBalance', new GetAccountBalanceHandler());
		queryBus.register('ListOrders', new ListOrdersHandler());

		const queries = queryBus.getRegisteredQueries();
		expect(queries).toHaveLength(2);
		expect(queries).toContain('GetAccountBalance');
		expect(queries).toContain('ListOrders');
	});

	test('handles multiple executions of same query', async () => {
		const handler = new GetAccountBalanceHandler();
		queryBus.register('GetAccountBalance', handler);

		const result1 = await queryBus.execute({
			queryName: 'GetAccountBalance',
			accountId: 'acc-1'
		});

		const result2 = await queryBus.execute({
			queryName: 'GetAccountBalance',
			accountId: 'acc-22'
		});

		expect(result1.balance).toBe(1005); // 1000 + 5
		expect(result2.balance).toBe(1006); // 1000 + 6
	});

	test('callback receives correct query and result for each execution', async () => {
		const executions: Array<{ query: IQuery; result: any }> = [];

		queryBus.onQueryExecuted((query, result) => {
			executions.push({ query, result });
		});

		queryBus.register('GetAccountBalance', new GetAccountBalanceHandler());
		queryBus.register('ListOrders', new ListOrdersHandler());

		await queryBus.execute({
			queryName: 'GetAccountBalance',
			accountId: 'acc-123'
		});

		await queryBus.execute({
			queryName: 'ListOrders',
			customerId: 'cust-456',
			limit: 2
		});

		expect(executions).toHaveLength(2);
		expect(executions[0].query.queryName).toBe('GetAccountBalance');
		expect(executions[0].result.balance).toBe(1007);
		expect(executions[1].query.queryName).toBe('ListOrders');
		expect(executions[1].result.orders).toHaveLength(2);
	});

	test('supports async publishers', async () => {
		let publisherCalled = false;

		queryBus.addPublisher(async (query) => {
			await new Promise(resolve => setTimeout(resolve, 10));
			publisherCalled = true;
		});

		queryBus.register('GetAccountBalance', new GetAccountBalanceHandler());

		await queryBus.execute({
			queryName: 'GetAccountBalance',
			accountId: 'acc-123'
		});

		expect(publisherCalled).toBe(true);
	});
});
