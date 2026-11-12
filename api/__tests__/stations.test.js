import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../stations.js';

function createMockRes() {
  const headers = new Map();
  let statusCode = 200;
  let body = null;

  return {
    setHeader(key, value) {
      headers.set(key.toLowerCase(), value);
    },
    getHeader(key) {
      return headers.get(key.toLowerCase());
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
    end() {
      return this;
    },
    get result() {
      return { statusCode, body, headers };
    },
  };
}

describe('api/stations serverless handler', () => {
  const originalKey = process.env.TANKERKOENIG_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.TANKERKOENIG_API_KEY = 'secret-test-key';
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.TANKERKOENIG_API_KEY;
    } else {
      process.env.TANKERKOENIG_API_KEY = originalKey;
    }
  });

  it('reports proxyConfigured status accurately', async () => {
    const res1 = createMockRes();
    await handler({ method: 'GET', query: { mode: 'status' }, headers: {} }, res1);
    expect(res1.result.statusCode).toBe(200);
    expect(res1.result.body).toEqual({ ok: true, proxyConfigured: true });

    delete process.env.TANKERKOENIG_API_KEY;
    const res2 = createMockRes();
    await handler({ method: 'GET', query: { mode: 'status' }, headers: {} }, res2);
    expect(res2.result.body).toEqual({ ok: true, proxyConfigured: false });
  });

  it('rejects unsupported HTTP methods with 405', async () => {
    const res = createMockRes();
    await handler({ method: 'POST', query: {}, headers: {} }, res);
    expect(res.result.statusCode).toBe(405);
  });

  it('validates coordinates and UUIDs strictly to prevent parameter injection', async () => {
    const badCoords = createMockRes();
    await handler(
      { method: 'GET', query: { lat: '52.5&apikey=evil', lng: '13.4' }, headers: {} },
      badCoords
    );
    expect(badCoords.result.statusCode).toBe(400);

    const outOfRange = createMockRes();
    await handler({ method: 'GET', query: { lat: '95', lng: '13.4' }, headers: {} }, outOfRange);
    expect(outOfRange.result.statusCode).toBe(400);

    const badId = createMockRes();
    await handler({ method: 'GET', query: { id: 'not-a-uuid' }, headers: {} }, badId);
    expect(badId.result.statusCode).toBe(400);
  });

  it('restricts CORS to same-origin / localhost and omits credentials header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, stations: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const evilRes = createMockRes();
    await handler(
      {
        method: 'GET',
        query: { lat: '52.52', lng: '13.40' },
        headers: { origin: 'https://attacker.example', host: 'tankapp.vercel.app' },
      },
      evilRes
    );
    expect(evilRes.getHeader('access-control-allow-origin')).toBeUndefined();
    expect(evilRes.getHeader('access-control-allow-credentials')).toBeUndefined();

    const sameOriginRes = createMockRes();
    await handler(
      {
        method: 'GET',
        query: { lat: '52.52', lng: '13.40' },
        headers: { origin: 'https://tankapp.vercel.app', host: 'tankapp.vercel.app' },
      },
      sameOriginRes
    );
    expect(sameOriginRes.getHeader('access-control-allow-origin')).toBe(
      'https://tankapp.vercel.app'
    );
  });

  it('caches only ok:true responses and sets no-store on ok:false responses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: false, message: 'rate limit' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, stations: [] }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const errorRes = createMockRes();
    await handler({ method: 'GET', query: { lat: '52.52', lng: '13.40' }, headers: {} }, errorRes);
    expect(errorRes.getHeader('cache-control')).toBe('no-store');

    const okRes = createMockRes();
    await handler({ method: 'GET', query: { lat: '52.52', lng: '13.40' }, headers: {} }, okRes);
    expect(okRes.getHeader('cache-control')).toContain('s-maxage=60');
  });
});
