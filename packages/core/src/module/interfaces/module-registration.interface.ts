import type {
	CommandHandlerRegistration,
	QueryHandlerRegistration,
	ProjectionRegistration,
	EventHandlerRegistration
} from './handler-registrations.interface';

/**
 * Registration returned by a module's register function.
 *
 * Contains all the handlers, projections, and event handlers that the module
 * provides. These are used by EventFlowsBuilder to wire up the application.
 *
 * @example
 * ```typescript
 * const registration: ModuleRegistration = {
 *   commandHandlers: [
 *     { commandName: 'CreateOrder', handler: createOrderHandler },
 *     { commandName: 'CancelOrder', handler: cancelOrderHandler }
 *   ],
 *   queryHandlers: [
 *     { queryName: 'GetOrderById', handler: getOrderByIdHandler }
 *   ],
 *   projections: [
 *     {
 *       name: 'OrderSummary',
 *       handlers: {
 *         OrderCreated: updateOnCreated,
 *         OrderCancelled: updateOnCancelled
 *       },
 *       retry: { maxAttempts: 3 }
 *     }
 *   ],
 *   eventHandlers: [
 *     { eventType: 'PaymentReceived', handler: handlePayment, fromContext: 'payments' }
 *   ]
 * };
 * ```
 */
export interface ModuleRegistration {
	/**
	 * Command handlers to register on the command bus.
	 * Each handler processes a specific command type.
	 */
	commandHandlers: CommandHandlerRegistration[];

	/**
	 * Query handlers to register on the query bus.
	 * Each handler responds to a specific query type.
	 */
	queryHandlers: QueryHandlerRegistration[];

	/**
	 * Projections to subscribe to the event bus.
	 * Each projection maintains a read model updated by events.
	 */
	projections: ProjectionRegistration[];

	/**
	 * Optional cross-context event handlers.
	 * Used for reacting to events from other bounded contexts.
	 */
	eventHandlers?: EventHandlerRegistration[];
}