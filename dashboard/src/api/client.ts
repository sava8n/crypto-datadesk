import type {
  GreeksResponse,
  IVCurvesResponse,
  IVSurfaceResponse,
  SummaryResponse,
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

export async function fetchGreek(greek: GreekName, currency = 'BTC'): Promise<GreeksResponse> {
  return fetchJson<GreeksResponse>(
    `/api/greeks/${greek}?currency=${encodeURIComponent(currency)}`,
  );
}

export async function fetchSummary(currency = 'BTC'): Promise<SummaryResponse> {
  return fetchJson<SummaryResponse>(`/api/summary?currency=${encodeURIComponent(currency)}`);
}
