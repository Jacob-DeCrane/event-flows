/**
 * EventFlows HTTP Integration Example
 *
 * This example demonstrates the complete workflow of creating an HTTP API
 * using EventFlows modules with automatic route generation.
 *
 * Features demonstrated:
 * - Defining modules with commands, queries, and HTTP routes
 * - Schema validation using Zod
 * - OpenAPI documentation generation
 * - Error handling with domain-appropriate status codes
 * - Multiple modules with different basePaths
 * - Custom middleware integration
 */

import { createModule, createEventFlowsApp } from "@eventflows/core/module";
import { createHttpServer } from "@eventflows/integrations/hono";
import { InMemoryEventStore } from "@eventflows/integrations";
import { InMemoryEventBus } from "@eventflows/core/integrations";
import type {
  ICommand,
  ICommandHandler,
  IQuery,
  IQueryHandler,
  EventHandler,
} from "@eventflows/core";
import { z } from "zod/v4";

// =============================================================================
// Domain: User Management
// =============================================================================

// Commands
interface CreateUserCommand extends ICommand {
  commandName: "CreateUser";
  name: string;
  email: string;
}

interface UpdateUserCommand extends ICommand {
  commandName: "UpdateUser";
  userId: string;
  name: string;
  email?: string;
}

interface DeleteUserCommand extends ICommand {
  commandName: "DeleteUser";
  userId: string;
}

// Queries
interface GetUserQuery extends IQuery {
  queryName: "GetUser";
  userId: string;
}

interface ListUsersQuery extends IQuery {
  queryName: "ListUsers";
  limit?: number;
  offset?: number;
}

// Events
interface UserCreatedEvent {
  eventType: "UserCreated";
  userId: string;
  name: string;
  email: string;
  createdAt: string;
}

interface UserUpdatedEvent {
  eventType: "UserUpdated";
  userId: string;
  name: string;
  email?: string;
  updatedAt: string;
}

// Schemas for validation
const createUserSchema = z.object({
  name: z.string().min(1, "Name cannot be empty"),
  email: z.string().email("Invalid email format"),
});

const updateUserSchema = z.object({
  name: z.string().min(1, "Name cannot be empty"),
  email: z.string().email("Invalid email format").optional(),
});

// Handlers
class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  private users = new Map<string, { id: string; name: string; email: string }>();

  async execute(command: CreateUserCommand): Promise<{ userId: string }> {
    // Check for duplicate email
    for (const user of this.users.values()) {
      if (user.email === command.email) {
        throw new Error("User with this email already exists");
      }
    }

    const userId = `user-${Date.now()}`;
    this.users.set(userId, {
      id: userId,
      name: command.name,
      email: command.email,
    });

    return { userId };
  }
}

class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  private users = new Map<string, { id: string; name: string; email: string }>();

  async execute(command: UpdateUserCommand): Promise<void> {
    const user = this.users.get(command.userId);
    if (!user) {
      throw new Error("User not found");
    }

    this.users.set(command.userId, {
      ...user,
      name: command.name,
      email: command.email || user.email,
    });
  }
}

class DeleteUserHandler implements ICommandHandler<DeleteUserCommand> {
  private users = new Map<string, { id: string; name: string; email: string }>();

  async execute(command: DeleteUserCommand): Promise<void> {
    const user = this.users.get(command.userId);
    if (!user) {
      throw new Error("User not found");
    }

    this.users.delete(command.userId);
  }
}

class GetUserHandler implements IQueryHandler<GetUserQuery> {
  private users = new Map<string, { id: string; name: string; email: string }>();

  async execute(
    query: GetUserQuery
  ): Promise<{ id: string; name: string; email: string }> {
    const user = this.users.get(query.userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
}

class ListUsersHandler implements IQueryHandler<ListUsersQuery> {
  private users = new Map<string, { id: string; name: string; email: string }>();

  async execute(
    query: ListUsersQuery
  ): Promise<Array<{ id: string; name: string; email: string }>> {
    const allUsers = Array.from(this.users.values());
    const offset = query.offset || 0;
    const limit = query.limit || 10;

    return allUsers.slice(offset, offset + limit);
  }
}

class UserCreatedEventHandler implements EventHandler<UserCreatedEvent> {
  async handle(event: UserCreatedEvent): Promise<void> {
    console.log(`[Event] User created: ${event.userId} - ${event.name}`);
    // Could send welcome email, create user profile, etc.
  }
}

// =============================================================================
// Domain: Product Management
// =============================================================================

interface CreateProductCommand extends ICommand {
  commandName: "CreateProduct";
  name: string;
  description: string;
  price: number;
}

interface GetProductQuery extends IQuery {
  queryName: "GetProduct";
  productId: string;
}

interface ListProductsQuery extends IQuery {
  queryName: "ListProducts";
  category?: string;
}

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive("Price must be positive"),
});

class CreateProductHandler implements ICommandHandler<CreateProductCommand> {
  private products = new Map<
    string,
    { id: string; name: string; description: string; price: number }
  >();

  async execute(
    command: CreateProductCommand
  ): Promise<{ productId: string }> {
    const productId = `product-${Date.now()}`;
    this.products.set(productId, {
      id: productId,
      name: command.name,
      description: command.description,
      price: command.price,
    });

    return { productId };
  }
}

class GetProductHandler implements IQueryHandler<GetProductQuery> {
  private products = new Map<
    string,
    { id: string; name: string; description: string; price: number }
  >();

  async execute(query: GetProductQuery): Promise<{
    id: string;
    name: string;
    description: string;
    price: number;
  }> {
    const product = this.products.get(query.productId);
    if (!product) {
      throw new Error("Product not found");
    }
    return product;
  }
}

class ListProductsHandler implements IQueryHandler<ListProductsQuery> {
  private products = new Map<
    string,
    { id: string; name: string; description: string; price: number }
  >();

  async execute(
    query: ListProductsQuery
  ): Promise<
    Array<{ id: string; name: string; description: string; price: number }>
  > {
    return Array.from(this.products.values());
  }
}

// =============================================================================
// Module Definitions with HTTP Routes
// =============================================================================

const userModule = createModule({
  name: "users",
  setup: ({ eventStore, eventBus }) => ({
    commandHandlers: {
      CreateUser: new CreateUserHandler(),
      UpdateUser: new UpdateUserHandler(),
      DeleteUser: new DeleteUserHandler(),
    },
    queryHandlers: {
      GetUser: new GetUserHandler(),
      ListUsers: new ListUsersHandler(),
    },
    eventHandlers: {
      UserCreated: new UserCreatedEventHandler(),
    },
  }),

  // HTTP Routes configuration - top-level, explicit, type-safe
  routes: {
    basePath: "/users",

    // Command routes (mutations)
    commands: {
      CreateUser: {
        method: "POST",
        path: "/",
        schema: createUserSchema,
        summary: "Create a new user",
        description: "Creates a new user account with the provided details",
        tags: ["users"],
      },
      UpdateUser: {
        method: "PUT",
        path: "/:userId",
        schema: updateUserSchema,
        summary: "Update a user",
        description: "Updates an existing user's information",
        tags: ["users"],
      },
      DeleteUser: {
        method: "DELETE",
        path: "/:userId",
        summary: "Delete a user",
        description: "Permanently deletes a user account",
        tags: ["users"],
      },
    },

    // Query routes (reads)
    queries: {
      GetUser: {
        method: "GET",
        path: "/:userId",
        summary: "Get user by ID",
        description: "Retrieves a single user by their unique ID",
        tags: ["users"],
      },
      ListUsers: {
        method: "GET",
        path: "/",
        summary: "List all users",
        description:
          "Retrieves a paginated list of users. Supports limit and offset query parameters.",
        tags: ["users"],
      },
    },
  },
});

const productModule = createModule({
  name: "products",
  setup: ({ eventStore, eventBus }) => ({
    commandHandlers: {
      CreateProduct: new CreateProductHandler(),
    },
    queryHandlers: {
      GetProduct: new GetProductHandler(),
      ListProducts: new ListProductsHandler(),
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
        summary: "Create a product",
        description: "Creates a new product in the catalog",
        tags: ["products"],
      },
    },
    queries: {
      GetProduct: {
        method: "GET",
        path: "/:productId",
        summary: "Get product by ID",
        tags: ["products"],
      },
      ListProducts: {
        method: "GET",
        path: "/",
        summary: "List all products",
        tags: ["products"],
      },
    },
  },
});

// =============================================================================
// Application Setup
// =============================================================================

async function main() {
  // Initialize infrastructure
  const eventStore = new InMemoryEventStore();
  const eventBus = new InMemoryEventBus();

  // Create EventFlows app with modules
  const app = createEventFlowsApp({
    eventStore,
    eventBus,
    modules: [userModule, productModule] as const,
  });

  // Custom middleware example: Request logging
  const requestLogger = async (c: any, next: any) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    console.log(`${c.req.method} ${c.req.path} - ${duration}ms`);
  };

  // Create HTTP server with automatic route generation
  const server = createHttpServer(app, {
    basePath: "/api",
    middleware: [requestLogger],
    enableOpenAPI: true,
    openapi: {
      title: "EventFlows Example API",
      version: "1.0.0",
      description:
        "Example API demonstrating EventFlows HTTP integration with automatic route generation, schema validation, and OpenAPI documentation.",
    },
  });

  // Start server
  const port = process.env.PORT || 3000;
  console.log(`\n🚀 Server starting on http://localhost:${port}\n`);
  console.log("Available endpoints:");
  console.log("  - Health:      GET  /health");
  console.log("  - Users:       GET  /api/users");
  console.log("  - User:        GET  /api/users/:userId");
  console.log("  - Create User: POST /api/users");
  console.log("  - Update User: PUT  /api/users/:userId");
  console.log("  - Delete User: DEL  /api/users/:userId");
  console.log("  - Products:    GET  /api/products");
  console.log("  - Product:     GET  /api/products/:productId");
  console.log("  - Create Prod: POST /api/products");
  console.log("\n  - OpenAPI:     GET  /openapi.json");
  console.log("  - Swagger UI:  GET  /api-docs\n");

  // Example: Make some requests programmatically
  console.log("Example requests:\n");

  // Create a user
  const createUserResponse = await server.request("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Alice Johnson",
      email: "alice@example.com",
    }),
  });
  const createResult = await createUserResponse.json();
  console.log("✓ Created user:", createResult);

  // Get the user
  const getUserResponse = await server.request(
    `/api/users/${createResult.userId}`
  );
  const user = await getUserResponse.json();
  console.log("✓ Retrieved user:", user);

  // Create a product
  const createProductResponse = await server.request("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Premium Widget",
      description: "A high-quality widget",
      price: 49.99,
    }),
  });
  const productResult = await createProductResponse.json();
  console.log("✓ Created product:", productResult);

  // Example of validation error
  const invalidUserResponse = await server.request("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Bob",
      email: "not-an-email", // Invalid email
    }),
  });
  const validationError = await invalidUserResponse.json();
  console.log(
    "✓ Validation error (as expected):",
    invalidUserResponse.status,
    validationError.error
  );

  // Example of not found error
  const notFoundResponse = await server.request("/api/users/non-existent-id");
  const notFoundError = await notFoundResponse.json();
  console.log(
    "✓ Not found error (as expected):",
    notFoundResponse.status,
    notFoundError.message
  );

  console.log("\n✅ All examples completed successfully!\n");

  // Note: In a real application, you would use:
  // Bun.serve({ fetch: server.fetch, port })
  // or with Node.js adapter for Hono
}

// Run the example
if (import.meta.main) {
  main().catch(console.error);
}

// Export for testing or reuse
export { userModule, productModule };
