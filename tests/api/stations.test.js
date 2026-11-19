import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../../api/stations.js';
import { resetRateLimits } from '../../api/_shared.js';

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
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetRateLimits();
    process.env.TANKERKOENIG_API_KEY = 'secret-test-key';
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.TANKERKOENIG_API_KEY;
    } else {
      process.env.TANKERKOENIG_API_KEY = originalKey;
    }
    if (originalVercelEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = originalVercelEnv;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
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

  it('validates coordinates, arrays, and UUIDs strictly to prevent parameter injection', async () => {
    const badCoords = createMockRes();
    await handler(
      { method: 'GET', query: { lat: '52.5&apikey=evil', lng: '13.4' }, headers: {} },
      badCoords
    );
    expect(badCoords.result.statusCode).toBe(400);

    const arrayParam = createMockRes();
    await handler(
      { method: 'GET', query: { lat: ['52.5', '52.6'], lng: '13.4' }, headers: {} },
      arrayParam
    );
    expect(arrayParam.result.statusCode).toBe(400);

    const outOfRange = createMockRes();
    await handler({ method: 'GET', query: { lat: '95', lng: '13.4' }, headers: {} }, outOfRange);
    expect(outOfRange.result.statusCode).toBe(400);

    const badId = createMockRes();
    await handler({ method: 'GET', query: { id: 'not-a-uuid' }, headers: {} }, badId);
    expect(badId.result.statusCode).toBe(400);
  });

  it('rounds radius to integer km and defaults empty rad="" to 5 km', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, stations: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res1 = createMockRes();
    await handler(
      { method: 'GET', query: { lat: '52.52123', lng: '13.40987', rad: '5.4321' }, headers: {} },
      res1
    );
    expect(res1.result.statusCode).toBe(200);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('rad=5');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('lat=52.521');

    const res2 = createMockRes();
    await handler(
      { method: 'GET', query: { lat: '52.52', lng: '13.40', rad: '' }, headers: {} },
      res2
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('rad=5');
  });

  it('always sets Vary: Origin + X-Content-Type-Options and blocks localhost CORS in production', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, stations: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    process.env.VERCEL_ENV = 'production';

    const localhostProdRes = createMockRes();
    await handler(
      {
        method: 'GET',
        query: { lat: '52.52', lng: '13.40' },
        headers: { origin: 'http://localhost:5173', host: 'tankapp.vercel.app' },
      },
      localhostProdRes
    );
    expect(localhostProdRes.getHeader('access-control-allow-origin')).toBeUndefined();
    expect(localhostProdRes.getHeader('vary')).toBe('Origin');
    expect(localhostProdRes.getHeader('x-content-type-options')).toBe('nosniff');

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

  it('handles invalid upstream JSON and hides internal network error messages', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      })
      .mockRejectedValueOnce(new Error('internal ECONNREFUSED secret-test-key'));
    vi.stubGlobal('fetch', fetchMock);

    const badJsonRes = createMockRes();
    await handler(
      { method: 'GET', query: { lat: '52.52', lng: '13.40' }, headers: {} },
      badJsonRes
    );
    expect(badJsonRes.result.statusCode).toBe(502);
    expect(badJsonRes.result.body.message).toContain('Ungültige Antwort');

    const netErrRes = createMockRes();
    await handler(
      { method: 'GET', query: { lat: '52.52', lng: '13.40' }, headers: {} },
      netErrRes
    );
    expect(netErrRes.result.statusCode).toBe(502);
    expect(netErrRes.result.body.message).not.toContain('secret-test-key');
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

  it('enforces per-IP rate limiting with 429 and Retry-After header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, stations: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'GET',
      query: { lat: '52.52', lng: '13.40' },
      headers: { 'x-forwarded-for': '203.0.113.42' },
    };

    for (let i = 0; i < 60; i++) {
      const res = createMockRes();
      await handler(req, res);
      expect(res.result.statusCode).toBe(200);
    }

    const blockedRes = createMockRes();
    await handler(req, blockedRes);
    expect(blockedRes.result.statusCode).toBe(429);
    expect(Number(blockedRes.getHeader('retry-after'))).toBeGreaterThanOrEqual(1);
  });
});
