import { describe, it, expect } from 'bun:test';
import { createHttpServer } from './create-http-server';
import type { HttpServerConfig } from './types';

describe('createHttpServer', () => {
  it('should create Hono server instance with minimal config', () => {
    // Mock app instance
    const mockApp = {} as any;
    const server = createHttpServer(mockApp, {});

    expect(server).toBeDefined();
    expect(typeof server.fetch).toBe('function');
  });

  it('should add health endpoint at /health', async () => {
    const mockApp = {} as any;
    const server = createHttpServer(mockApp, {});

    const response = await server.request('/health');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
    });
    expect(body.timestamp).toBeDefined();
    expect(typeof body.timestamp).toBe('string');
    // Verify ISO 8601 format
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it('should apply global middleware before route handlers', async () => {
    const mockApp = {} as any;
    let middlewareCalled = false;

    const server = createHttpServer(mockApp, {
      middleware: [
        async (c, next) => {
          middlewareCalled = true;
          await next();
        },
      ],
    });

    await server.request('/health');

    expect(middlewareCalled).toBe(true);
  });

  it('should respect basePath config with default /api', async () => {
    const mockApp = {} as any;
    const config: HttpServerConfig = {
      basePath: '/api',
    };

    const server = createHttpServer(mockApp, config);

    expect(server).toBeDefined();
  });

  it('should initialize with custom basePath', async () => {
    const mockApp = {} as any;
    const config: HttpServerConfig = {
      basePath: '/v1',
    };

    const server = createHttpServer(mockApp, config);

    expect(server).toBeDefined();
  });

  it('should integrate error handling automatically', async () => {
    const mockApp = {} as any;
    const server = createHttpServer(mockApp, {});

    // Add a test route that throws an error
    server.get('/test-error', () => {
      throw new Error('User not found');
    });

    const response = await server.request('/test-error');
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toMatchObject({
      error: 'Not Found',
      message: 'User not found',
    });
    expect(body.timestamp).toBeDefined();
  });
});
