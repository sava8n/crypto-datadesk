import type {
  GEXByStrikeResponse,
  GreeksChainResponse,
  IVCurvesResponse,
  IVSurfaceResponse,
  OIByExpirationResponse,
  OIByStrikeResponse,
  OIChangeResponse,
  OIChangeWindow,
  PositioningHistoryResponse,
  ProbCurvesResponse,
  Resolution,
  RVConeResponse,
  SkewResponse,
  SpotHistoryResponse,
  StatsResponse,
  TermStructureResponse,
  VolHistoryResponse,
  VolumeByStrikeResponse,
} from '../types';
import { ENDPOINTS, type EndpointName } from './endpoints';

export type GreekName = 'delta' | 'gamma' | 'theta' | 'vega';

function url(name: EndpointName, params: Record<string, string>): string {
  return `/api/${ENDPOINTS[name]}?${new URLSearchParams(params).toString()}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) {
    // FastAPI puts the reason in `detail`
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

export const fetchIVSurface = (currency: string): Promise<IVSurfaceResponse> =>
  fetchJson(url('ivSurface', { currency }));

export const fetchIVCurves = (currency: string): Promise<IVCurvesResponse> =>
  fetchJson(url('ivCurves', { currency }));

export const fetchTermStructure = (currency: string): Promise<TermStructureResponse> =>
  fetchJson(url('termStructure', { currency }));

export const fetchSkew = (currency: string): Promise<SkewResponse> =>
  fetchJson(url('skew', { currency }));

export const fetchProbCurves = (currency: string): Promise<ProbCurvesResponse> =>
  fetchJson(url('probCurves', { currency }));

export const fetchGreeksChain = (currency: string): Promise<GreeksChainResponse> =>
  fetchJson(url('greeksChain', { currency }));

export const fetchGEXByStrike = (currency: string): Promise<GEXByStrikeResponse> =>
  fetchJson(url('gexByStrike', { currency }));

export const fetchOIByExpiration = (currency: string): Promise<OIByExpirationResponse> =>
  fetchJson(url('oiByExpiration', { currency }));

export const fetchOIByStrike = (
  currency: string,
  expiry?: string,
): Promise<OIByStrikeResponse> =>
  fetchJson(url('oiByStrike', expiry ? { currency, expiry } : { currency }));

export const fetchVolumeByStrike = (currency: string): Promise<VolumeByStrikeResponse> =>
  fetchJson(url('volumeByStrike', { currency }));

export const fetchOIChange = (
  currency: string,
  window: OIChangeWindow,
  expiry?: string,
): Promise<OIChangeResponse> =>
  fetchJson(url('oiChange', expiry ? { currency, window, expiry } : { currency, window }));

export const fetchRVCone = (currency: string): Promise<RVConeResponse> =>
  fetchJson(url('rvCone', { currency }));

export const fetchVolHistory = (
  currency: string,
  lookbackDays: number,
  resolution: Resolution,
): Promise<VolHistoryResponse> =>
  fetchJson(url('historyVol', { currency, lookback_days: String(lookbackDays), resolution }));

export const fetchPositioningHistory = (
  currency: string,
  lookbackDays: number,
  resolution: Resolution,
): Promise<PositioningHistoryResponse> =>
  fetchJson(
    url('historyPositioning', { currency, lookback_days: String(lookbackDays), resolution }),
  );

export const fetchStats = (currency: string): Promise<StatsResponse> =>
  fetchJson(url('stats', { currency }));

export const fetchSpotHistory = (currency: string): Promise<SpotHistoryResponse> =>
  fetchJson(url('spotHistory', { currency }));
