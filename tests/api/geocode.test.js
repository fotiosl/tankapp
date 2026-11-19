import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../api/geocode.js';
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

describe('api/geocode serverless handler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetRateLimits();
  });

  it('rejects invalid methods and too-short queries', async () => {
    const methodRes = createMockRes();
    await handler({ method: 'POST', query: { q: 'Berlin' }, headers: {} }, methodRes);
    expect(methodRes.result.statusCode).toBe(405);

    const shortRes = createMockRes();
    await handler({ method: 'GET', query: { q: 'a' }, headers: {} }, shortRes);
    expect(shortRes.result.statusCode).toBe(400);
  });

  it('proxies Nominatim with compliant User-Agent and 24h edge caching', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { lat: '52.5200', lon: '13.4050', display_name: 'Berlin, Deutschland' },
        { lat: 'invalid', lon: '13.4', display_name: 'Broken' },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = createMockRes();
    await handler({ method: 'GET', query: { q: 'Berlin' }, headers: {} }, res);

    expect(res.result.statusCode).toBe(200);
    expect(res.result.body).toEqual({
      ok: true,
      results: [{ lat: 52.52, lng: 13.405, displayName: 'Berlin, Deutschland' }],
    });
    expect(res.getHeader('cache-control')).toContain('s-maxage=86400');

    const fetchOptions = fetchMock.mock.calls[0]?.[1];
    expect(fetchOptions.headers['User-Agent']).toContain('TankApp/1.0');
  });

  it('returns 504 on timeout and 502 on invalid JSON', async () => {
    const timeoutErr = new Error('timed out');
    timeoutErr.name = 'TimeoutError';
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(timeoutErr)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('bad json');
        },
      });
    vi.stubGlobal('fetch', fetchMock);

    const res1 = createMockRes();
    await handler({ method: 'GET', query: { q: 'München' }, headers: {} }, res1);
    expect(res1.result.statusCode).toBe(504);

    const res2 = createMockRes();
    await handler({ method: 'GET', query: { q: 'Hamburg' }, headers: {} }, res2);
    expect(res2.result.statusCode).toBe(502);
  });
});
