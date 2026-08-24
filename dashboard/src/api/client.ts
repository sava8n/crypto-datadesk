import type {
  ArchiveWindow,
  CMBandsResponse,
  ExpiryOutcomesResponse,
  ExposureByStrikeResponse,
  ExposureGreek,
  FlowByExpiryResponse,
  FlowByStrikeResponse,
  IVCurvesResponse,
  MaxPainResponse,
  OIByExpiryResponse,
  OIByStrikeResponse,
  OIChangeByStrikeResponse,
  PositioningHistoryResponse,
  ProbCurvesResponse,
  RecentWindow,
  ReportDetail,
  ReportListResponse,
  Resolution,
  RVConeResponse,
  SkewResponse,
  SmileHistoryResponse,
  SpotHistoryResponse,
  StatsResponse,
  TapeResponse,
  TermStructureResponse,
  VolHistoryResponse,
  VolumeByStrikeResponse,
} from '../types';
import { ENDPOINTS, type EndpointName } from './endpoints';

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

export const fetchIVCurves = (currency: string): Promise<IVCurvesResponse> =>
  fetchJson(url('ivCurves', { currency }));

export const fetchTermStructure = (currency: string): Promise<TermStructureResponse> =>
  fetchJson(url('termStructure', { currency }));

export const fetchSkew = (currency: string): Promise<SkewResponse> =>
  fetchJson(url('skew', { currency }));

export const fetchProbCurves = (currency: string): Promise<ProbCurvesResponse> =>
  fetchJson(url('probCurves', { currency }));

export const fetchOIByExpiry = (currency: string): Promise<OIByExpiryResponse> =>
  fetchJson(url('oiByExpiry', { currency }));

export const fetchOIByStrike = (currency: string, expiry?: string): Promise<OIByStrikeResponse> =>
  fetchJson(url('oiByStrike', expiry ? { currency, expiry } : { currency }));

export const fetchVolumeByStrike = (currency: string): Promise<VolumeByStrikeResponse> =>
  fetchJson(url('volumeByStrike', { currency }));

export const fetchOIChangeByStrike = (
  currency: string,
  window: RecentWindow,
  expiry?: string,
): Promise<OIChangeByStrikeResponse> =>
  fetchJson(url('oiChangeByStrike', expiry ? { currency, window, expiry } : { currency, window }));

export const fetchRVCone = (currency: string): Promise<RVConeResponse> =>
  fetchJson(url('rvCone', { currency }));

export const fetchMaxPain = (currency: string): Promise<MaxPainResponse> =>
  fetchJson(url('maxPain', { currency }));

export const fetchFlowByStrike = (
  currency: string,
  window: RecentWindow,
): Promise<FlowByStrikeResponse> => fetchJson(url('flowByStrike', { currency, window }));

export const fetchFlowByExpiry = (
  currency: string,
  window: RecentWindow,
): Promise<FlowByExpiryResponse> => fetchJson(url('flowByExpiry', { currency, window }));

export const fetchTape = (currency: string, minPremium: number): Promise<TapeResponse> =>
  fetchJson(url('flowTape', { currency, min_premium: String(minPremium) }));

export const fetchExpiryOutcomes = (currency: string): Promise<ExpiryOutcomesResponse> =>
  fetchJson(url('expiryOutcomes', { currency }));

export const fetchExposureByStrike = (
  currency: string,
  greek: ExposureGreek,
): Promise<ExposureByStrikeResponse> => fetchJson(url('exposureByStrike', { currency, greek }));

export const fetchSmileHistory = (
  currency: string,
  expiry: string,
  window: RecentWindow,
): Promise<SmileHistoryResponse> => fetchJson(url('smileHistory', { currency, expiry, window }));

export const fetchCMBands = (currency: string, window: ArchiveWindow): Promise<CMBandsResponse> =>
  fetchJson(url('cmBands', { currency, window }));

export const fetchVolHistory = (
  currency: string,
  window: ArchiveWindow,
  resolution: Resolution,
): Promise<VolHistoryResponse> => fetchJson(url('historyVol', { currency, window, resolution }));

export const fetchPositioningHistory = (
  currency: string,
  window: ArchiveWindow,
  resolution: Resolution,
): Promise<PositioningHistoryResponse> =>
  fetchJson(url('historyPositioning', { currency, window, resolution }));

export const fetchStats = (currency: string): Promise<StatsResponse> =>
  fetchJson(url('stats', { currency }));

export const fetchSpotHistory = (currency: string): Promise<SpotHistoryResponse> =>
  fetchJson(url('spotHistory', { currency }));

export const fetchReports = (): Promise<ReportListResponse> => fetchJson(url('reports', {}));

export const fetchReport = (id: number): Promise<ReportDetail> =>
  fetchJson(`/api/${ENDPOINTS.reports}/${id}`);
