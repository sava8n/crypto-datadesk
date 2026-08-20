import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { axisLabelStyle, colors } from '../../theme/charts';
import { axisTooltip, categoryAxisX, grid, legendBar, valueAxisY } from '../../theme/options';
import type { ExposureByStrikeResponse, ExposureGreek } from '../../types';
import { strikeFmt, usdFull, usdShort } from '../../utils/format';
import EChart from '../chart/EChart';
import { nearestIdx } from './nearest';

// dollars per 1% move in the forward (gamma), per vol point (vanna), per day (charm)
const AXIS_NAMES: Record<ExposureGreek, string> = {
  gamma: 'GEX / 1%',
  vanna: 'VEX / VOL PT',
  charm: 'CEX / DAY',
};

export function buildExposureByStrikeOption(data: ExposureByStrikeResponse): EChartsOption {
  const rows = [...data.points].sort((a, b) => a.strike - b.strike);
  const strikes = rows.map((p) => p.strike);

  // gamma only; the other greeks report no zero-crossing
  const flip = data.gex_flip;
  const flipIdx = flip != null ? nearestIdx(strikes, flip) : -1;
  const hasFlip = flip != null && flipIdx >= 0;

  return {
    backgroundColor: 'transparent',
    legend: legendBar(['Call', 'Put', 'Net']),
    tooltip: axisTooltip({ shadow: true, value: usdShort }),
    grid: grid('barsWide'),
    xAxis: categoryAxisX(strikes.map(strikeFmt)),
    yAxis: valueAxisY({ name: AXIS_NAMES[data.greek], format: usdShort }),
    series: [
      {
        type: 'bar',
        name: 'Call',
        stack: 'exposure',
        barMaxWidth: 22,
        data: rows.map((p) => p.call_exposure),
        itemStyle: { color: colors.call },
        emphasis: { focus: 'series' },
      },
      {
        type: 'bar',
        name: 'Put',
        stack: 'exposure',
        barMaxWidth: 22,
        data: rows.map((p) => p.put_exposure),
        itemStyle: { color: colors.put },
        emphasis: { focus: 'series' },
      },
      {
        type: 'line',
        name: 'Net',
        data: rows.map((p) => p.net_exposure),
        showSymbol: false,
        smooth: true,
        itemStyle: { color: colors.text },
        lineStyle: { color: colors.text, width: 1.5 },
        emphasis: { focus: 'series' },
        markLine: {
          symbol: 'none',
          silent: true,
          data: hasFlip
            ? [
                {
                  xAxis: flipIdx,
                  lineStyle: { color: colors.levelKey, type: 'dashed', width: 1 },
                  label: {
                    ...axisLabelStyle(),
                    color: colors.levelKey,
                    formatter: `Flip ${usdFull(flip)}`,
                  },
                },
              ]
            : [],
        },
      },
    ],
  };
}

export default function ExposureByStrikeChart({ data }: { data: ExposureByStrikeResponse }) {
  return <EChart option={useMemo(() => buildExposureByStrikeOption(data), [data])} />;
}
