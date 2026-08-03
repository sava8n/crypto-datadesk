import { useTape } from '../../api/queries';
import type { TapePrint } from '../../types';
import { useSeeded } from '../controls/useSeeded';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency, useSettings } from '../../settings/store';
import { countFull, pctOne, timeLabel, usdShort } from '../../utils/format';
import PremiumSelect from '../controls/PremiumSelect';
import { instrumentLabel, tags } from './tape';

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
  const [minPremium, setMinPremium] = useSeeded(useSettings().tapeMinPremium);
  const query = useTape(useCurrency(), minPremium);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="TAPE"
      subtitle="LATEST PRINTS · NEWEST FIRST"
      state={state}
      controls={<PremiumSelect minPremium={minPremium} onSelect={setMinPremium} />}
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
