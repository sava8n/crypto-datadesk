import { useQuery } from '@tanstack/react-query';
import { fetchSkew } from '../api/client';

export function useSkew(currency = 'BTC') {
  return useQuery({
    queryKey: ['iv-skew', currency],
    queryFn: () => fetchSkew(currency),
  });
}
