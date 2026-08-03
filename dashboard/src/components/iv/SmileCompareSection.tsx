import { useMemo, useState } from 'react';

import { useIVCurves, useSmileHistory } from '../../api/queries';
import type { RecentWindow } from '../../types';
import ExpirySelect from '../controls/ExpirySelect';
import WindowSelect from '../controls/WindowSelect';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useExpiryPicker } from '../controls/useExpiryPicker';
import { expiriesOf } from '../../utils/expiry';
import SmileCompareChart, { type SmileCompareData } from './SmileCompareChart';

const WINDOW_LABELS: Record<RecentWindow, string> = { '24h': '24H AGO', '7d': '7D AGO' };

export default function SmileCompareSection() {
  const currency = useCurrency();
  const [window, setWindow] = useState<RecentWindow>('24h');

  const curves = useIVCurves(currency);
  const expiries = useMemo(() => expiriesOf(curves.data?.points), [curves.data]);
  const { selected, select } = useExpiryPicker(expiries);
  const history = useSmileHistory(currency, selected, window);

  const value: SmileCompareData | undefined = useMemo(() => {
    if (!curves.data) return undefined;
    // no expiry only happens on an empty chain; fall through so the sparse state shows
    return {
      current: selected ? curves.data.points.filter((p) => p.expiry === selected) : [],
      previous: history.data?.points ?? [],
      previousLabel: history.data?.baseline_stale
        ? `${WINDOW_LABELS[window]} · STALE`
        : WINDOW_LABELS[window],
    };
  }, [curves.data, history.data, selected, window]);
  const state = panelState(curves, value, value?.current.length ?? 0, MIN_POINTS.line);

  return (
    <Panel
      title="SMILE COMPARE"
      subtitle="STRIKE × IV · NOW VS ARCHIVED"
      state={state}
      controls={
        <>
          <WindowSelect window={window} onSelect={setWindow} />
          <ExpirySelect expiries={expiries} selected={selected} onSelect={select} />
        </>
      }
    >
      {(data) => <SmileCompareChart data={data} />}
    </Panel>
  );
}
