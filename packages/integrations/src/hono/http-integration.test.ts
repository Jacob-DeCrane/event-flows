/**
 * End-to-End HTTP Integration Tests
 *
 * These tests verify complete workflows from module definition with routes
 * through app creation, HTTP server generation, and actual HTTP request/response cycles.
 *
 * Focus areas:
 * - Full request lifecycle: HTTP request -> route -> command/query -> response
 * - Cross-cutting concerns: error handling + validation, middleware + routes
 * - End-to-end workflows with multiple modules
 * - OpenAPI integration with actual routes
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { createModule, createEventFlowsApp } from "@eventflows/core";
import type { ICommand, ICommandHandler, IQuery, IQueryHandler } from "@eventflows/core";
import { InMemoryEventStore } from "../in-memory/event-store";
import { InMemoryEventBus } from "@eventflows/core";
import { createHttpServer } from "./create-http-server";
import { z } from "zod";

// =============================================================================
// Test Fixtures - User Module
// =============================================================================

interface CreateUserCommand extends ICommand {
  commandName: "CreateUser";
  name: string;
  email: string;
}

interface UpdateUserCommand extends ICommand {
  commandName: "UpdateUser";
  userId: string;
  name: string;
}

interface GetUserQuery extends IQuery {
  queryName: "GetUser";
  userId: string;
}

interface ListUsersQuery extends IQuery {
  queryName: "ListUsers";
}

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const updateUserSchema = z.object({
  name: z.string().min(1),
});

class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  async execute(command: CreateUserCommand): Promise<{ userId: string }> {
    if (command.email === "duplicate@example.com") {
      throw new Error("User already exists");
    }
    return { userId: "user-123" };
  }
}

class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  async execute(command: UpdateUserCommand): Promise<void> {
    if (command.userId === "not-found") {
      throw new Error("User not found");
    }
    // Update user
  }
}

class GetUserHandler implements IQueryHandler<GetUserQuery> {
  async execute(query: GetUserQuery): Promise<{ id: string; name: string }> {
    if (query.userId === "not-found") {
      throw new Error("User not found");
    }
    return { id: query.userId, name: "John Doe" };
  }
}

class ListUsersHandler implements IQueryHandler<ListUsersQuery> {
  async execute(): Promise<Array<{ id: string; name: string }>> {
    return [
      { id: "user-1", name: "Alice" },
      { id: "user-2", name: "Bob" },
    ];
  }
}

// =============================================================================
// Test Fixtures - Product Module
// =============================================================================

interface CreateProductCommand extends ICommand {
  commandName: "CreateProduct";
  name: string;
  price: number;
}

interface GetProductQuery extends IQuery {
  queryName: "GetProduct";
  productId: string;
}

const createProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
});

class CreateProductHandler implements ICommandHandler<CreateProductCommand> {
  async execute(
    command: CreateProductCommand
  ): Promise<{ productId: string }> {
    return { productId: "product-456" };
  }
}

class GetProductHandler implements IQueryHandler<GetProductQuery> {
  async execute(
    query: GetProductQuery
  ): Promise<{ id: string; name: string; price: number }> {
    return { id: query.productId, name: "Widget", price: 29.99 };
  }
}

// =============================================================================
// Tests
// =============================================================================

describe("End-to-End HTTP Integration", () => {
  let eventStore: InMemoryEventStore;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
    eventBus = new InMemoryEventBus();
  });

  test("should handle full request lifecycle: POST -> command -> 201 response", async () => {
    // Create module with routes
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
          CreateUser: {
            method: "POST",
            path: "/",
            schema: createUserSchema,
          },
        },
        queries: {},
      },
    });

    // Create app with module
    const app = createEventFlowsApp({
      eventStore,
      eventBus,
      modules: [userModule] as const,
    });

    // Create HTTP server
    const server = createHttpServer(app, { basePath: "/api" });

    // Make request
    const response = await server.request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "John Doe", email: "john@example.com" }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toEqual({ userId: "user-123" });
  });

  test("should handle validation errors with 400 status", async () => {
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
          CreateUser: {
            method: "POST",
            path: "/",
            schema: createUserSchema,
          },
        },
        queries: {},
      },
    });

    const app = createEventFlowsApp({
      eventStore,
      eventBus,
      modules: [userModule] as const,
    });

    const server = createHttpServer(app, { basePath: "/api" });

    // Invalid email
    const response = await server.request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "John", email: "invalid-email" }),
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toBe("Validation failed");
    expect(error.details).toBeDefined();
  });

  test("should handle domain errors with correct status codes", async () => {
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
          CreateUser: {
            method: "POST",
            path: "/",
            schema: createUserSchema,
          },
        },
        queries: {},
      },
    });

    const app = createEventFlowsApp({
      eventStore,
      eventBus,
      modules: [userModule] as const,
    });

    const server = createHttpServer(app, { basePath: "/api" });

    // Trigger "already exists" error
    const response = await server.request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate",
        email: "duplicate@example.com",
      }),
    });

    expect(response.status).toBe(409);
    const error = await response.json();
    expect(error.message).toBe("User already exists");
  });

  test("should handle GET query with URL params", async () => {
    const userModule = createModule({
      name: "users",
      setup: () => ({
        commandHandlers: {},
        queryHandlers: {
          GetUser: new GetUserHandler(),
        },
        eventHandlers: {},
      }),
      routes: {
        basePath: "/users",
        commands: {},
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

    const server = createHttpServer(app, { basePath: "/api" });

    const response = await server.request("/api/users/user-123");

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ id: "user-123", name: "John Doe" });
  });

  test("should handle query not found errors with 404 status", async () => {
    const userModule = createModule({
      name: "users",
      setup: () => ({
        commandHandlers: {},
        queryHandlers: {
          GetUser: new GetUserHandler(),
        },
        eventHandlers: {},
      }),
      routes: {
        basePath: "/users",
        commands: {},
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

    const server = createHttpServer(app, { basePath: "/api" });

    const response = await server.request("/api/users/not-found");

    expect(response.status).toBe(404);
    const error = await response.json();
    expect(error.message).toBe("User not found");
  });

  test("should handle PUT with URL params and body validation", async () => {
    const userModule = createModule({
      name: "users",
      setup: () => ({
        commandHandlers: {
          UpdateUser: new UpdateUserHandler(),
        },
        queryHandlers: {},
        eventHandlers: {},
      }),
      routes: {
        basePath: "/users",
        commands: {
          UpdateUser: {
            method: "PUT",
            path: "/:userId",
            schema: updateUserSchema,
          },
        },
        queries: {},
      },
    });

    const app = createEventFlowsApp({
      eventStore,
      eventBus,
      modules: [userModule] as const,
    });

    const server = createHttpServer(app, { basePath: "/api" });

    const response = await server.request("/api/users/user-123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Jane Doe" }),
    });

    expect(response.status).toBe(200);
  });

  test("should handle multiple modules with different basePaths", async () => {
    const userModule = createModule({
      name: "users",
      setup: () => ({
        commandHandlers: {
          CreateUser: new CreateUserHandler(),
        },
        queryHandlers: {
          ListUsers: new ListUsersHandler(),
        },
        eventHandlers: {},
      }),
      routes: {
        basePath: "/users",
        commands: {
          CreateUser: {
            method: "POST",
            path: "/",
            schema: createUserSchema,
          },
        },
        queries: {
          ListUsers: { method: "GET", path: "/" },
        },
      },
    });

    const productModule = createModule({
      name: "products",
      setup: () => ({
        commandHandlers: {
          CreateProduct: new CreateProductHandler(),
        },
        queryHandlers: {
          GetProduct: new GetProductHandler(),
        },
        eventHandlers: {},
      }),
      routes: {
        basePath: "/products",
        commands: {
          CreateProduct: {
            method: "POST",
            path: "/",
            schema: createProductSchema,
          },
        },
        queries: {
          GetProduct: { method: "GET", path: "/:productId" },
        },
      },
    });

    const app = createEventFlowsApp({
      eventStore,
      eventBus,
      modules: [userModule, productModule] as const,
    });

    const server = createHttpServer(app, { basePath: "/api" });

    // Test user route
    const usersResponse = await server.request("/api/users");
    expect(usersResponse.status).toBe(200);
    const users = await usersResponse.json();
    expect(users).toHaveLength(2);

    // Test product route
    const productResponse = await server.request("/api/products/prod-123");
    expect(productResponse.status).toBe(200);
    const product = await productResponse.json();
    expect(product.name).toBe("Widget");
  });

  test("should apply global middleware before route handlers", async () => {
    const userModule = createModule({
      name: "users",
      setup: () => ({
        commandHandlers: {},
        queryHandlers: {
          ListUsers: new ListUsersHandler(),
        },
        eventHandlers: {},
      }),
      routes: {
        basePath: "/users",
        commands: {},
        queries: {
          ListUsers: { method: "GET", path: "/" },
        },
      },
    });

    const app = createEventFlowsApp({
      eventStore,
      eventBus,
      modules: [userModule] as const,
    });

    // Custom middleware that adds a header
    const customMiddleware = async (c: any, next: any) => {
      await next();
      c.res.headers.set("X-Custom-Header", "test-value");
    };

    const server = createHttpServer(app, {
      basePath: "/api",
      middleware: [customMiddleware],
    });

    const response = await server.request("/api/users");
    expect(response.headers.get("X-Custom-Header")).toBe("test-value");
  });

  test("should generate OpenAPI spec when enabled", async () => {
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
          CreateUser: {
            method: "POST",
            path: "/",
            schema: createUserSchema,
            summary: "Create a new user",
            description: "Creates a new user account",
            tags: ["users"],
          },
        },
        queries: {
          GetUser: {
            method: "GET",
            path: "/:userId",
            summary: "Get user by ID",
            tags: ["users"],
          },
        },
      },
    });

    const app = createEventFlowsApp({
      eventStore,
      eventBus,
      modules: [userModule] as const,
    });

    const server = createHttpServer(app, {
      basePath: "/api",
      enableOpenAPI: true,
      openApiTitle: "Test API",
      openApiVersion: "1.0.0",
      openApiDescription: "Test API Documentation",
    });

    // Check OpenAPI spec endpoint
    const specResponse = await server.request("/openapi.json");
    expect(specResponse.status).toBe(200);
    const spec = await specResponse.json();
    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info.title).toBe("Test API");
    expect(spec.paths["/users/"]).toBeDefined();
    expect(spec.paths["/users/{userId}"]).toBeDefined();

    // Check Swagger UI endpoint
    const uiResponse = await server.request("/api-docs");
    expect(uiResponse.status).toBe(200);
    const html = await uiResponse.text();
    expect(html).toContain("swagger-ui");
  });

  test("should work with modules that have no routes (backward compatibility)", async () => {
    const legacyModule = createModule({
      name: "legacy",
      setup: () => ({
        commandHandlers: {
          CreateUser: new CreateUserHandler(),
        },
        queryHandlers: {},
        eventHandlers: {},
      }),
      // No routes property
    });

    const app = createEventFlowsApp({
      eventStore,
      eventBus,
      modules: [legacyModule] as const,
    });

    // Should not throw error
    const server = createHttpServer(app, { basePath: "/api" });

    // Health endpoint should still work
    const response = await server.request("/health");
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("ok");
  });
});
