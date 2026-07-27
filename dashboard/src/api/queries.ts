import { keepPreviousData, useQuery } from '@tanstack/react-query';

import * as client from './client';
import type { EndpointName } from './endpoints';

// One hook per single-argument endpoint. The query key starts with the endpoint name,
// so a route and its cache entry are named by the same string.
function resourceHook<T>(name: EndpointName, fetch: (currency: string) => Promise<T>) {
  return (currency: string) =>
    useQuery({ queryKey: [name, currency], queryFn: () => fetch(currency) });
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
  });
}
