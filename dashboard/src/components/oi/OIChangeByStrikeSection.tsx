import { useOIChangeByStrike } from '../../api/queries';
import { useChartScope, useCurrency } from '../../settings/store';
import { dateLabel, timeLabel } from '../../utils/format';
import { Scopes } from '../controls/Scope';
import { ExpiryScope, FlowWindowScope, StrikeRangeScope } from '../controls/scopes';
import { useExpiry } from '../controls/useExpiry';
import { useStrikeWindowed } from '../controls/useStrikeWindow';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import OIChangeByStrikeChart from './OIChangeByStrikeChart';

const CHART = 'oiChangeByStrike';

export default function OIChangeByStrikeSection() {
  const currency = useCurrency();
  const { scope } = useChartScope(CHART);

  const query = useOIChangeByStrike(currency, scope.flowWindow);
  const selected = useExpiry(CHART, query.data?.expiries ?? [], { allowAll: true });
  const sliced = useOIChangeByStrike(currency, scope.flowWindow, selected || null);
  const spot = sliced.data?.spot ?? null;
  const { windowed, count } = useStrikeWindowed(CHART, sliced.data, spot);
  const state = panelState(sliced, windowed, count, MIN_POINTS.bars);

  return (
    <Panel
      title="OPEN INTEREST CHANGE"
      subtitle="ΔCONTRACTS · CALLS/PUTS × STRIKE"
      state={state}
      controls={
        <Scopes>
          <ExpiryScope chartId={CHART} expiries={query.data?.expiries ?? []} allowAll />
          <FlowWindowScope chartId={CHART} />
          <StrikeRangeScope chartId={CHART} />
        </Scopes>
      }
      footer={(data) =>
        data.baseline_as_of != null && (
          <div className="oi-stats">
            <div className="oi-stat">
              <span className="oi-stat__label">Δ SINCE</span>
              <span className="oi-stat__value">
                {dateLabel(data.baseline_as_of)} {timeLabel(data.baseline_as_of)}
                {data.baseline_stale && ' · STALE'}
              </span>
            </div>
          </div>
        )
      }
    >
      {(data) => <OIChangeByStrikeChart data={data} spot={spot} />}
    </Panel>
  );
}
