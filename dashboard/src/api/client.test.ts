import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchStats,
  fetchIVSurface,
  fetchOIByStrike,
  fetchCotReport,
  fetchCotIndex,
} from './client';

// minimal Response stand-in for the fetch mock
function res(
  body: unknown,
  { ok = true, status = 200, jsonThrows = false } = {},
): Response {
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
  it('resolves the parsed JSON body on success', async () => {
    fetchMock.mockResolvedValue(res({ currency: 'BTC', spot: 100 }));
    await expect(fetchStats('BTC')).resolves.toEqual({ currency: 'BTC', spot: 100 });
  });

  it('throws the API detail message on an error response', async () => {
    fetchMock.mockResolvedValue(res({ detail: 'no data for BTC' }, { ok: false, status: 404 }));
    await expect(fetchStats()).rejects.toThrow('no data for BTC');
  });

  it('falls back to the HTTP status when the error body has no JSON', async () => {
    fetchMock.mockResolvedValue(res(null, { ok: false, status: 500, jsonThrows: true }));
    await expect(fetchStats()).rejects.toThrow('HTTP 500');
  });
});

describe('URL building', () => {
  beforeEach(() => fetchMock.mockResolvedValue(res({})));

  it('encodes the currency query param', async () => {
    await fetchIVSurface('ETH');
    expect(fetchMock).toHaveBeenCalledWith('/api/iv/surface?currency=ETH');
  });

  it('appends the expiry only when provided', async () => {
    await fetchOIByStrike('BTC');
    expect(fetchMock).toHaveBeenCalledWith('/api/oi/strike?currency=BTC');

    await fetchOIByStrike('BTC', '2026-07-31T08:00:00Z');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/oi/strike?currency=BTC&expiry=2026-07-31T08%3A00%3A00Z',
    );
  });

  it('builds the COT report/index query strings, including defaults', async () => {
    await fetchCotReport();
    expect(fetchMock).toHaveBeenCalledWith('/api/cot/report?currency=BTC&window=52&method=rank');

    await fetchCotIndex('BTC', 156, 'minmax');
    expect(fetchMock).toHaveBeenCalledWith('/api/cot/index?currency=BTC&window=156&method=minmax');
  });
});
