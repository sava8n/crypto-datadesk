import { useMemo } from 'react';

import { useIVCurves, useSmileHistory } from '../../api/queries';
import { useCurrency, useSettings } from '../../settings/store';
import type { RecentWindow } from '../../types';
import { expiriesOf } from '../../utils/expiry';
import { useExpiry } from '../controls/useExpiry';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import SmileCompareChart, { type SmileCompareData } from './SmileCompareChart';

const WINDOW_LABELS: Record<RecentWindow, string> = { '24h': '24H AGO', '7d': '7D AGO' };

export default function SmileCompareSection() {
  const currency = useCurrency();
  const { flowWindow } = useSettings();

  const curves = useIVCurves(currency);
  const expiries = useMemo(() => expiriesOf(curves.data?.points), [curves.data]);
  const selected = useExpiry(expiries);
  const history = useSmileHistory(currency, selected, flowWindow);

  const value: SmileCompareData | undefined = useMemo(() => {
    if (!curves.data) return undefined;
    // no expiry only happens on an empty chain; fall through so the sparse state shows
    return {
      current: selected ? curves.data.points.filter((p) => p.expiry === selected) : [],
      previous: history.data?.points ?? [],
      previousLabel: history.data?.baseline_stale
        ? `${WINDOW_LABELS[flowWindow]} · STALE`
        : WINDOW_LABELS[flowWindow],
    };
  }, [curves.data, history.data, selected, flowWindow]);
  const state = panelState(curves, value, value?.current.length ?? 0, MIN_POINTS.line);

  return (
    <Panel title="SMILE COMPARE" subtitle="STRIKE × IV · NOW VS ARCHIVED" state={state}>
      {(data) => <SmileCompareChart data={data} />}
    </Panel>
  );
}
