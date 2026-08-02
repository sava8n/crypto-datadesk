import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useRefreshMs } from '../settings/store';
import type { ExposureGreek, OIChangeWindow, Resolution } from '../types';
import * as client from './client';
import type { EndpointName } from './endpoints';

// one fixed window for the percentile band overlays; a per-panel control would couple
// the bands to a lookback the underlying live charts do not have
export const BAND_LOOKBACK_DAYS = 90;

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

export const useIVSurface = resourceHook('ivSurface', client.fetchIVSurface);
export const useIVCurves = resourceHook('ivCurves', client.fetchIVCurves);
export const useTermStructure = resourceHook('termStructure', client.fetchTermStructure);
export const useSkew = resourceHook('skew', client.fetchSkew);
export const useProbCurves = resourceHook('probCurves', client.fetchProbCurves);
export const useGreeksChain = resourceHook('greeksChain', client.fetchGreeksChain);
export const useGEXByStrike = resourceHook('gexByStrike', client.fetchGEXByStrike);
export const useOIByExpiration = resourceHook('oiByExpiration', client.fetchOIByExpiration);
export const useVolumeByStrike = resourceHook('volumeByStrike', client.fetchVolumeByStrike);
export const useStats = resourceHook('stats', client.fetchStats);
export const useSpotHistory = resourceHook('spotHistory', client.fetchSpotHistory);

export function useOIByStrike(currency: string, expiry?: string | null) {
  return useQuery({
    queryKey: ['oiByStrike', currency, expiry ?? 'all'],
    queryFn: () => client.fetchOIByStrike(currency, expiry ?? undefined),
    // keep the dropdown + chart populated while switching expiry
    placeholderData: keepPreviousData,
    ...polling(useRefreshMs()),
  });
}

export const useRVCone = resourceHook('rvCone', client.fetchRVCone);
export const useMaxPain = resourceHook('maxPain', client.fetchMaxPain);

export function useExposure(currency: string, greek: ExposureGreek) {
  return useQuery({
    queryKey: ['exposure', currency, greek],
    queryFn: () => client.fetchExposure(currency, greek),
    // keep the chart populated while switching greek
    placeholderData: keepPreviousData,
    ...polling(useRefreshMs()),
  });
}

export function useSmileHistory(
  currency: string,
  expiry: string | null,
  window: OIChangeWindow,
) {
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
    queryFn: () => client.fetchCMBands(currency, BAND_LOOKBACK_DAYS),
    ...polling(useRefreshMs()),
  });
}

export function useOIChange(currency: string, window: OIChangeWindow, expiry?: string | null) {
  return useQuery({
    queryKey: ['oiChange', currency, window, expiry ?? 'all'],
    queryFn: () => client.fetchOIChange(currency, window, expiry ?? undefined),
    // keep the chart populated while switching window or expiry
    placeholderData: keepPreviousData,
    ...polling(useRefreshMs()),
  });
}

// resolution follows the lookback (see useLookback), so it is not part of the key
export function useVolHistory(currency: string, days: number, resolution: Resolution) {
  return useQuery({
    queryKey: ['historyVol', currency, days],
    queryFn: () => client.fetchVolHistory(currency, days, resolution),
    placeholderData: keepPreviousData,
    ...polling(useRefreshMs()),
  });
}

export function usePositioningHistory(currency: string, days: number, resolution: Resolution) {
  return useQuery({
    queryKey: ['historyPositioning', currency, days],
    queryFn: () => client.fetchPositioningHistory(currency, days, resolution),
    placeholderData: keepPreviousData,
    ...polling(useRefreshMs()),
  });
}
