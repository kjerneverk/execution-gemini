# AI Agent Guide: execution-gemini

Google Gemini provider for `execution` interface.

## Quick Start

```typescript
import { GeminiProvider } from 'execution-gemini';

const provider = new GeminiProvider({
  apiKey: process.env.GOOGLE_API_KEY
});

const response = await provider.execute(messages, {
  model: 'gemini-1.5-pro'
});
```

## Supported Models

| Model | Vision | Tools |
|-------|--------|-------|
| gemini-1.5-pro | ✅ | ✅ |
| gemini-1.5-flash | ✅ | ✅ |
| gemini-1.0-pro | ❌ | ✅ |

## Dependencies

- `@google/generative-ai` - Google AI SDK
- `execution` - Interface definitions (peer)

