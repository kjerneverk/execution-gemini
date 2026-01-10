/**
 * Execution Gemini Package
 *
 * Google Gemini provider implementation for LLM execution.
 *
 * @packageDocumentation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

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
        if (!apiKey) throw new Error('Gemini API key is required');

        const genAI = new GoogleGenerativeAI(apiKey);

        const modelName = options.model || request.model || 'gemini-1.5-pro';

        // Handle generation config for structured output
        const generationConfig: any = {};

        if (request.responseFormat?.type === 'json_schema') {
            generationConfig.responseMimeType = 'application/json';

            const openAISchema = request.responseFormat.json_schema.schema;

            // Map schema types to uppercase for Gemini
            const mapSchema = (s: any): any => {
                if (!s) return undefined;

                const newSchema: any = { ...s };

                if (newSchema.type) {
                    newSchema.type =
                        typeof newSchema.type === 'string'
                            ? (newSchema.type as string).toUpperCase()
                            : newSchema.type;
                }

                if (newSchema.properties) {
                    const newProps: any = {};
                    for (const [key, val] of Object.entries(newSchema.properties)) {
                        newProps[key] = mapSchema(val);
                    }
                    newSchema.properties = newProps;
                }

                if (newSchema.items) {
                    newSchema.items = mapSchema(newSchema.items);
                }

                delete newSchema.additionalProperties;
                delete newSchema['$schema'];

                return newSchema;
            };

            generationConfig.responseSchema = mapSchema(openAISchema);
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

        const configuredModel = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemInstruction
                ? systemInstruction.trim()
                : undefined,
            generationConfig,
        });

        // Build history/messages
        const chatHistory = [];
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

        let result;

        if (chatHistory.length > 1) {
            const lastMsg = chatHistory.pop();
            const chat = configuredModel.startChat({
                history: chatHistory,
            });
            result = await chat.sendMessage(lastMsg?.parts[0].text || '');
        } else {
            result = await configuredModel.generateContent(lastUserMessage || ' ');
        }

        const response = await result.response;
        const text = response.text();

        return {
            content: text,
            model: modelName,
            usage: response.usageMetadata
                ? {
                    inputTokens: response.usageMetadata.promptTokenCount,
                    outputTokens: response.usageMetadata.candidatesTokenCount,
                }
                : undefined,
        };
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
export const VERSION = '0.0.1';

export default GeminiProvider;
