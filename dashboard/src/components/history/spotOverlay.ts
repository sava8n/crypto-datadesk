import type { LineSeriesOption, YAXisComponentOption } from 'echarts';

import { colors } from '../../theme/charts';
import { valueAxisY, values } from '../../theme/options';
import { priceWhole } from '../../utils/format';

export const SPOT_NAME = 'Spot';

// hidden where the right gutter already carries an axis; the tooltip still reads the price
export const spotAxis = ({ show = true } = {}): YAXisComponentOption =>
  show
    ? valueAxisY({
        name: 'SPOT',
        position: 'right',
        scale: true,
        splitLine: false,
        accent: colors.label,
        format: priceWhole,
      })
    : { type: 'value', show: false, scale: true };

export const spotLine = (
  points: { as_of: string; spot: number }[],
  yAxisIndex: number,
): LineSeriesOption => ({
  type: 'line',
  name: SPOT_NAME,
  yAxisIndex,
  showSymbol: false,
  data: points.map((p) => [p.as_of, p.spot]),
  itemStyle: { color: colors.text },
  lineStyle: { width: 1.5, color: colors.text },
  emphasis: { focus: 'series', lineStyle: { width: 3 } },
  tooltip: { valueFormatter: values(priceWhole) },
});
