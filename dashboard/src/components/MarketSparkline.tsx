import type { EChartsOption } from 'echarts';

import { C } from '../theme/charts';
import type { SpotCandle } from '../types';
import EChart from './chart/EChart';

// candles are daily, so this is the trailing window in days
const SPARK_DAYS = 90;

/** Closing price only, no axes and no tooltip - it is a shape, not a chart. */
export default function MarketSparkline({ candles }: { candles: SpotCandle[] }) {
  const shown = candles.slice(-SPARK_DAYS);

  // deliberately neutral: the shape reads as context, and the move percent beside it
  // is the only thing carrying direction
  const option: EChartsOption = {
    backgroundColor: 'transparent',
    grid: { left: 0, right: 0, top: 4, bottom: 2 },
    xAxis: { type: 'category', show: false, data: shown.map((c) => c.ts) },
    yAxis: { type: 'value', show: false, scale: true },
    series: [
      {
        type: 'line',
        data: shown.map((c) => c.close),
        symbol: 'none',
        lineStyle: { color: C.text, width: 1.5 },
        areaStyle: { color: C.sparkFill },
      },
    ],
  };

  return (
    <div className="strip__spark">
      <EChart option={option} />
    </div>
  );
}
