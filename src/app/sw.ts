import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkFirst, Serwist } from 'serwist';

// Extend ServiceWorkerGlobalScope with Serwist's injected manifest
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Network-first for navigation requests (HTML pages) — always go to server
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'pages-cache',
        networkTimeoutSeconds: 5,
      }),
    },
    // Network-first for API and server action routes (fresh data matters)
    {
      matcher: /^\/api\//,
      handler: new NetworkFirst({
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
      }),
    },
    // Cache-first for everything else via defaultCache (static assets, fonts, etc.)
    ...defaultCache,
  ],
});

serwist.addEventListeners();
