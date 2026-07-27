import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as client from './client';

// minimal Response stand-in for the fetch mock
function res(body: unknown, { ok = true, status = 200, jsonThrows = false } = {}): Response {
  return {
    ok,
    status,
    json: jsonThrows ? () => Promise.reject(new Error('no body')) : () => Promise.resolve(body),
  } as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('fetchJson (via fetchStats)', () => {
  it('resolves the parsed body as it arrives', async () => {
    fetchMock.mockResolvedValue(res({ currency: 'BTC', spot: 100, dvol_rank: 0.4 }));
    await expect(client.fetchStats('BTC')).resolves.toEqual({
      currency: 'BTC',
      spot: 100,
      dvol_rank: 0.4,
    });
  });

  it('throws the API detail message on an error response', async () => {
    fetchMock.mockResolvedValue(res({ detail: 'no data for BTC' }, { ok: false, status: 404 }));
    await expect(client.fetchStats('BTC')).rejects.toThrow('no data for BTC');
  });

  it('falls back to the HTTP status when the error body has no JSON', async () => {
    fetchMock.mockResolvedValue(res(null, { ok: false, status: 500, jsonThrows: true }));
    await expect(client.fetchStats('BTC')).rejects.toThrow('HTTP 500');
  });
});

// every route, so a mistyped path cannot ship silently
const ROUTES: [keyof typeof client, string][] = [
  ['fetchIVSurface', 'iv/surface'],
  ['fetchIVCurves', 'iv/curves'],
  ['fetchTermStructure', 'iv/term-structure'],
  ['fetchSkew', 'iv/skew'],
  ['fetchProbCurves', 'prob/curves'],
  ['fetchGreeksChain', 'greeks/chain'],
  ['fetchGEXByStrike', 'gex/strike'],
  ['fetchOIByExpiration', 'oi/expiration'],
  ['fetchOIByStrike', 'oi/strike'],
  ['fetchVolumeByStrike', 'volume/strike'],
  ['fetchStats', 'stats'],
  ['fetchSpotHistory', 'spot/history'],
];

describe('URL building', () => {
  beforeEach(() => fetchMock.mockResolvedValue(res({})));

  it.each(ROUTES)('%s requests /api/%s', async (name, path) => {
    await (client[name] as (currency: string) => Promise<unknown>)('BTC');
    expect(fetchMock).toHaveBeenCalledWith(`/api/${path}?currency=BTC`);
  });

  it('encodes the currency query param', async () => {
    await client.fetchIVSurface('ET H');
    expect(fetchMock).toHaveBeenCalledWith('/api/iv/surface?currency=ET+H');
  });

  it('appends the expiry only when provided', async () => {
    await client.fetchOIByStrike('BTC');
    expect(fetchMock).toHaveBeenCalledWith('/api/oi/strike?currency=BTC');

    await client.fetchOIByStrike('BTC', '2026-07-31T08:00:00Z');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/oi/strike?currency=BTC&expiry=2026-07-31T08%3A00%3A00Z',
    );
  });
});
