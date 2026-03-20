/**
 * Execution Gemini Package
 *
 * Google Gemini provider implementation for LLM execution.
 *
 * @packageDocumentation
 */

import {
    GoogleGenAI,
    type Content,
    type GenerateContentConfig,
} from '@google/genai';
import { getRedactor } from '@utilarium/offrecord';
import { getProxyUrl, withProxyFetch } from './proxy.js';
import {
    createSafeError,
    configureErrorSanitizer,
    configureSecretGuard,
} from '@utilarium/spotclean';

// Register Gemini API key patterns on module load
const redactor = getRedactor();
redactor.register({
    name: 'gemini',
    patterns: [
        /AIza[a-zA-Z0-9_-]{35}/g,
    ],
    validator: (key: string) => /^AIza[a-zA-Z0-9_-]{35}$/.test(key),
    envVar: 'GEMINI_API_KEY',
    description: 'Google Gemini API keys',
});

// Configure spotclean for error sanitization
configureErrorSanitizer({
    enabled: true,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    includeCorrelationId: true,
    sanitizeStackTraces: process.env.NODE_ENV === 'production',
    maxMessageLength: 500,
});

configureSecretGuard({
    enabled: true,
    redactionText: '[REDACTED]',
    preservePartial: false,
    preserveLength: 0,
    customPatterns: [
        { name: 'gemini', pattern: /AIza[a-zA-Z0-9_-]{35}/g, description: 'Google Gemini API key' },
    ],
});

// ===== INLINE TYPES (from 'execution' package) =====

export type Model = string;

export interface Message {
    role: 'user' | 'assistant' | 'system' | 'developer' | 'tool';
    content: string | string[] | null;
    name?: string;
}

export interface Request {
    messages: Message[];
    model: Model;
    responseFormat?: any;
    validator?: any;
    addMessage(message: Message): void;
}

export interface ProviderResponse {
    content: string;
    model: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
    toolCalls?: Array<{
        id: string;
        type: 'function';
        function: {
            name: string;
            arguments: string;
        };
    }>;
}

export interface ExecutionOptions {
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
    retries?: number;
}

export interface Provider {
    readonly name: string;
    execute(request: Request, options?: ExecutionOptions): Promise<ProviderResponse>;
    supportsModel?(model: Model): boolean;
}

/** Strip unsupported JSON Schema fields for Gemini `responseJsonSchema`. */
function prepareJsonSchemaForGenai(schema: unknown): unknown {
    if (!schema || typeof schema !== 'object') {
        return schema;
    }
    const s = schema as Record<string, unknown>;
    const out: Record<string, unknown> = { ...s };
    delete out.additionalProperties;
    delete out['$schema'];
    if (out.properties && typeof out.properties === 'object') {
        const props = out.properties as Record<string, unknown>;
        out.properties = Object.fromEntries(
            Object.entries(props).map(([k, v]) => [k, prepareJsonSchemaForGenai(v)])
        );
    }
    if (out.items !== undefined) {
        out.items = prepareJsonSchemaForGenai(out.items);
    }
    return out;
}

/**
 * Gemini Provider implementation
 */
export class GeminiProvider implements Provider {
    readonly name = 'gemini';

    /**
     * Check if this provider supports a given model
     */
    supportsModel(model: Model): boolean {
        if (!model) return false;
        return model.startsWith('gemini');
    }

    /**
     * Execute a request against Gemini
     */
    async execute(
        request: Request,
        options: ExecutionOptions = {}
    ): Promise<ProviderResponse> {
        const apiKey = options.apiKey || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('Gemini API key is required. Set GEMINI_API_KEY environment variable.');
        }

        // Validate key format
        const validation = redactor.validateKey(apiKey, 'gemini');
        if (!validation.valid) {
            throw new Error('Invalid Gemini API key format');
        }

        try {
            const proxyUrl = getProxyUrl();

            const runWithGenAI = async () => {
                const ai = new GoogleGenAI({ apiKey });

                const modelName = options.model || request.model || 'gemini-1.5-pro';

                const sessionConfig: GenerateContentConfig = {};

                if (request.responseFormat?.type === 'json_schema') {
                    sessionConfig.responseMimeType = 'application/json';
                    sessionConfig.responseJsonSchema = prepareJsonSchemaForGenai(
                        request.responseFormat.json_schema.schema
                    );
                }

                if (options.temperature !== undefined) {
                    sessionConfig.temperature = options.temperature;
                }
                if (options.maxTokens !== undefined) {
                    sessionConfig.maxOutputTokens = options.maxTokens;
                }

                // Extract system instruction
                let systemInstruction = '';

                for (const msg of request.messages) {
                    if (msg.role === 'system' || msg.role === 'developer') {
                        systemInstruction +=
                            (typeof msg.content === 'string'
                                ? msg.content
                                : JSON.stringify(msg.content)) + '\n\n';
                    }
                }

                if (systemInstruction.trim()) {
                    sessionConfig.systemInstruction = systemInstruction.trim();
                }

                // Build history/messages
                const chatHistory: Content[] = [];
                let lastUserMessage = '';

                for (const msg of request.messages) {
                    if (msg.role === 'system' || msg.role === 'developer') continue;

                    const content =
                        typeof msg.content === 'string'
                            ? msg.content
                            : JSON.stringify(msg.content);

                    if (msg.role === 'user') {
                        lastUserMessage = content;
                    }

                    chatHistory.push({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: content }],
                    });
                }

                let response;

                if (chatHistory.length > 1) {
                    const lastMsg = chatHistory.pop()!;
                    const chat = ai.chats.create({
                        model: modelName,
                        config: sessionConfig,
                        history: chatHistory,
                    });
                    response = await chat.sendMessage({
                        message: lastMsg.parts?.[0]?.text || '',
                    });
                } else {
                    response = await ai.models.generateContent({
                        model: modelName,
                        contents: lastUserMessage || ' ',
                        config: sessionConfig,
                    });
                }

                const text = response.text ?? '';

                return {
                    content: text,
                    model: modelName,
                    usage: response.usageMetadata
                        ? {
                            inputTokens: response.usageMetadata.promptTokenCount ?? 0,
                            outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
                        }
                        : undefined,
                };
            };

            return proxyUrl ? withProxyFetch(proxyUrl, runWithGenAI) : runWithGenAI();
        } catch (error) {
            // Sanitize error to remove any API keys from error messages
            // Use spotclean for comprehensive error sanitization
            throw createSafeError(error as Error, { provider: 'gemini' });
        }
    }
}

/**
 * Create a new Gemini provider instance
 */
export function createGeminiProvider(): GeminiProvider {
    return new GeminiProvider();
}

/**
 * Package version
 */
export const VERSION = '1.0.12';

export default GeminiProvider;
