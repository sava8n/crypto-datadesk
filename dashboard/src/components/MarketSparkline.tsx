import type { EChartsOption } from 'echarts';

import { colors } from '../theme/charts';
import type { SpotCandle } from '../types';
import EChart from './chart/EChart';

// trailing days; candles are daily
const SPARK_DAYS = 90;

export default function MarketSparkline({ candles }: { candles: SpotCandle[] }) {
  const shown = candles.slice(-SPARK_DAYS);

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
        lineStyle: { color: colors.text, width: 1.5 },
        areaStyle: { color: colors.sparkFill },
      },
    ],
  };

  return (
    <div className="strip__spark">
      <EChart option={option} />
    </div>
  );
}
