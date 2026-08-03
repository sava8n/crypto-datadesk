import { useVolHistory } from '../../api/queries';
import LookbackControl from '../controls/LookbackControl';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useLookback } from '../controls/useLookback';
import VolHistoryChart from './VolHistoryChart';

export default function VolHistorySection() {
  const { window, setWindow, resolution } = useLookback();
  const query = useVolHistory(useCurrency(), window, resolution);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.line);

  return (
    <Panel
      title="VOL HISTORY"
      subtitle="CM ATM IV / RV / DVOL × TIME"
      state={state}
      controls={<LookbackControl window={window} onChange={setWindow} />}
    >
      {(data) => <VolHistoryChart data={data} />}
    </Panel>
  );
}
