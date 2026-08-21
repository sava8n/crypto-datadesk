import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';

import { useChartOption } from './useChartOption';

// merge keeps legend state across updates; these four vary in count between builds, so they
// are replaced or vanished ones would linger
const REPLACE = ['series', 'xAxis', 'yAxis', 'grid'];

export default function EChart({ option }: { option: EChartsOption }) {
  const { option: shown, hold, release } = useChartOption(option);

  return (
    // the wrapper must carry a height of its own: outside a panel body nothing else gives it one
    <div style={{ width: '100%', height: '100%' }} onPointerEnter={hold} onPointerLeave={release}>
      <ReactECharts
        option={shown}
        replaceMerge={REPLACE}
        lazyUpdate
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
