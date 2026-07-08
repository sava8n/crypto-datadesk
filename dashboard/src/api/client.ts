import type {
  CotHistoryResponse,
  CotIndexResponse,
  CotReportResponse,
  GEXByStrikeResponse,
  GreeksChainResponse,
  IVCurvesResponse,
  IVSurfaceResponse,
  OIByExpirationResponse,
  OIByStrikeResponse,
  SkewResponse,
  SpotHistoryResponse,
  StatsResponse,
  TermStructureResponse,
  VolumeByStrikeResponse,
} from '../types';

export type GreekName = 'delta' | 'gamma' | 'theta' | 'vega';

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const body = await resp.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* response had no JSON body */
    }
    throw new Error(detail);
  }
  return (await resp.json()) as T;
}

export async function fetchIVSurface(currency = 'BTC'): Promise<IVSurfaceResponse> {
  return fetchJson<IVSurfaceResponse>(`/api/iv/surface?currency=${encodeURIComponent(currency)}`);
}

export async function fetchIVCurves(currency = 'BTC'): Promise<IVCurvesResponse> {
  return fetchJson<IVCurvesResponse>(`/api/iv/curves?currency=${encodeURIComponent(currency)}`);
}

export async function fetchTermStructure(currency = 'BTC'): Promise<TermStructureResponse> {
  return fetchJson<TermStructureResponse>(
    `/api/iv/term-structure?currency=${encodeURIComponent(currency)}`,
  );
}

export async function fetchSkew(currency = 'BTC'): Promise<SkewResponse> {
  return fetchJson<SkewResponse>(`/api/iv/skew?currency=${encodeURIComponent(currency)}`);
}

export async function fetchGreeksChain(currency = 'BTC'): Promise<GreeksChainResponse> {
  return fetchJson<GreeksChainResponse>(
    `/api/greeks/chain?currency=${encodeURIComponent(currency)}`,
  );
}

export async function fetchGEXByStrike(currency = 'BTC'): Promise<GEXByStrikeResponse> {
  return fetchJson<GEXByStrikeResponse>(
    `/api/gex/strike?currency=${encodeURIComponent(currency)}`,
  );
}

export async function fetchOIByExpiration(
  currency = 'BTC',
): Promise<OIByExpirationResponse> {
  return fetchJson<OIByExpirationResponse>(
    `/api/oi/expiration?currency=${encodeURIComponent(currency)}`,
  );
}

export async function fetchOIByStrike(
  currency = 'BTC',
  expiry?: string,
): Promise<OIByStrikeResponse> {
  const params = new URLSearchParams({ currency });
  if (expiry) params.set('expiry', expiry);
  return fetchJson<OIByStrikeResponse>(`/api/oi/strike?${params.toString()}`);
}

export async function fetchVolumeByStrike(currency = 'BTC'): Promise<VolumeByStrikeResponse> {
  return fetchJson<VolumeByStrikeResponse>(
    `/api/volume/strike?currency=${encodeURIComponent(currency)}`,
  );
}

export async function fetchStats(currency = 'BTC'): Promise<StatsResponse> {
  return fetchJson<StatsResponse>(`/api/stats?currency=${encodeURIComponent(currency)}`);
}

export async function fetchSpotHistory(currency = 'BTC'): Promise<SpotHistoryResponse> {
  return fetchJson<SpotHistoryResponse>(
    `/api/spot/history?currency=${encodeURIComponent(currency)}`,
  );
}

// COT index window in weeks; 0 = full history
export type CotWindow = 0 | 52 | 156 | 260;
export type CotMethod = 'minmax' | 'rank';

export async function fetchCotReport(
  window: CotWindow = 52,
  method: CotMethod = 'rank',
): Promise<CotReportResponse> {
  return fetchJson<CotReportResponse>(`/api/cot/report?window=${window}&method=${method}`);
}

export async function fetchCotHistory(): Promise<CotHistoryResponse> {
  return fetchJson<CotHistoryResponse>('/api/cot/history');
}

export async function fetchCotIndex(
  window: CotWindow = 52,
  method: CotMethod = 'rank',
): Promise<CotIndexResponse> {
  return fetchJson<CotIndexResponse>(`/api/cot/index?window=${window}&method=${method}`);
}
