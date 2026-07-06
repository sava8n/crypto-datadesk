import { useQuery } from '@tanstack/react-query';
import { fetchStats } from '../api/client';

export function useStats(currency = 'BTC') {
  return useQuery({
    queryKey: ['stats', currency],
    queryFn: () => fetchStats(currency),
  });
}
