import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';

import { useChartOption } from './useChartOption';

// Merging keeps legend toggles and the legend page across an update. These four vary in
// count between builds, so they are replaced or the ones that vanish would linger.
const REPLACE = ['series', 'xAxis', 'yAxis', 'grid'];

export default function EChart({ option }: { option: EChartsOption }) {
  const { option: shown, hold, release } = useChartOption(option);

  return (
    <div onPointerEnter={hold} onPointerLeave={release}>
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
