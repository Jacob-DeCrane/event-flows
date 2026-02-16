import { describe, it, expect } from 'bun:test';
import { z } from 'zod';
import type { EventFlowsApp, ModuleRouteMetadata } from '@eventflows/core';
import { generateOpenAPISpec } from './openapi-generator';

describe('generateOpenAPISpec', () => {
  it('should generate basic OpenAPI spec structure', () => {
    const mockApp = {
      moduleRoutes: [],
    } as EventFlowsApp;

    const spec = generateOpenAPISpec(mockApp, {
      title: 'Test API',
      version: '1.0.0',
      description: 'A test API',
    });

    expect(spec.openapi).toBe('3.0.0');
    expect(spec.info.title).toBe('Test API');
    expect(spec.info.version).toBe('1.0.0');
    expect(spec.info.description).toBe('A test API');
    expect(spec.paths).toEqual({});
  });

  it('should generate routes with Zod schema conversion', () => {
    const createUserSchema = z.object({
      name: z.string(),
      email: z.string().email(),
    });

    const mockApp = {
      moduleRoutes: [
        {
          moduleName: 'users',
          basePath: '/users',
          commands: {
            CreateUser: {
              method: 'POST' as const,
              path: '/',
              schema: createUserSchema,
            },
          },
          queries: {},
        },
      ] as ModuleRouteMetadata[],
    } as EventFlowsApp;

    const spec = generateOpenAPISpec(mockApp, {
      title: 'Test API',
      version: '1.0.0',
    });

    expect(spec.paths['/users/']).toBeDefined();
    expect(spec.paths['/users/'].post).toBeDefined();
    expect(spec.paths['/users/'].post?.requestBody).toBeDefined();
    expect(spec.paths['/users/'].post?.requestBody?.content['application/json'].schema).toBeDefined();
  });

  it('should convert path params to OpenAPI format', () => {
    const mockApp = {
      moduleRoutes: [
        {
          moduleName: 'users',
          basePath: '/users',
          commands: {},
          queries: {
            GetUser: {
              method: 'GET' as const,
              path: '/:userId',
            },
          },
        },
      ] as ModuleRouteMetadata[],
    } as EventFlowsApp;

    const spec = generateOpenAPISpec(mockApp, {
      title: 'Test API',
      version: '1.0.0',
    });

    expect(spec.paths['/users/{userId}']).toBeDefined();
    expect(spec.paths['/users/{userId}'].get).toBeDefined();
    expect(spec.paths['/users/{userId}'].get?.parameters).toBeDefined();
    expect(spec.paths['/users/{userId}'].get?.parameters?.[0]).toMatchObject({
      name: 'userId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    });
  });

  it('should include OpenAPI metadata from route config', () => {
    const mockApp = {
      moduleRoutes: [
        {
          moduleName: 'users',
          basePath: '/users',
          commands: {
            CreateUser: {
              method: 'POST' as const,
              path: '/',
              summary: 'Create a new user',
              description: 'Creates a new user account',
              tags: ['users', 'accounts'],
            },
          },
          queries: {},
        },
      ] as ModuleRouteMetadata[],
    } as EventFlowsApp;

    const spec = generateOpenAPISpec(mockApp, {
      title: 'Test API',
      version: '1.0.0',
    });

    expect(spec.paths['/users/'].post?.summary).toBe('Create a new user');
    expect(spec.paths['/users/'].post?.description).toBe('Creates a new user account');
    expect(spec.paths['/users/'].post?.tags).toEqual(['users', 'accounts']);
  });

  it('should handle routes without schemas', () => {
    const mockApp = {
      moduleRoutes: [
        {
          moduleName: 'users',
          basePath: '/users',
          commands: {
            DeleteUser: {
              method: 'DELETE' as const,
              path: '/:userId',
            },
          },
          queries: {},
        },
      ] as ModuleRouteMetadata[],
    } as EventFlowsApp;

    const spec = generateOpenAPISpec(mockApp, {
      title: 'Test API',
      version: '1.0.0',
    });

    expect(spec.paths['/users/{userId}'].delete).toBeDefined();
    expect(spec.paths['/users/{userId}'].delete?.requestBody).toBeUndefined();
  });

  it('should handle response schemas', () => {
    const responseSchema = z.object({
      id: z.string(),
      name: z.string(),
    });

    const mockApp = {
      moduleRoutes: [
        {
          moduleName: 'users',
          basePath: '/users',
          commands: {},
          queries: {
            GetUser: {
              method: 'GET' as const,
              path: '/:userId',
              responseSchema,
            },
          },
        },
      ] as ModuleRouteMetadata[],
    } as EventFlowsApp;

    const spec = generateOpenAPISpec(mockApp, {
      title: 'Test API',
      version: '1.0.0',
    });

    expect(spec.paths['/users/{userId}'].get?.responses['200']).toBeDefined();
    const response200 = spec.paths['/users/{userId}'].get?.responses['200'];

    // Check if content exists
    if (!response200.content) {
      console.error('Response 200 object:', response200);
      throw new Error('Expected content in response 200');
    }

    expect(response200.content['application/json']).toBeDefined();
    expect(response200.content['application/json'].schema).toBeDefined();
  });
});
