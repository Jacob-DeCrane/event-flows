import type { EventStore } from '../../event-store';
import type { IEventBus } from '../../interfaces';

/**
 * Context provided to modules during registration.
 *
 * Contains the infrastructure components that modules need to set up
 * their handlers, repositories, and projections.
 *
 * @example
 * ```typescript
 * const module: EventFlowsModule = {
 *   name: 'orders',
 *   register: (context: ModuleContext) => {
 *     // Use context.eventStore to create repositories
 *     const orderRepository = new OrderRepository(context.eventStore);
 *
 *     // Use context.eventBus for cross-module subscriptions
 *     context.eventBus.subscribe('PaymentReceived', handlePayment);
 *
 *     return { ... };
 *   }
 * };
 * ```
 */
export interface ModuleContext {
	/**
	 * The configured event store instance.
	 * Use this to create aggregate repositories that can load and save events.
	 */
	eventStore: EventStore;

	/**
	 * The configured event bus instance.
	 * Use this for advanced scenarios like direct subscriptions or custom publishing.
	 */
	eventBus: IEventBus;
}
