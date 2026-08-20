import { useMemo } from 'react';

import { useIVCurves, useSmileHistory } from '../../api/queries';
import { useChartScope, useCurrency } from '../../settings/store';
import type { RecentWindow } from '../../types';
import { expiriesOf } from '../../utils/expiry';
import { Scopes } from '../controls/Scope';
import { ExpiryScope, FlowWindowScope } from '../controls/scopes';
import { useExpiry } from '../controls/useExpiry';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import SmileCompareChart, { type SmileCompareData } from './SmileCompareChart';

const CHART = 'smileCompare';

const WINDOW_LABELS: Record<RecentWindow, string> = { '24h': '24H AGO', '7d': '7D AGO' };

export default function SmileCompareSection() {
  const currency = useCurrency();
  const { scope } = useChartScope(CHART);

  const curves = useIVCurves(currency);
  const expiries = useMemo(() => expiriesOf(curves.data?.points), [curves.data]);
  const selected = useExpiry(CHART, expiries);
  const history = useSmileHistory(currency, selected, scope.flowWindow);

  const value: SmileCompareData | undefined = useMemo(() => {
    if (!curves.data) return undefined;
    // no expiry only happens on an empty chain; fall through so the sparse state shows
    return {
      current: selected ? curves.data.points.filter((p) => p.expiry === selected) : [],
      previous: history.data?.points ?? [],
      previousLabel: history.data?.baseline_stale
        ? `${WINDOW_LABELS[scope.flowWindow]} · STALE`
        : WINDOW_LABELS[scope.flowWindow],
    };
  }, [curves.data, history.data, selected, scope.flowWindow]);
  const state = panelState(curves, value, value?.current.length ?? 0, MIN_POINTS.line);

  return (
    <Panel
      title="SMILE COMPARE"
      subtitle="STRIKE × IV · NOW VS ARCHIVED"
      state={state}
      controls={
        <Scopes>
          <ExpiryScope chartId={CHART} expiries={expiries} />
          <FlowWindowScope chartId={CHART} />
        </Scopes>
      }
    >
      {(data) => <SmileCompareChart data={data} />}
    </Panel>
  );
}
