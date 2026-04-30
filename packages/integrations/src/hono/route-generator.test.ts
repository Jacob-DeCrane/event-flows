import { describe, it, expect, mock } from 'bun:test';
import { Hono } from 'hono';
import { z } from 'zod/v4';
import type { EventFlowsApp } from '@eventflows/core';
import { generateCommandRoute, generateQueryRoute, generateRoutes } from './route-generator';

describe('generateCommandRoute', () => {
  it('should create POST route with 201 status and JSON body parsing', async () => {
    const mockApp = {
      commands: {
        CreateUser: mock(async (payload: any) => ({ id: 'user-123', ...payload })),
      },
    } as unknown as EventFlowsApp;

    const server = new Hono();
    generateCommandRoute(
      server,
      mockApp,
      'users',
      'CreateUser',
      { method: 'POST', path: '/' }
    );

    const response = await server.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ id: 'user-123', name: 'John Doe', email: 'john@example.com' });
    expect(mockApp.commands.CreateUser).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('should create DELETE route with 204 status and no body', async () => {
    const mockApp = {
      commands: {
        DeleteUser: mock(async () => undefined),
      },
    } as unknown as EventFlowsApp;

    const server = new Hono();
    generateCommandRoute(
      server,
      mockApp,
      'users',
      'DeleteUser',
      { method: 'DELETE', path: '/:userId' }
    );

    const response = await server.request('/user-123', { method: 'DELETE' });
    const text = await response.text();

    expect(response.status).toBe(204);
    expect(text).toBe('');
    expect(mockApp.commands.DeleteUser).toHaveBeenCalledWith({ userId: 'user-123' });
  });

  it('should create PUT route with 200 status and extract URL params', async () => {
    const mockApp = {
      commands: {
        UpdateUser: mock(async (payload: any) => ({ updated: true, ...payload })),
      },
    } as unknown as EventFlowsApp;

    const server = new Hono();
    generateCommandRoute(
      server,
      mockApp,
      'users',
      'UpdateUser',
      { method: 'PUT', path: '/:userId' }
    );

    const response = await server.request('/user-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Jane Doe' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ updated: true, userId: 'user-123', name: 'Jane Doe' });
    expect(mockApp.commands.UpdateUser).toHaveBeenCalledWith({
      userId: 'user-123',
      name: 'Jane Doe',
    });
  });

  it('should return 400 for invalid JSON body', async () => {
    const mockApp = {
      commands: {
        CreateUser: mock(async () => ({ id: 'user-123' })),
      },
    } as unknown as EventFlowsApp;

    const server = new Hono();
    generateCommandRoute(
      server,
      mockApp,
      'users',
      'CreateUser',
      { method: 'POST', path: '/' }
    );

    const response = await server.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json{',
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid JSON body' });
    expect(mockApp.commands.CreateUser).not.toHaveBeenCalled();
  });

  it('should validate request body using Zod schema', async () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
    });

    const mockApp = {
      commands: {
        CreateUser: mock(async (payload: any) => ({ id: 'user-123', ...payload })),
      },
    } as unknown as EventFlowsApp;

    const server = new Hono();
    generateCommandRoute(
      server,
      mockApp,
      'users',
      'CreateUser',
      { method: 'POST', path: '/', schema }
    );

    const response = await server.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', email: 'invalid-email' }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Validation failed');
    expect(body.details).toBeDefined();
    expect(mockApp.commands.CreateUser).not.toHaveBeenCalled();
  });

  it('should merge URL params with validated body', async () => {
    const schema = z.object({
      name: z.string(),
    });

    const mockApp = {
      commands: {
        UpdateUser: mock(async (payload: any) => ({ updated: true, ...payload })),
      },
    } as unknown as EventFlowsApp;

    const server = new Hono();
    generateCommandRoute(
      server,
      mockApp,
      'users',
      'UpdateUser',
      { method: 'PUT', path: '/:userId', schema }
    );

    const response = await server.request('/user-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Jane Doe' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ updated: true, userId: 'user-123', name: 'Jane Doe' });
    expect(mockApp.commands.UpdateUser).toHaveBeenCalledWith({
      userId: 'user-123',
      name: 'Jane Doe',
    });
  });

  it('should create PATCH route with 200 status', async () => {
    const mockApp = {
      commands: {
        PatchUser: mock(async (payload: any) => ({ patched: true, ...payload })),
      },
    } as unknown as EventFlowsApp;

    const server = new Hono();
    generateCommandRoute(
      server,
      mockApp,
      'users',
      'PatchUser',
      { method: 'PATCH', path: '/:userId' }
    );

    const response = await server.request('/user-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ patched: true, userId: 'user-123', status: 'active' });
    expect(mockApp.commands.PatchUser).toHaveBeenCalledWith({
      userId: 'user-123',
      status: 'active',
    });
  });
});

describe('generateQueryRoute', () => {
  it('should create GET route with 200 status and extract URL params', async () => {
    const mockApp = {
      queries: {
        GetUser: mock(async (payload: any) => ({ id: payload.userId, name: 'John Doe' })),
      },
    } as unknown as EventFlowsApp;

    const server = new Hono();
    generateQueryRoute(
      server,
      mockApp,
      'users',
      'GetUser',
      { method: 'GET', path: '/:userId' }
    );

    const response = await server.request('/user-123');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ id: 'user-123', name: 'John Doe' });
    expect(mockApp.queries.GetUser).toHaveBeenCalledWith({ userId: 'user-123' });
  });

  it('should extract query string parameters', async () => {
    const mockApp = {
      queries: {
        ListUsers: mock(async (payload: any) => ({
          users: [],
          page: payload.page,
          limit: payload.limit,
        })),
      },
    } as unknown as EventFlowsApp;

    const server = new Hono();
    generateQueryRoute(
      server,
      mockApp,
      'users',
      'ListUsers',
      { method: 'GET', path: '/' }
    );

    const response = await server.request('/?page=2&limit=10');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ users: [], page: '2', limit: '10' });
    expect(mockApp.queries.ListUsers).toHaveBeenCalledWith({ page: '2', limit: '10' });
  });

  it('should merge URL params with query string params', async () => {
    const mockApp = {
      queries: {
        GetUserOrders: mock(async (payload: any) => ({
          userId: payload.userId,
          status: payload.status,
          orders: [],
        })),
      },
    } as unknown as EventFlowsApp;

    const server = new Hono();
    generateQueryRoute(
      server,
      mockApp,
      'orders',
      'GetUserOrders',
      { method: 'GET', path: '/:userId/orders' }
    );

    const response = await server.request('/user-123/orders?status=completed');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ userId: 'user-123', status: 'completed', orders: [] });
    expect(mockApp.queries.GetUserOrders).toHaveBeenCalledWith({
      userId: 'user-123',
      status: 'completed',
    });
  });

  it('should handle queries with no parameters', async () => {
    const mockApp = {
      queries: {
        GetStats: mock(async () => ({ total: 100 })),
      },
    } as unknown as EventFlowsApp;

    const server = new Hono();
    generateQueryRoute(
      server,
      mockApp,
      'stats',
      'GetStats',
      { method: 'GET', path: '/stats' }
    );

    const response = await server.request('/stats');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ total: 100 });
    expect(mockApp.queries.GetStats).toHaveBeenCalledWith({});
  });
});

describe('generateRoutes', () => {
  it('should register all command and query routes from module metadata', async () => {
    const mockApp = {
      moduleRoutes: [
        {
          moduleName: 'users',
          basePath: '/users',
          commands: {
            CreateUser: { method: 'POST', path: '/' },
            UpdateUser: { method: 'PUT', path: '/:userId' },
          },
          queries: {
            GetUser: { method: 'GET', path: '/:userId' },
            ListUsers: { method: 'GET', path: '/' },
          },
        },
      ],
      commands: {
        CreateUser: mock(async (payload: any) => ({ id: 'user-123', ...payload })),
        UpdateUser: mock(async (payload: any) => ({ updated: true, ...payload })),
      },
      queries: {
        GetUser: mock(async (payload: any) => ({ id: payload.userId, name: 'John' })),
        ListUsers: mock(async () => ({ users: [] })),
      },
    } as unknown as EventFlowsApp;

    const server = new Hono();
    generateRoutes(server, mockApp, { basePath: '/api' });

    // Test command routes
    const createResponse = await server.request('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John' }),
    });
    expect(createResponse.status).toBe(201);

    const updateResponse = await server.request('/api/users/user-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Jane' }),
    });
    expect(updateResponse.status).toBe(200);

    // Test query routes
    const getResponse = await server.request('/api/users/user-123');
    expect(getResponse.status).toBe(200);

    const listResponse = await server.request('/api/users');
    expect(listResponse.status).toBe(200);
  });

  it('should combine module basePath with server basePath', async () => {
    const mockApp = {
      moduleRoutes: [
        {
          moduleName: 'users',
          basePath: '/users',
          commands: {
            CreateUser: { method: 'POST', path: '/' },
          },
          queries: {},
        },
      ],
      commands: {
        CreateUser: mock(async (payload: any) => ({ id: 'user-123', ...payload })),
      },
      queries: {},
    } as unknown as EventFlowsApp;

    const server = new Hono();
    generateRoutes(server, mockApp, { basePath: '/v1' });

    const response = await server.request('/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John' }),
    });
    expect(response.status).toBe(201);
  });

  it('should handle modules without basePath', async () => {
    const mockApp = {
      moduleRoutes: [
        {
          moduleName: 'health',
          basePath: undefined,
          commands: {},
          queries: {
            GetHealth: { method: 'GET', path: '/health' },
          },
        },
      ],
      commands: {},
      queries: {
        GetHealth: mock(async () => ({ status: 'ok' })),
      },
    } as unknown as EventFlowsApp;

    const server = new Hono();
    generateRoutes(server, mockApp, { basePath: '/api' });

    const response = await server.request('/api/health');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
  });

  it('should handle empty module routes array', async () => {
    const mockApp = {
      moduleRoutes: [],
      commands: {},
      queries: {},
    } as unknown as EventFlowsApp;

    const server = new Hono();
    generateRoutes(server, mockApp, { basePath: '/api' });

    expect(server).toBeDefined();
  });
});
