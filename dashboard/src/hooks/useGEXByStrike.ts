import { useQuery } from '@tanstack/react-query';
import { fetchGEXByStrike } from '../api/client';

export function useGEXByStrike(currency = 'BTC') {
  return useQuery({
    queryKey: ['gex-strike', currency],
    queryFn: () => fetchGEXByStrike(currency),
  });
}
