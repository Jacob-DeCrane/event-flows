import { describe, it, expect } from 'bun:test';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createErrorHandler, mapErrorToStatus } from './error-handler';

describe('mapErrorToStatus', () => {
  it('should map "not found" errors to 404', () => {
    expect(mapErrorToStatus('User not found')).toEqual({
      status: 404,
      type: 'Not Found',
    });
    expect(mapErrorToStatus('Resource Not Found')).toEqual({
      status: 404,
      type: 'Not Found',
    });
    expect(mapErrorToStatus('NOT FOUND')).toEqual({
      status: 404,
      type: 'Not Found',
    });
  });

  it('should map duplicate/conflict errors to 409', () => {
    expect(mapErrorToStatus('Email already in use')).toEqual({
      status: 409,
      type: 'Conflict',
    });
    expect(mapErrorToStatus('Resource already exists')).toEqual({
      status: 409,
      type: 'Conflict',
    });
    expect(mapErrorToStatus('Duplicate entry detected')).toEqual({
      status: 409,
      type: 'Conflict',
    });
  });

  it('should map validation errors to 400', () => {
    expect(mapErrorToStatus('Name cannot be empty')).toEqual({
      status: 400,
      type: 'Bad Request',
    });
    expect(mapErrorToStatus('Invalid email format')).toEqual({
      status: 400,
      type: 'Bad Request',
    });
    expect(mapErrorToStatus('Password is required')).toEqual({
      status: 400,
      type: 'Bad Request',
    });
  });

  it('should map authorization errors to 403', () => {
    expect(mapErrorToStatus('Unauthorized access')).toEqual({
      status: 403,
      type: 'Forbidden',
    });
    expect(mapErrorToStatus('Access not allowed')).toEqual({
      status: 403,
      type: 'Forbidden',
    });
    expect(mapErrorToStatus('Forbidden resource')).toEqual({
      status: 403,
      type: 'Forbidden',
    });
  });

  it('should map unknown errors to 500', () => {
    expect(mapErrorToStatus('Database connection failed')).toEqual({
      status: 500,
      type: 'Internal Server Error',
    });
    expect(mapErrorToStatus('Unexpected error occurred')).toEqual({
      status: 500,
      type: 'Internal Server Error',
    });
  });
});

describe('createErrorHandler', () => {
  it('should catch and convert thrown errors to JSON responses', async () => {
    const app = new Hono();
    app.onError(createErrorHandler());
    app.get('/error', () => {
      throw new Error('User not found');
    });

    const response = await app.request('/error');
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toMatchObject({
      error: 'Not Found',
      message: 'User not found',
    });
    expect(body.timestamp).toBeDefined();
    expect(typeof body.timestamp).toBe('string');
    // Verify ISO 8601 format
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it('should handle validation errors with 400 status', async () => {
    const app = new Hono();
    app.onError(createErrorHandler());
    app.post('/create', () => {
      throw new Error('Email is required');
    });

    const response = await app.request('/create', { method: 'POST' });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toBe('Email is required');
  });

  it('should handle conflict errors with 409 status', async () => {
    const app = new Hono();
    app.onError(createErrorHandler());
    app.post('/register', () => {
      throw new Error('Email already exists');
    });

    const response = await app.request('/register', { method: 'POST' });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('Conflict');
    expect(body.message).toBe('Email already exists');
  });

  it('should handle HTTPException errors with their native status', async () => {
    const app = new Hono();
    app.onError(createErrorHandler());
    app.get('/http-error', () => {
      throw new HTTPException(418, { message: "I'm a teapot" });
    });

    const response = await app.request('/http-error');
    const body = await response.json();

    expect(response.status).toBe(418);
    expect(body.error).toBe('HTTP Error');
    expect(body.message).toBe("I'm a teapot");
  });

  it('should not interfere with successful requests', async () => {
    const app = new Hono();
    app.onError(createErrorHandler());
    app.get('/success', (c) => c.json({ status: 'ok' }));

    const response = await app.request('/success');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'ok' });
  });

  it('should handle internal server errors with 500 status', async () => {
    const app = new Hono();
    app.onError(createErrorHandler());
    app.get('/server-error', () => {
      throw new Error('Database connection failed');
    });

    const response = await app.request('/server-error');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).toBe('Database connection failed');
  });
});
