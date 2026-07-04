import { useQuery } from '@tanstack/react-query';
import { fetchTermStructure } from '../api/client';

export function useTermStructure(currency = 'BTC') {
  return useQuery({
    queryKey: ['term-structure', currency],
    queryFn: () => fetchTermStructure(currency),
  });
}
