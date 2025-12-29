// @ts-nocheck - Complex integration test with mock implementations
/**
 * Integration tests for the EventFlows Module System.
 *
 * These tests verify end-to-end workflows that span multiple components:
 * - Command execution through event store to event bus to event handlers
 * - Cross-module event communication
 * - Error propagation from handlers
 * - Edge cases for module composition
 *
 * These complement the unit tests in types.test.ts, create-module.test.ts,
 * and create-app.test.ts by testing the complete integrated system.
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { createEventFlowsApp } from './create-app';
import { createModule } from './create-module';
import { InMemoryEventBus } from '../integrations/in-memory-event-bus';
import type { ICommand, ICommandHandler, IQuery, IQueryHandler, EventHandler } from '../interfaces';
import type { EventStore } from '../event-store';
import type { EventEnvelope } from '../models';

// =============================================================================
// Test Fixtures
// =============================================================================

interface CreateOrderCommand extends ICommand {
	commandName: 'CreateOrder';
	orderId: string;
	userId: string;
	amount: number;
}

interface GetOrderStatusQuery extends IQuery {
	queryName: 'GetOrderStatus';
	orderId: string;
}

interface ProcessPaymentCommand extends ICommand {
	commandName: 'ProcessPayment';
	orderId: string;
	amount: number;
}

// Command handler that uses eventStore to append events
class CreateOrderHandler implements ICommandHandler<CreateOrderCommand, { orderId: string }> {
	constructor(private readonly eventStore: EventStore) {}

	async execute(command: CreateOrderCommand): Promise<{ orderId: string }> {
		// Simulate appending an event (the mock eventStore will call the publisher)
		await this.eventStore.appendEvents('orders', command.orderId, [
			{
				event: 'OrderCreated',
				payload: {
					orderId: command.orderId,
					userId: command.userId,
					amount: command.amount,
				},
			},
		]);
		return { orderId: command.orderId };
	}
}

class GetOrderStatusHandler implements IQueryHandler<GetOrderStatusQuery, { status: string }> {
	async execute(): Promise<{ status: string }> {
		return { status: 'pending' };
	}
}

class ProcessPaymentHandler implements ICommandHandler<ProcessPaymentCommand, void> {
	async execute(): Promise<void> {
		// Payment processing logic
	}
}

// Handler that throws an error
class FailingCommandHandler implements ICommandHandler<CreateOrderCommand, void> {
	async execute(): Promise<void> {
		throw new Error('Command handler failed intentionally');
	}
}

class FailingQueryHandler implements IQueryHandler<GetOrderStatusQuery, { status: string }> {
	async execute(): Promise<{ status: string }> {
		throw new Error('Query handler failed intentionally');
	}
}

// =============================================================================
// Mock EventStore that actually calls the publisher when events are appended
// =============================================================================

interface MockEventStoreWithPublisher extends EventStore {
	_triggerPublish: (envelope: EventEnvelope) => Promise<void>;
}

function createMockEventStoreWithPublisher(): MockEventStoreWithPublisher {
	let publisherFn: ((envelope: EventEnvelope) => void | Promise<void>) | undefined;

	return {
		setPublisher: (fn: (envelope: EventEnvelope) => void | Promise<void>) => {
			publisherFn = fn;
		},
		// Method to trigger the publisher (simulating what happens when events are appended)
		_triggerPublish: async (envelope: EventEnvelope) => {
			if (publisherFn) {
				await publisherFn(envelope);
			}
		},
		// appendEvents that calls the publisher for each event
		appendEvents: async (_collection, aggregateId, events) => {
			const envelopes: EventEnvelope[] = [];
			for (const event of events) {
				const envelope = {
					id: `evt-${Date.now()}-${Math.random()}`,
					event: event.event,
					payload: event.payload,
					aggregateId,
					version: 1,
					timestamp: new Date().toISOString(),
				} as EventEnvelope;
				envelopes.push(envelope);
				if (publisherFn) {
					await publisherFn(envelope);
				}
			}
			return envelopes;
		},
		// Minimal implementation for interface compliance
		connect: async () => {},
		disconnect: async () => {},
		ensureCollection: async () => 'test-collection',
		listCollections: async function* () {},
		getEvent: async () => ({ type: 'test', payload: {} }),
		getEvents: async function* () {},
		getAllEnvelopes: async function* () {},
	} as unknown as MockEventStoreWithPublisher;
}

// =============================================================================
// Integration Tests
// =============================================================================

describe('Module System Integration Tests', () => {
	let eventBus: InMemoryEventBus;
	let eventStore: MockEventStoreWithPublisher;

	beforeEach(() => {
		eventBus = new InMemoryEventBus({});
		eventStore = createMockEventStoreWithPublisher();
	});

	// =========================================================================
	// Test 1: End-to-end command triggers event which triggers event handler
	// =========================================================================

	test('command execution triggers event handler through event store wiring', async () => {
		const eventHandlerCalled = mock((_envelope: EventEnvelope) => {});

		const orderCreatedHandler: EventHandler = (envelope) => {
			eventHandlerCalled(envelope);
		};

		const ordersModule = createModule({
			name: 'orders',
			setup: ({ eventStore }) => ({
				commandHandlers: {
					CreateOrder: new CreateOrderHandler(eventStore),
				},
				eventHandlers: {
					OrderCreated: [orderCreatedHandler],
				},
			}),
		});

		const app = createEventFlowsApp({
			eventStore,
			eventBus,
			modules: [ordersModule] as const,
		});

		// Execute command - this should:
		// 1. Call CreateOrderHandler.execute()
		// 2. Handler appends OrderCreated event to eventStore
		// 3. eventStore calls publisher (wired to eventBus.publish)
		// 4. eventBus publishes to OrderCreated subscribers
		// 5. orderCreatedHandler is called

		const result = await app.commands.CreateOrder({
			orderId: 'order-123',
			userId: 'user-456',
			amount: 99.99,
		});

		expect(result).toEqual({ orderId: 'order-123' });
		expect(eventHandlerCalled).toHaveBeenCalledTimes(1);

		const calledEnvelope = eventHandlerCalled.mock.calls[0][0] as EventEnvelope;
		expect(calledEnvelope.event).toBe('OrderCreated');
		expect(calledEnvelope.payload.orderId).toBe('order-123');
		expect(calledEnvelope.payload.userId).toBe('user-456');
		expect(calledEnvelope.payload.amount).toBe(99.99);
	});

	// =========================================================================
	// Test 2: Multi-module app with cross-module event handling
	// =========================================================================

	test('cross-module event handling: module A publishes, module B handles', async () => {
		const paymentInitiated = mock((_orderId: string, _amount: number) => {});

		// Orders module publishes OrderCreated events
		const ordersModule = createModule({
			name: 'orders',
			setup: ({ eventStore }) => ({
				commandHandlers: {
					CreateOrder: new CreateOrderHandler(eventStore),
				},
			}),
		});

		// Payments module listens for OrderCreated events from Orders module
		const paymentsModule = createModule({
			name: 'payments',
			setup: () => ({
				commandHandlers: {
					ProcessPayment: new ProcessPaymentHandler(),
				},
				eventHandlers: {
					// Cross-module: Payments handles OrderCreated from Orders
					OrderCreated: [
						(envelope: EventEnvelope) => {
							paymentInitiated(
								envelope.payload.orderId as string,
								envelope.payload.amount as number
							);
						},
					],
				},
			}),
		});

		const app = createEventFlowsApp({
			eventStore,
			eventBus,
			modules: [ordersModule, paymentsModule] as const,
		});

		// Execute command in Orders module
		await app.commands.CreateOrder({
			orderId: 'order-789',
			userId: 'user-123',
			amount: 149.99,
		});

		// Verify Payments module received the event
		expect(paymentInitiated).toHaveBeenCalledTimes(1);
		expect(paymentInitiated).toHaveBeenCalledWith('order-789', 149.99);
	});

	// =========================================================================
	// Test 3: Command handler error propagation
	// =========================================================================

	test('command handler errors propagate to caller', async () => {
		const ordersModule = createModule({
			name: 'orders',
			setup: () => ({
				commandHandlers: {
					CreateOrder: new FailingCommandHandler(),
				},
			}),
		});

		const app = createEventFlowsApp({
			eventStore,
			eventBus,
			modules: [ordersModule] as const,
		});

		await expect(
			app.commands.CreateOrder({
				orderId: 'order-fail',
				userId: 'user-fail',
				amount: 0,
			})
		).rejects.toThrow('Command handler failed intentionally');
	});

	// =========================================================================
	// Test 4: Query handler error propagation
	// =========================================================================

	test('query handler errors propagate to caller', async () => {
		const ordersModule = createModule({
			name: 'orders',
			setup: () => ({
				queryHandlers: {
					GetOrderStatus: new FailingQueryHandler(),
				},
			}),
		});

		const app = createEventFlowsApp({
			eventStore,
			eventBus,
			modules: [ordersModule] as const,
		});

		await expect(app.queries.GetOrderStatus({ orderId: 'order-fail' })).rejects.toThrow(
			'Query handler failed intentionally'
		);
	});

	// =========================================================================
	// Test 5: Empty modules array creates valid app with empty executor APIs
	// =========================================================================

	test('empty modules array creates app with no command/query executors', () => {
		const app = createEventFlowsApp({
			eventStore,
			eventBus,
			modules: [] as const,
		});

		expect(app).toBeDefined();
		expect(app.commands).toEqual({});
		expect(app.queries).toEqual({});
		expect(app.commandBus).toBeDefined();
		expect(app.queryBus).toBeDefined();
		expect(app.eventBus).toBe(eventBus);
		expect(app.eventStore).toBe(eventStore);
	});

	// =========================================================================
	// Test 6: Multiple event handlers for same event are all called
	// =========================================================================

	test('multiple event handlers for same event are all invoked', async () => {
		const handler1Called = mock(() => {});
		const handler2Called = mock(() => {});
		const handler3Called = mock(() => {});

		const ordersModule = createModule({
			name: 'orders',
			setup: ({ eventStore }) => ({
				commandHandlers: {
					CreateOrder: new CreateOrderHandler(eventStore),
				},
				eventHandlers: {
					OrderCreated: [
						() => handler1Called(),
						() => handler2Called(),
					],
				},
			}),
		});

		// Separate module also subscribes to OrderCreated
		const analyticsModule = createModule({
			name: 'analytics',
			setup: () => ({
				eventHandlers: {
					OrderCreated: [() => handler3Called()],
				},
			}),
		});

		const app = createEventFlowsApp({
			eventStore,
			eventBus,
			modules: [ordersModule, analyticsModule] as const,
		});

		await app.commands.CreateOrder({
			orderId: 'order-multi',
			userId: 'user-multi',
			amount: 50.0,
		});

		// All three handlers should be called
		expect(handler1Called).toHaveBeenCalledTimes(1);
		expect(handler2Called).toHaveBeenCalledTimes(1);
		expect(handler3Called).toHaveBeenCalledTimes(1);
	});

	// =========================================================================
	// Test 7: Event handler errors are swallowed (don't break other handlers)
	// =========================================================================

	test('event handler errors are swallowed and do not break other handlers', async () => {
		const successfulHandlerCalled = mock(() => {});
		const errorReported = mock((_error: Error, _envelope: EventEnvelope) => {});

		// Set error handler on event bus
		eventBus.setErrorHandler((error, envelope) => {
			errorReported(error, envelope);
		});

		const ordersModule = createModule({
			name: 'orders',
			setup: ({ eventStore }) => ({
				commandHandlers: {
					CreateOrder: new CreateOrderHandler(eventStore),
				},
				eventHandlers: {
					OrderCreated: [
						// First handler throws
						() => {
							throw new Error('Event handler failed');
						},
						// Second handler should still run
						() => successfulHandlerCalled(),
					],
				},
			}),
		});

		const app = createEventFlowsApp({
			eventStore,
			eventBus,
			modules: [ordersModule] as const,
		});

		// Command should complete successfully despite event handler error
		const result = await app.commands.CreateOrder({
			orderId: 'order-err',
			userId: 'user-err',
			amount: 25.0,
		});

		expect(result).toEqual({ orderId: 'order-err' });

		// Error handler should have been called
		expect(errorReported).toHaveBeenCalledTimes(1);
		expect((errorReported.mock.calls[0][0] as Error).message).toBe('Event handler failed');

		// Second handler should still have been called
		expect(successfulHandlerCalled).toHaveBeenCalledTimes(1);
	});

	// =========================================================================
	// Test 8: Single handler module works correctly
	// =========================================================================

	test('single handler module registers and executes correctly', async () => {
		const minimalModule = createModule({
			name: 'minimal',
			setup: () => ({
				queryHandlers: {
					GetOrderStatus: new GetOrderStatusHandler(),
				},
			}),
		});

		const app = createEventFlowsApp({
			eventStore,
			eventBus,
			modules: [minimalModule] as const,
		});

		// Commands should be empty since no command handlers
		expect(Object.keys(app.commands)).toHaveLength(0);

		// Query should work
		const result = await app.queries.GetOrderStatus({ orderId: 'order-status' });
		expect(result).toEqual({ status: 'pending' });
	});
});
