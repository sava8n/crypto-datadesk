import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchCotIndex, type CotMethod, type CotWindow } from '../api/client';

export function useCotIndex(window: CotWindow, method: CotMethod) {
  return useQuery({
    queryKey: ['cot-index', window, method],
    queryFn: () => fetchCotIndex(window, method),
    // keep the chart populated while switching window
    placeholderData: keepPreviousData,
  });
}
