import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useRefreshMs } from '../settings/store';
import type {
  ArchiveWindow,
  ExposureConvention,
  ExposureGreek,
  RecentWindow,
  Resolution,
} from '../types';
import * as client from './client';
import type { EndpointName } from './endpoints';

// one fixed window for the percentile band overlays; a per-panel control would couple
// the bands to a lookback the underlying live charts do not have
export const BAND_WINDOW: ArchiveWindow = '90d';

/**
 * Poll options shared by every resource.
 *
 * `staleTime` tracks the interval so a tab opened after the last tick refetches on mount
 * rather than showing a snapshot several periods old. `refetchIntervalInBackground` is left
 * at its default, so a backgrounded window stops polling; focus-refetch is what catches it up,
 * and it cannot fire spuriously because it only refetches what is already stale.
 */
function polling(interval: number) {
  return { refetchInterval: interval, staleTime: interval, refetchOnWindowFocus: true } as const;
}

// One hook per single-argument endpoint. The query key starts with the endpoint name,
// so a route and its cache entry are named by the same string.
function resourceHook<T>(name: EndpointName, fetch: (currency: string) => Promise<T>) {
  return (currency: string) =>
    useQuery({
      queryKey: [name, currency],
      queryFn: () => fetch(currency),
      ...polling(useRefreshMs()),
    });
}

export const useIVCurves = resourceHook('ivCurves', client.fetchIVCurves);
export const useTermStructure = resourceHook('termStructure', client.fetchTermStructure);
export const useSkew = resourceHook('skew', client.fetchSkew);
export const useProbCurves = resourceHook('probCurves', client.fetchProbCurves);
export const useOIByExpiry = resourceHook('oiByExpiry', client.fetchOIByExpiry);
export const useVolumeByStrike = resourceHook('volumeByStrike', client.fetchVolumeByStrike);
export const useStats = resourceHook('stats', client.fetchStats);
export const useSpotHistory = resourceHook('spotHistory', client.fetchSpotHistory);

export function useOIByStrike(
  currency: string,
  expiry?: string | null,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['oiByStrike', currency, expiry ?? 'all'],
    queryFn: () => client.fetchOIByStrike(currency, expiry ?? undefined),
    enabled: opts?.enabled ?? true,
    // keep the dropdown + chart populated while switching expiry
    placeholderData: keepPreviousData,
    ...polling(useRefreshMs()),
  });
}

export const useRVCone = resourceHook('rvCone', client.fetchRVCone);
export const useExpiryOutcomes = resourceHook('expiryOutcomes', client.fetchExpiryOutcomes);

export function useFlowByStrike(currency: string, window: RecentWindow) {
  return useQuery({
    queryKey: ['flowByStrike', currency, window],
    queryFn: () => client.fetchFlowByStrike(currency, window),
    placeholderData: keepPreviousData,
    ...polling(useRefreshMs()),
  });
}

export function useFlowByExpiry(currency: string, window: RecentWindow) {
  return useQuery({
    queryKey: ['flowByExpiry', currency, window],
    queryFn: () => client.fetchFlowByExpiry(currency, window),
    placeholderData: keepPreviousData,
    ...polling(useRefreshMs()),
  });
}

export function useTape(currency: string, minPremium: number) {
  return useQuery({
    queryKey: ['flowTape', currency, minPremium],
    queryFn: () => client.fetchTape(currency, minPremium),
    placeholderData: keepPreviousData,
    ...polling(useRefreshMs()),
  });
}
export const useMaxPain = resourceHook('maxPain', client.fetchMaxPain);

export function useExposureByStrike(
  currency: string,
  greek: ExposureGreek,
  convention: ExposureConvention = 'assumption',
) {
  return useQuery({
    queryKey: ['exposureByStrike', currency, greek, convention],
    queryFn: () => client.fetchExposureByStrike(currency, greek, convention),
    // keep the chart populated while switching greek or convention
    placeholderData: keepPreviousData,
    ...polling(useRefreshMs()),
  });
}

export function useSmileHistory(currency: string, expiry: string | null, window: RecentWindow) {
  return useQuery({
    queryKey: ['smileHistory', currency, expiry, window],
    queryFn: () => client.fetchSmileHistory(currency, expiry as string, window),
    enabled: expiry != null,
    placeholderData: keepPreviousData,
    ...polling(useRefreshMs()),
  });
}

export function useCMBands(currency: string) {
  return useQuery({
    queryKey: ['cmBands', currency],
    queryFn: () => client.fetchCMBands(currency, BAND_WINDOW),
    ...polling(useRefreshMs()),
  });
}

export function useOIChangeByStrike(
  currency: string,
  window: RecentWindow,
  expiry?: string | null,
) {
  return useQuery({
    queryKey: ['oiChangeByStrike', currency, window, expiry ?? 'all'],
    queryFn: () => client.fetchOIChangeByStrike(currency, window, expiry ?? undefined),
    // keep the chart populated while switching window or expiry
    placeholderData: keepPreviousData,
    ...polling(useRefreshMs()),
  });
}

export function useVolHistory(currency: string, window: ArchiveWindow, resolution: Resolution) {
  return useQuery({
    queryKey: ['historyVol', currency, window, resolution],
    queryFn: () => client.fetchVolHistory(currency, window, resolution),
    placeholderData: keepPreviousData,
    ...polling(useRefreshMs()),
  });
}

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: client.fetchReports,
    ...polling(useRefreshMs()),
  });
}

export function useReport(id: number | null) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => client.fetchReport(id as number),
    enabled: id != null,
    // a stored report never changes
    staleTime: Infinity,
  });
}

export function usePositioningHistory(
  currency: string,
  window: ArchiveWindow,
  resolution: Resolution,
) {
  return useQuery({
    queryKey: ['historyPositioning', currency, window, resolution],
    queryFn: () => client.fetchPositioningHistory(currency, window, resolution),
    placeholderData: keepPreviousData,
    ...polling(useRefreshMs()),
  });
}
