import type { IVCurvesResponse, IVSurfaceResponse } from '../types';

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
