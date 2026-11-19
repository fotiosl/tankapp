import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const SW_SOURCE = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

function createSwHarness() {
  const listeners = new Map();
  const cacheStorage = new Map();

  function getOrCreateCache(name) {
    if (!cacheStorage.has(name)) {
      cacheStorage.set(name, new Map());
    }
    const store = cacheStorage.get(name);
    return {
      addAll: vi.fn(async (urls) => {
        for (const u of urls) {
          store.set(u, new Response(`cached:${u}`, { status: 200 }));
        }
      }),
      put: vi.fn(async (req, res) => {
        const key = typeof req === 'string' ? req : req.url;
        store.set(key, res);
      }),
      keys: vi.fn(async () => [...store.keys()].map((url) => ({ url }))),
      delete: vi.fn(async (key) => {
        const k = typeof key === 'string' ? key : key.url;
        return store.delete(k);
      }),
      match: vi.fn(async (req) => {
        const key = typeof req === 'string' ? req : req.url;
        return store.get(key);
      }),
    };
  }

  const cachesMock = {
    open: vi.fn(async (name) => getOrCreateCache(name)),
    keys: vi.fn(async () => [...cacheStorage.keys()]),
    delete: vi.fn(async (name) => cacheStorage.delete(name)),
    match: vi.fn(async (req) => {
      const key = typeof req === 'string' ? req : req.url;
      for (const store of cacheStorage.values()) {
        if (store.has(key)) return store.get(key);
      }
      return undefined;
    }),
  };

  const clientFocus = vi.fn(async () => undefined);
  const openWindow = vi.fn(async () => undefined);
  const fetchMock = vi.fn();

  const selfMock = {
    location: { origin: 'https://tankapp.example' },
    skipWaiting: vi.fn(async () => undefined),
    clients: {
      claim: vi.fn(async () => undefined),
      matchAll: vi.fn(async () => [{ focus: clientFocus }]),
      openWindow,
    },
    addEventListener: (type, handler) => {
      listeners.set(type, handler);
    },
  };

  const context = vm.createContext({
    self: selfMock,
    caches: cachesMock,
    fetch: fetchMock,
    URL,
    Response,
    Headers,
    Set,
    Promise,
  });

  vm.runInContext(SW_SOURCE, context);

  return { listeners, cacheStorage, cachesMock, selfMock, fetchMock, clientFocus };
}

describe('public/sw.js Service Worker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('precaches shell assets including /theme-init.js and cleans up legacy caches on activate', async () => {
    const { listeners, cacheStorage, selfMock } = createSwHarness();
    cacheStorage.set('tankapp-shell-v1', new Map());
    cacheStorage.set('tankapp-shell-v2', new Map());

    const installPromises = [];
    listeners.get('install')({ waitUntil: (p) => installPromises.push(p) });
    await Promise.all(installPromises);

    expect(selfMock.skipWaiting).toHaveBeenCalledTimes(1);
    const shellStore = cacheStorage.get('tankapp-shell-v3');
    expect(shellStore.has('/theme-init.js')).toBe(true);
    expect(shellStore.has('/icon-512-maskable.png')).toBe(true);

    const activatePromises = [];
    listeners.get('activate')({ waitUntil: (p) => activatePromises.push(p) });
    await Promise.all(activatePromises);

    expect(cacheStorage.has('tankapp-shell-v1')).toBe(false);
    expect(cacheStorage.has('tankapp-shell-v2')).toBe(false);
    expect(cacheStorage.has('tankapp-shell-v3')).toBe(true);
    expect(selfMock.clients.claim).toHaveBeenCalledTimes(1);
  });

  it('never caches HTML fallback responses under /assets/* (prevents cache poisoning)', async () => {
    const { listeners, cacheStorage, fetchMock } = createSwHarness();

    const htmlResp = new Response('<!doctype html><html></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
    Object.defineProperty(htmlResp, 'type', { value: 'basic' });
    fetchMock.mockResolvedValueOnce(htmlResp);

    /** @type {Promise<unknown>[]} */
    const waitPromises = [];
    /** @type {Promise<Response> | undefined} */
    let responsePromise;
    listeners.get('fetch')({
      request: {
        method: 'GET',
        mode: 'no-cors',
        url: 'https://tankapp.example/assets/stale-chunk.js',
      },
      respondWith: (/** @type {Promise<Response>} */ p) => {
        responsePromise = p;
      },
      waitUntil: (/** @type {Promise<unknown>} */ p) => waitPromises.push(p),
    });

    await responsePromise;
    await Promise.all(waitPromises);
    expect(cacheStorage.get('tankapp-assets-v3')).toBeUndefined();

    // Valid JS asset IS cached
    const jsResp = new Response('console.log("ok")', {
      status: 200,
      headers: { 'content-type': 'application/javascript' },
    });
    Object.defineProperty(jsResp, 'type', { value: 'basic' });
    fetchMock.mockResolvedValueOnce(jsResp);

    /** @type {Promise<unknown>[]} */
    const waitPromises2 = [];
    /** @type {Promise<Response> | undefined} */
    let responsePromise2;
    listeners.get('fetch')({
      request: {
        method: 'GET',
        mode: 'no-cors',
        url: 'https://tankapp.example/assets/index-abc.js',
      },
      respondWith: (/** @type {Promise<Response>} */ p) => {
        responsePromise2 = p;
      },
      waitUntil: (/** @type {Promise<unknown>} */ p) => waitPromises2.push(p),
    });

    await responsePromise2;
    await Promise.all(waitPromises2);
    expect(
      cacheStorage.get('tankapp-assets-v3')?.has('https://tankapp.example/assets/index-abc.js')
    ).toBe(true);
  });

  it('returns a safe 503 Response on offline navigation when cache is empty and focuses window on notificationclick', async () => {
    const { listeners, fetchMock, clientFocus } = createSwHarness();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    /** @type {Promise<Response> | undefined} */
    let responsePromise;
    listeners.get('fetch')({
      request: {
        method: 'GET',
        mode: 'navigate',
        url: 'https://tankapp.example/',
      },
      respondWith: (/** @type {Promise<Response>} */ p) => {
        responsePromise = p;
      },
      waitUntil: () => {},
    });

    const resp = await responsePromise;
    expect(resp).toBeInstanceOf(Response);
    expect(resp?.status).toBe(503);

    const close = vi.fn();
    const waitPromises = [];
    listeners.get('notificationclick')({
      notification: { close },
      waitUntil: (p) => waitPromises.push(p),
    });
    await Promise.all(waitPromises);
    expect(close).toHaveBeenCalledTimes(1);
    expect(clientFocus).toHaveBeenCalledTimes(1);
  });
});
