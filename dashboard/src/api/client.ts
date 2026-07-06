import type {
  GEXByStrikeResponse,
  GreeksChainResponse,
  IVCurvesResponse,
  IVSurfaceResponse,
  OIByExpirationResponse,
  OIByStrikeResponse,
  SpotHistoryResponse,
  SpotResponse,
  TermStructureResponse,
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

export async function fetchSpot(currency = 'BTC'): Promise<SpotResponse> {
  return fetchJson<SpotResponse>(`/api/spot?currency=${encodeURIComponent(currency)}`);
}

export async function fetchSpotHistory(currency = 'BTC'): Promise<SpotHistoryResponse> {
  return fetchJson<SpotHistoryResponse>(
    `/api/spot/history?currency=${encodeURIComponent(currency)}`,
  );
}
