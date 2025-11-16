import { describe, it, expect } from 'bun:test';
import { InMemoryEventBus } from './index';
import { EventEnvelope } from '@eventflows/core';

describe('@eventflows/integrations', () => {
  describe('InMemoryEventBus re-export', () => {
    it('should successfully re-export InMemoryEventBus from @eventflows/core', () => {
      const eventBus = new InMemoryEventBus({ debug: false });
      expect(eventBus).toBeDefined();
      expect(eventBus).toBeInstanceOf(InMemoryEventBus);
    });

    it('should allow subscribing and publishing events', async () => {
      const eventBus = new InMemoryEventBus({ debug: false });
      let receivedEvent: EventEnvelope | null = null;

      // Subscribe to event
      const unsubscribe = eventBus.subscribe('TestEvent', async (envelope) => {
        receivedEvent = envelope;
      });

      // Create and publish event
      const testEvent = EventEnvelope.create(
        'TestEvent',
        { message: 'Hello from integrations package' },
        {
          aggregateId: 'test-123',
          version: 1,
        }
      );

      await eventBus.publish(testEvent);

      // Verify event was received
      expect(receivedEvent).toBeDefined();
      expect(receivedEvent!.event).toBe('TestEvent');
      expect(receivedEvent!.payload).toEqual({ message: 'Hello from integrations package' });

      // Clean up
      unsubscribe();
    });

    it('should support all InMemoryEventBus methods', async () => {
      const eventBus = new InMemoryEventBus({ debug: false });

      // Test subscribe
      const unsubscribe1 = eventBus.subscribe('Event1', async () => { });
      expect(eventBus.getSubscriberCount('Event1')).toBe(1);

      // Test subscribeAll
      const unsubscribe2 = eventBus.subscribeAll(async () => { });

      // Test subscribeToMany
      const unsubscribe3 = eventBus.subscribeToMany(['Event2', 'Event3'], async () => { });
      expect(eventBus.getSubscriberCount('Event2')).toBe(1);
      expect(eventBus.getSubscriberCount('Event3')).toBe(1);

      // Test getRegisteredEvents
      const events = eventBus.getRegisteredEvents();
      expect(events).toContain('Event1');
      expect(events).toContain('Event2');
      expect(events).toContain('Event3');

      // Test clear
      eventBus.clear();
      expect(eventBus.getSubscriberCount('Event1')).toBe(0);
      expect(eventBus.getRegisteredEvents()).toHaveLength(0);

      // Clean up
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    });
  });
});
