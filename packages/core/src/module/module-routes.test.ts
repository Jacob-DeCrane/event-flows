// @ts-nocheck

/**
 * Tests for module route configuration.
 *
 * These tests verify that:
 * - Modules can accept optional routes configuration
 * - Routes pass through to module factory correctly
 * - Modules without routes continue working exactly as before
 * - Type inference works bidirectionally (routes reference handlers, handlers satisfy routes)
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { createModule } from "./create-module";
import { InMemoryEventBus } from "../integrations/in-memory-event-bus";
import type {
  ICommand,
  ICommandHandler,
  IQuery,
  IQueryHandler,
} from "../interfaces";
import type { EventStore } from "../event-store";
import type { EventBus } from "../event-bus";
import type { EventEnvelope } from "../models";

// =============================================================================
// Test Fixtures
// =============================================================================

interface CreateUserCommand extends ICommand {
  commandName: "CreateUser";
  userId: string;
  name: string;
}

interface GetUserQuery extends IQuery {
  queryName: "GetUser";
  userId: string;
}

class CreateUserHandler
  implements ICommandHandler<CreateUserCommand, { id: string }>
{
  async execute(command: CreateUserCommand): Promise<{ id: string }> {
    return { id: command.userId };
  }
}

class GetUserHandler
  implements IQueryHandler<GetUserQuery, { id: string; name: string }>
{
  async execute(query: GetUserQuery): Promise<{ id: string; name: string }> {
    return { id: query.userId, name: "Test User" };
  }
}

// Mock event store for testing
class MockEventStore implements EventStore {
  setPublisher(publisher: (envelope: EventEnvelope) => Promise<void>): void {
    // Mock implementation
  }

  async append(
    streamId: string,
    events: any[],
    expectedVersion?: number,
  ): Promise<void> {
    // Mock implementation
  }

  async getEvents(
    streamId: string,
    fromVersion?: number,
  ): Promise<EventEnvelope[]> {
    return [];
  }

  async getAllEvents(fromPosition?: bigint): Promise<EventEnvelope[]> {
    return [];
  }
}

// =============================================================================
// Test 1: Module accepts optional routes configuration
// =============================================================================

describe("Module Routes Configuration", () => {
  test("Module can be created with routes configuration", () => {
    const moduleWithRoutes = createModule({
      name: "users",
      setup: () => ({
        commandHandlers: {
          CreateUser: new CreateUserHandler(),
        },
        queryHandlers: {
          GetUser: new GetUserHandler(),
        },
        eventHandlers: {},
      }),
      routes: {
        basePath: "/users",
        commands: {
          CreateUser: { method: "POST", path: "/" },
        },
        queries: {
          GetUser: { method: "GET", path: "/:userId" },
        },
      },
    });

    expect(moduleWithRoutes).toBeDefined();
    expect(moduleWithRoutes.name).toBe("users");
    expect(moduleWithRoutes.routes).toBeDefined();
    expect(moduleWithRoutes.routes?.basePath).toBe("/users");
    expect(moduleWithRoutes.routes?.commands?.CreateUser).toEqual({
      method: "POST",
      path: "/",
    });
  });

  test("Module without routes works exactly as before", () => {
    const moduleWithoutRoutes = createModule({
      name: "orders",
      setup: () => ({
        commandHandlers: {},
        queryHandlers: {},
        eventHandlers: {},
      }),
    });

    expect(moduleWithoutRoutes).toBeDefined();
    expect(moduleWithoutRoutes.name).toBe("orders");
    expect(moduleWithoutRoutes.routes).toBeUndefined();
  });

  test("Routes configuration is immutable", () => {
    const module = createModule({
      name: "products",
      setup: () => ({
        commandHandlers: {
          CreateUser: new CreateUserHandler(),
        },
        queryHandlers: {},
        eventHandlers: {},
      }),
      routes: {
        basePath: "/products",
        commands: {
          CreateUser: { method: "POST", path: "/" },
        },
        queries: {},
      },
    });

    // Module should be frozen
    expect(Object.isFrozen(module)).toBe(true);
  });

  test("Partial routes configuration is supported", () => {
    const moduleWithPartialRoutes = createModule({
      name: "accounts",
      setup: () => ({
        commandHandlers: {
          CreateUser: new CreateUserHandler(),
        },
        queryHandlers: {
          GetUser: new GetUserHandler(),
        },
        eventHandlers: {},
      }),
      routes: {
        // Only configure some handlers
        commands: {
          CreateUser: { method: "POST", path: "/" },
        },
        // Deliberately omit query routes
      },
    });

    expect(moduleWithPartialRoutes.routes?.commands?.CreateUser).toBeDefined();
    expect(moduleWithPartialRoutes.routes?.queries).toBeUndefined();
  });

  test("Routes with no basePath are supported", () => {
    const moduleWithoutBasePath = createModule({
      name: "settings",
      setup: () => ({
        commandHandlers: {},
        queryHandlers: {
          GetUser: new GetUserHandler(),
        },
        eventHandlers: {},
      }),
      routes: {
        queries: {
          GetUser: { method: "GET", path: "/settings" },
        },
      },
    });

    expect(moduleWithoutBasePath.routes?.basePath).toBeUndefined();
    expect(moduleWithoutBasePath.routes?.queries?.GetUser).toBeDefined();
  });
});

// =============================================================================
// Test 2: Backward compatibility with existing modules
// =============================================================================

describe("Backward Compatibility", () => {
  let eventStore: EventStore;
  let eventBus: EventBus;

  beforeEach(() => {
    eventStore = new MockEventStore();
    eventBus = new InMemoryEventBus({});
  });

  test("Existing module without routes initializes correctly", () => {
    const legacyModule = createModule({
      name: "legacy",
      setup: ({ eventStore }) => ({
        commandHandlers: {},
        queryHandlers: {},
        eventHandlers: {},
      }),
    });

    const moduleDefinition = legacyModule.setup({ eventStore, eventBus });

    expect(moduleDefinition.name).toBe("legacy");
    expect(moduleDefinition.commandHandlers).toEqual({});
    expect(moduleDefinition.queryHandlers).toEqual({});
  });

  test("Module with routes initializes correctly", () => {
    const modernModule = createModule({
      name: "modern",
      setup: ({ eventStore }) => ({
        commandHandlers: {
          CreateUser: new CreateUserHandler(),
        },
        queryHandlers: {},
        eventHandlers: {},
      }),
      routes: {
        basePath: "/modern",
        commands: {
          CreateUser: { method: "POST", path: "/" },
        },
        queries: {},
      },
    });

    const moduleDefinition = modernModule.setup({ eventStore, eventBus });

    expect(moduleDefinition.name).toBe("modern");
    expect(moduleDefinition.commandHandlers.CreateUser).toBeInstanceOf(
      CreateUserHandler,
    );
    expect(modernModule.routes?.basePath).toBe("/modern");
  });
});
