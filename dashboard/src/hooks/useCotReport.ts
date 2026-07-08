import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchCotReport, type CotMethod, type CotWindow } from '../api/client';

export function useCotReport(window: CotWindow, method: CotMethod) {
  return useQuery({
    queryKey: ['cot-report', window, method],
    queryFn: () => fetchCotReport(window, method),
    // keep the table populated while switching window
    placeholderData: keepPreviousData,
  });
}
