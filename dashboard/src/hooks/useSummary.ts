import { useQuery } from '@tanstack/react-query';
import { fetchSummary } from '../api/client';

export function useSummary(currency = 'BTC') {
  return useQuery({
    queryKey: ['summary', currency],
    queryFn: () => fetchSummary(currency),
  });
}
