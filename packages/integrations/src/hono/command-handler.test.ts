import { describe, it, expect, mock } from 'bun:test';
import { Hono } from 'hono';
import type { Context } from 'hono';
import type { EventFlowsApp } from '@eventflows/core';
import { commandHandler } from './command-handler';

describe('commandHandler', () => {
  it('should create handler with custom request mapping', async () => {
    const mockApp = {
      commands: {
        CreateUser: mock(async (payload: any) => ({ id: 'user-123', ...payload })),
      },
    } as unknown as EventFlowsApp;

    const handler = commandHandler(mockApp, 'users', 'CreateUser', {
      mapRequest: (c: Context) => ({
        name: c.req.header('X-User-Name') || 'Unknown',
        email: c.req.query('email') || '',
      }),
    });

    const server = new Hono();
    server.post('/', handler);

    const response = await server.request('/?email=john@example.com', {
      method: 'POST',
      headers: { 'X-User-Name': 'John Doe' },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ id: 'user-123', name: 'John Doe', email: 'john@example.com' });
    expect(mockApp.commands.CreateUser).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('should create handler with custom response mapping', async () => {
    const mockApp = {
      commands: {
        CreateUser: mock(async (payload: any) => ({ id: 'user-123', ...payload })),
      },
    } as unknown as EventFlowsApp;

    const handler = commandHandler(mockApp, 'users', 'CreateUser', {
      mapRequest: async (c: Context) => {
        const body = await c.req.json();
        return body;
      },
      mapResponse: (result: any) => ({
        userId: result.id,
        created: true,
      }),
    });

    const server = new Hono();
    server.post('/', handler);

    const response = await server.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ userId: 'user-123', created: true });
  });

  it('should create handler with custom status code', async () => {
    const mockApp = {
      commands: {
        CreateUser: mock(async (payload: any) => ({ id: 'user-123', ...payload })),
      },
    } as unknown as EventFlowsApp;

    const handler = commandHandler(mockApp, 'users', 'CreateUser', {
      mapRequest: async (c: Context) => await c.req.json(),
      status: 201,
    });

    const server = new Hono();
    server.post('/', handler);

    const response = await server.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
    });

    expect(response.status).toBe(201);
  });

  it('should propagate errors to error handler', async () => {
    const mockApp = {
      commands: {
        CreateUser: mock(async () => {
          throw new Error('User already exists');
        }),
      },
    } as unknown as EventFlowsApp;

    const handler = commandHandler(mockApp, 'users', 'CreateUser', {
      mapRequest: async (c: Context) => await c.req.json(),
    });

    const server = new Hono();
    server.post('/', handler);

    const response = await server.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
    });

    // Errors should propagate to Hono's error handler
    expect(response.status).toBe(500);
  });
});
