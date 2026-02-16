import { describe, it, expect, mock } from 'bun:test';
import { Hono } from 'hono';
import type { Context } from 'hono';
import type { EventFlowsApp } from '@eventflows/core';
import { queryHandler } from './query-handler';

describe('queryHandler', () => {
  it('should create handler with custom request mapping', async () => {
    const mockApp = {
      queries: {
        GetUser: mock(async (payload: any) => ({ id: payload.userId, name: 'John Doe' })),
      },
    } as unknown as EventFlowsApp;

    const handler = queryHandler(mockApp, 'users', 'GetUser', {
      mapRequest: (c: Context) => ({
        userId: c.req.param('userId'),
      }),
    });

    const server = new Hono();
    server.get('/:userId', handler);

    const response = await server.request('/user-123', { method: 'GET' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ id: 'user-123', name: 'John Doe' });
    expect(mockApp.queries.GetUser).toHaveBeenCalledWith({ userId: 'user-123' });
  });

  it('should create handler with custom response mapping', async () => {
    const mockApp = {
      queries: {
        GetUser: mock(async (payload: any) => ({ id: payload.userId, name: 'John Doe' })),
      },
    } as unknown as EventFlowsApp;

    const handler = queryHandler(mockApp, 'users', 'GetUser', {
      mapRequest: (c: Context) => ({
        userId: c.req.param('userId'),
      }),
      mapResponse: (result: any) => ({
        user: result,
        retrieved: true,
      }),
    });

    const server = new Hono();
    server.get('/:userId', handler);

    const response = await server.request('/user-123', { method: 'GET' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      user: { id: 'user-123', name: 'John Doe' },
      retrieved: true,
    });
  });

  it('should create handler with custom status code', async () => {
    const mockApp = {
      queries: {
        GetUser: mock(async (payload: any) => ({ id: payload.userId, name: 'John Doe' })),
      },
    } as unknown as EventFlowsApp;

    const handler = queryHandler(mockApp, 'users', 'GetUser', {
      mapRequest: (c: Context) => ({
        userId: c.req.param('userId'),
      }),
      status: 206,
    });

    const server = new Hono();
    server.get('/:userId', handler);

    const response = await server.request('/user-123', { method: 'GET' });

    expect(response.status).toBe(206);
  });

  it('should propagate errors to error handler', async () => {
    const mockApp = {
      queries: {
        GetUser: mock(async () => {
          throw new Error('User not found');
        }),
      },
    } as unknown as EventFlowsApp;

    const handler = queryHandler(mockApp, 'users', 'GetUser', {
      mapRequest: (c: Context) => ({
        userId: c.req.param('userId'),
      }),
    });

    const server = new Hono();
    server.get('/:userId', handler);

    const response = await server.request('/user-123', { method: 'GET' });

    // Errors should propagate to Hono's error handler
    expect(response.status).toBe(500);
  });
});
