import { useMemo, useState } from 'react';

import { useIVCurves, useSmileHistory } from '../../api/queries';
import type { IVCurvePoint, OIChangeWindow } from '../../types';
import ExpirySelect from '../controls/ExpirySelect';
import WindowSelect from '../controls/WindowSelect';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useExpiryPicker } from '../controls/useExpiryPicker';
import SmileCompareChart, { type SmileCompareData } from './SmileCompareChart';

// this response carries no expiry list of its own, so derive one, near-dated first
function expiriesOf(points: IVCurvePoint[] | undefined): string[] {
  if (!points) return [];
  const tte = new Map<string, number>();
  for (const p of points) if (!tte.has(p.expiry)) tte.set(p.expiry, p.tte_years);
  return [...tte.keys()].sort((a, b) => (tte.get(a) ?? 0) - (tte.get(b) ?? 0));
}

const WINDOW_LABELS: Record<OIChangeWindow, string> = { '24h': '24H AGO', '7d': '7D AGO' };

export default function SmileCompareSection() {
  const currency = useCurrency();
  const [window, setWindow] = useState<OIChangeWindow>('24h');

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
      previousLabel: WINDOW_LABELS[window],
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
