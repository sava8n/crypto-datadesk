import { useRVCone, useTermStructure } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import RVConeChart, { type RVConeChartData } from './RVConeChart';

export default function RVConeSection() {
  const currency = useCurrency();
  const cone = useRVCone(currency);
  const term = useTermStructure(currency);

  const value: RVConeChartData | undefined = cone.data
    ? { cone: cone.data, implied: term.data?.points ?? [] }
    : undefined;
  const state = panelState(cone, value, cone.data?.points.length ?? 0, MIN_POINTS.line);

  return (
    <Panel title="REALIZED VOL CONE" subtitle="RV PERCENTILES × WINDOW · IV OVERLAY" state={state}>
      {(data) => <RVConeChart data={data} />}
    </Panel>
  );
}
