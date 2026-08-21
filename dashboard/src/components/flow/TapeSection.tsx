import { useTape } from '../../api/queries';
import { useChartScope, useCurrency } from '../../settings/store';
import type { TapePrint } from '../../types';
import { countFull, pctOne, timeLabel, usdShort } from '../../utils/format';
import { Scopes } from '../controls/Scope';
import { PremiumScope } from '../controls/scopes';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import { instrumentLabel, tags } from './tape';

const CHART = 'tape';

function Row({ print }: { print: TapePrint }) {
  return (
    <tr>
      <td>{timeLabel(print.ts)}</td>
      <td>{instrumentLabel(print)}</td>
      <td className={`tape-side--${print.direction}`}>{print.direction.toUpperCase()}</td>
      <td>{countFull(print.amount)}</td>
      <td>{print.premium != null ? usdShort(print.premium) : '-'}</td>
      <td>{print.iv != null ? `${pctOne(print.iv)}%` : '-'}</td>
      <td>{tags(print)}</td>
    </tr>
  );
}

export default function TapeSection() {
  const { scope } = useChartScope(CHART);
  const query = useTape(useCurrency(), scope.tapeMinPremium);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="TAPE"
      subtitle="LATEST PRINTS · NEWEST FIRST"
      state={state}
      controls={
        <Scopes>
          <PremiumScope chartId={CHART} />
        </Scopes>
      }
    >
      {(data) => (
        <div className="exp-table">
          <table>
            <thead>
              <tr>
                <th>TIME</th>
                <th>INSTRUMENT</th>
                <th>SIDE</th>
                <th>QTY</th>
                <th>PREM</th>
                <th>IV</th>
                <th>TAGS</th>
              </tr>
            </thead>
            <tbody>
              {data.points.map((print) => (
                <Row key={print.trade_id} print={print} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
