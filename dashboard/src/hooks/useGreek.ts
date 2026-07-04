import { useQuery } from '@tanstack/react-query';
import { fetchGreek, type GreekName } from '../api/client';

export function useGreek(greek: GreekName, currency = 'BTC') {
  return useQuery({
    queryKey: ['greek', greek, currency],
    queryFn: () => fetchGreek(greek, currency),
  });
}
