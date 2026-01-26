# execution-gemini

Google Gemini provider implementation for LLM execution. Implements the `Provider` interface from the `execution` package.

## Installation

```bash
npm install execution-gemini @google/generative-ai
```

## Usage

```typescript
import { GeminiProvider, createGeminiProvider } from 'execution-gemini';

// Create provider
const provider = createGeminiProvider();

// Execute a request
const response = await provider.execute(
  {
    model: 'gemini-1.5-pro',
    messages: [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello!' }
    ],
    addMessage: () => {},
  },
  {
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.7,
  }
);

console.log(response.content);
console.log(response.usage); // { inputTokens: X, outputTokens: Y }
```

## Supported Models

The provider supports all Gemini models:
- Gemini 1.5 Pro
- Gemini 1.5 Flash
- Gemini 1.0 Pro

## API Key

Set via:
1. `options.apiKey` parameter
2. `GEMINI_API_KEY` environment variable

## Features

- System instruction support
- Multi-turn conversation handling
- Structured output via JSON schema
- Token usage tracking

## Response Format

```typescript
interface ProviderResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}
```

## Related Packages

- `execution` - Core interfaces (no SDK dependencies)
- `execution-openai` - OpenAI provider
- `execution-anthropic` - Anthropic provider

## License

Apache-2.0

<!-- v1.0.0 -->
