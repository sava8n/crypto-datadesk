import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { axisLabelStyle, colors } from '../../theme/charts';
import {
  axisTooltip,
  categoryAxisX,
  grid,
  legendBar,
  markLine,
  spotMark,
  valueAxisY,
} from '../../theme/options';
import type { ExposureByStrikeResponse, ExposureGreek } from '../../types';
import { strikeFmt, usdFull, usdShort } from '../../utils/format';
import { levelIdx } from '../../utils/strikes';
import EChart from '../chart/EChart';

// dollars per 1% move in the forward (gamma), per vol point (vanna), per day (charm)
const AXIS_NAMES: Record<ExposureGreek, string> = {
  gamma: 'GEX / 1%',
  vanna: 'VEX / VOL PT',
  charm: 'CEX / DAY',
};

export function buildExposureByStrikeOption(
  data: ExposureByStrikeResponse,
  spot: number | null = null,
): EChartsOption {
  const rows = [...data.points].sort((a, b) => a.strike - b.strike);
  const strikes = rows.map((p) => p.strike);

  // gamma only; the other greeks report no zero-crossing
  const flip = data.gex_flip;
  const flipIdx = levelIdx(strikes, flip);
  const spotAt = levelIdx(strikes, spot);

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
        markLine: markLine([
          ...(flip != null && flipIdx >= 0
            ? [
                {
                  xAxis: flipIdx,
                  lineStyle: { color: colors.levelKey, type: 'dashed' as const, width: 1 },
                  label: {
                    ...axisLabelStyle(),
                    color: colors.levelKey,
                    formatter: `Flip ${usdFull(flip)}`,
                  },
                },
              ]
            : []),
          ...(spotAt >= 0 ? [spotMark(spotAt)] : []),
        ]),
      },
    ],
  };
}

export default function ExposureByStrikeChart({
  data,
  spot,
}: {
  data: ExposureByStrikeResponse;
  spot: number | null;
}) {
  return <EChart option={useMemo(() => buildExposureByStrikeOption(data, spot), [data, spot])} />;
}
