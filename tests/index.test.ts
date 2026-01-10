/**
 * Tests for execution-gemini package
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GeminiProvider,
  createGeminiProvider,
  VERSION,
  type Message,
  type Request,
  type ExecutionOptions,
  type ProviderResponse,
  type Provider,
} from '../src/index.js';

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    provider = new GeminiProvider();
  });

  describe('name', () => {
    it('should have name "gemini"', () => {
      expect(provider.name).toBe('gemini');
    });
  });

  describe('supportsModel', () => {
    it('should support Gemini 1.5 models', () => {
      expect(provider.supportsModel('gemini-1.5-pro')).toBe(true);
      expect(provider.supportsModel('gemini-1.5-flash')).toBe(true);
      expect(provider.supportsModel('gemini-1.5-pro-latest')).toBe(true);
    });

    it('should support Gemini 2.0 models', () => {
      expect(provider.supportsModel('gemini-2.0-flash')).toBe(true);
      expect(provider.supportsModel('gemini-2.0-flash-exp')).toBe(true);
    });

    it('should support Gemini 1.0 models', () => {
      expect(provider.supportsModel('gemini-1.0-pro')).toBe(true);
      expect(provider.supportsModel('gemini-pro')).toBe(true);
    });

    it('should not support GPT models', () => {
      expect(provider.supportsModel('gpt-4')).toBe(false);
      expect(provider.supportsModel('gpt-4o')).toBe(false);
      expect(provider.supportsModel('gpt-3.5-turbo')).toBe(false);
    });

    it('should not support Claude models', () => {
      expect(provider.supportsModel('claude-3-opus-20240229')).toBe(false);
      expect(provider.supportsModel('claude-3-sonnet-20240229')).toBe(false);
    });

    it('should return false for empty/undefined model', () => {
      expect(provider.supportsModel('')).toBe(false);
    });
  });

  describe('execute', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.GEMINI_API_KEY;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should throw error when no API key is provided', async () => {
      const request: Request = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gemini-1.5-pro',
        addMessage: vi.fn(),
      };

      await expect(provider.execute(request)).rejects.toThrow(
        'Gemini API key is required'
      );
    });

    it('should throw error when API key is empty string', async () => {
      const request: Request = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gemini-1.5-pro',
        addMessage: vi.fn(),
      };

      await expect(provider.execute(request, { apiKey: '' })).rejects.toThrow(
        'Gemini API key is required'
      );
    });
  });

  describe('implements Provider interface', () => {
    it('should satisfy Provider interface', () => {
      const p: Provider = provider;
      expect(p.name).toBe('gemini');
      expect(typeof p.execute).toBe('function');
      expect(typeof p.supportsModel).toBe('function');
    });
  });
});

describe('createGeminiProvider', () => {
  it('should create a new GeminiProvider instance', () => {
    const provider = createGeminiProvider();
    expect(provider).toBeInstanceOf(GeminiProvider);
    expect(provider.name).toBe('gemini');
  });
});

describe('VERSION', () => {
  it('should export version string', () => {
    expect(VERSION).toBe('0.0.1');
  });
});

describe('Type exports', () => {
  it('should export Message type', () => {
    const msg: Message = {
      role: 'user',
      content: 'Hello',
    };
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello');
  });

  it('should support all message roles', () => {
    const roles: Message['role'][] = ['user', 'assistant', 'system', 'developer', 'tool'];
    roles.forEach(role => {
      const msg: Message = { role, content: 'test' };
      expect(msg.role).toBe(role);
    });
  });

  it('should support array content', () => {
    const msg: Message = {
      role: 'user',
      content: ['Hello', 'World'],
    };
    expect(Array.isArray(msg.content)).toBe(true);
  });

  it('should support null content', () => {
    const msg: Message = {
      role: 'assistant',
      content: null,
    };
    expect(msg.content).toBeNull();
  });

  it('should support optional name field', () => {
    const msg: Message = {
      role: 'user',
      content: 'Hello',
      name: 'test-user',
    };
    expect(msg.name).toBe('test-user');
  });

  it('should export ExecutionOptions type', () => {
    const opts: ExecutionOptions = {
      apiKey: 'test-key',
      model: 'gemini-1.5-pro',
      temperature: 0.7,
      maxTokens: 1000,
      timeout: 30000,
      retries: 3,
    };
    expect(opts.apiKey).toBe('test-key');
    expect(opts.temperature).toBe(0.7);
  });

  it('should export ProviderResponse type', () => {
    const response: ProviderResponse = {
      content: 'Hello!',
      model: 'gemini-1.5-pro',
      usage: {
        inputTokens: 10,
        outputTokens: 5,
      },
    };
    expect(response.content).toBe('Hello!');
    expect(response.usage?.inputTokens).toBe(10);
  });

  it('should support toolCalls in ProviderResponse', () => {
    const response: ProviderResponse = {
      content: '',
      model: 'gemini-1.5-pro',
      toolCalls: [
        {
          id: 'call_123',
          type: 'function',
          function: {
            name: 'get_weather',
            arguments: '{"location": "NYC"}',
          },
        },
      ],
    };
    expect(response.toolCalls).toHaveLength(1);
    expect(response.toolCalls?.[0].function.name).toBe('get_weather');
  });
});

