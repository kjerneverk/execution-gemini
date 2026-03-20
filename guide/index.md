# AI Agent Guide: execution-gemini

Google Gemini provider for `execution` interface.

## Quick Start

```typescript
import { GeminiProvider } from 'execution-gemini';

const provider = new GeminiProvider();

const response = await provider.execute(
  {
    model: 'gemini-2.0-flash',
    messages: [{ role: 'user', content: 'Hello!' }],
    addMessage: () => {},
  },
  { apiKey: process.env.GEMINI_API_KEY }
);
```

## Supported Models

| Model | Vision | Tools |
|-------|--------|-------|
| gemini-1.5-pro | ✅ | ✅ |
| gemini-1.5-flash | ✅ | ✅ |
| gemini-2.0-flash | ✅ | ✅ |
| gemini-2.5-flash | ✅ | ✅ |

## Dependencies

- `@google/genai` — unified Google Gen AI SDK (Gemini Developer API and Vertex)
- `execution` — Interface definitions (peer)
