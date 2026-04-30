// @ts-nocheck

/**
 * Tests for app-level route metadata collection.
 *
 * These tests verify that:
 * - EventFlowsApp exposes moduleRoutes array
 * - Route metadata collected from all modules during app creation
 * - Modules without routes excluded from metadata array
 * - Metadata structure matches ModuleRouteMetadata interface
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { createEventFlowsApp } from "./create-app";
import { createModule } from "./create-module";
import { InMemoryEventBus } from "../integrations/in-memory-event-bus";
import type {
  ICommand,
  ICommandHandler,
  IQuery,
  IQueryHandler,
} from "../interfaces";
import type { EventStore } from "../event-store";
import type { EventEnvelope } from "../models";

// =============================================================================
// Test Fixtures
// =============================================================================

interface CreateUserCommand extends ICommand {
  commandName: "CreateUser";
  userId: string;
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
    return { id: query.userId, name: "Test" };
  }
}

class MockEventStore implements EventStore {
  setPublisher(publisher: (envelope: EventEnvelope) => Promise<void>): void {}
  async append(
    streamId: string,
    events: any[],
    expectedVersion?: number,
  ): Promise<void> {}
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
// Test 1: App collects route metadata from modules
// =============================================================================

describe("App-Level Route Metadata Collection", () => {
  let eventStore: EventStore;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    eventStore = new MockEventStore();
    eventBus = new InMemoryEventBus({});
  });

  test("App collects route metadata from module with routes", () => {
    const userModule = createModule({
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

    const app = createEventFlowsApp({
      eventStore,
      eventBus,
      modules: [userModule] as const,
    });

    expect(app.moduleRoutes).toBeDefined();
    expect(app.moduleRoutes).toBeArrayOfSize(1);
    expect(app.moduleRoutes[0]).toEqual({
      moduleName: "users",
      basePath: "/users",
      commands: {
        CreateUser: { method: "POST", path: "/" },
      },
      queries: {
        GetUser: { method: "GET", path: "/:userId" },
      },
    });
  });

  test("App excludes modules without routes from metadata", () => {
    const moduleWithoutRoutes = createModule({
      name: "orders",
      setup: () => ({
        commandHandlers: {},
        queryHandlers: {},
        eventHandlers: {},
      }),
    });

    const app = createEventFlowsApp({
      eventStore,
      eventBus,
      modules: [moduleWithoutRoutes] as const,
    });

    expect(app.moduleRoutes).toBeDefined();
    expect(app.moduleRoutes).toBeArrayOfSize(0);
  });

  test("App collects metadata from multiple modules with routes", () => {
    const userModule = createModule({
      name: "users",
      setup: () => ({
        commandHandlers: {
          CreateUser: new CreateUserHandler(),
        },
        queryHandlers: {},
        eventHandlers: {},
      }),
      routes: {
        basePath: "/users",
        commands: {
          CreateUser: { method: "POST", path: "/" },
        },
      },
    });

    const productModule = createModule({
      name: "products",
      setup: () => ({
        commandHandlers: {},
        queryHandlers: {
          GetUser: new GetUserHandler(),
        },
        eventHandlers: {},
      }),
      routes: {
        basePath: "/products",
        queries: {
          GetUser: { method: "GET", path: "/:productId" },
        },
      },
    });

    const app = createEventFlowsApp({
      eventStore,
      eventBus,
      modules: [userModule, productModule] as const,
    });

    expect(app.moduleRoutes).toBeArrayOfSize(2);
    expect(app.moduleRoutes[0].moduleName).toBe("users");
    expect(app.moduleRoutes[1].moduleName).toBe("products");
  });

  test("App handles mix of modules with and without routes", () => {
    const moduleWithRoutes = createModule({
      name: "users",
      setup: () => ({
        commandHandlers: {
          CreateUser: new CreateUserHandler(),
        },
        queryHandlers: {},
        eventHandlers: {},
      }),
      routes: {
        commands: {
          CreateUser: { method: "POST", path: "/users" },
        },
      },
    });

    const moduleWithoutRoutes1 = createModule({
      name: "orders",
      setup: () => ({
        commandHandlers: {},
        queryHandlers: {},
        eventHandlers: {},
      }),
    });

    const moduleWithoutRoutes2 = createModule({
      name: "products",
      setup: () => ({
        commandHandlers: {},
        queryHandlers: {},
        eventHandlers: {},
      }),
    });

    const app = createEventFlowsApp({
      eventStore,
      eventBus,
      modules: [
        moduleWithRoutes,
        moduleWithoutRoutes1,
        moduleWithoutRoutes2,
      ] as const,
    });

    expect(app.moduleRoutes).toBeArrayOfSize(1);
    expect(app.moduleRoutes[0].moduleName).toBe("users");
  });

  test("Route metadata includes undefined basePath when not specified", () => {
    const module = createModule({
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

    const app = createEventFlowsApp({
      eventStore,
      eventBus,
      modules: [module] as const,
    });

    expect(app.moduleRoutes[0].basePath).toBeUndefined();
  });

  test("Route metadata handles empty commands and queries", () => {
    const module = createModule({
      name: "notifications",
      setup: () => ({
        commandHandlers: {
          CreateUser: new CreateUserHandler(),
        },
        queryHandlers: {},
        eventHandlers: {},
      }),
      routes: {
        basePath: "/notifications",
        commands: {
          CreateUser: { method: "POST", path: "/" },
        },
        // queries deliberately omitted
      },
    });

    const app = createEventFlowsApp({
      eventStore,
      eventBus,
      modules: [module] as const,
    });

    expect(app.moduleRoutes[0].commands).toEqual({
      CreateUser: { method: "POST", path: "/" },
    });
    expect(app.moduleRoutes[0].queries).toEqual({});
  });
});
