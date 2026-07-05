import { useQuery } from '@tanstack/react-query';
import { fetchGreeksChain } from '../api/client';

// one request serves the expiry selector and all four greek panels
export function useGreeksChain(currency = 'BTC') {
  return useQuery({
    queryKey: ['greeks-chain', currency],
    queryFn: () => fetchGreeksChain(currency),
  });
}
