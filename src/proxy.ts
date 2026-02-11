/**
 * Proxy support for Gemini API requests.
 *
 * When HTTPS_PROXY or https_proxy is set, routes requests through the proxy
 * using undici's ProxyAgent. Required for environments behind corporate
 * firewalls that require proxy access to reach Google Gemini API.
 *
 * Note: The @google/generative-ai SDK does not expose a custom fetch option.
 * We temporarily replace the global fetch for the duration of API calls.
 */

import { ProxyAgent, fetch as undiciFetch } from 'undici';

/**
 * Get the proxy URL from environment variables.
 * Checks HTTPS_PROXY and https_proxy (lowercase takes precedence per convention).
 */
export function getProxyUrl(): string | undefined {
    return process.env.https_proxy || process.env.HTTPS_PROXY;
}

/**
 * Create a fetch implementation that routes requests through an HTTP(S) proxy.
 *
 * @param proxyUrl - The proxy URL (e.g. https://proxy.example.com:8080)
 * @returns A fetch function that uses ProxyAgent as the dispatcher
 */
export function createProxyFetch(proxyUrl: string): typeof fetch {
    const proxyAgent = new ProxyAgent(proxyUrl);
    return (input: string | URL | Request, init?: RequestInit) =>
        undiciFetch(input, { ...init, dispatcher: proxyAgent });
}

/**
 * Run a callback with the global fetch temporarily replaced by a proxy fetch.
 * Used because @google/generative-ai does not support a custom fetch option.
 *
 * @param proxyUrl - The proxy URL
 * @param fn - Async callback to run (e.g. making Gemini API calls)
 * @returns The result of the callback
 */
export async function withProxyFetch<T>(
    proxyUrl: string,
    fn: () => Promise<T>
): Promise<T> {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = createProxyFetch(proxyUrl) as typeof fetch;
        return await fn();
    } finally {
        globalThis.fetch = originalFetch;
    }
}
